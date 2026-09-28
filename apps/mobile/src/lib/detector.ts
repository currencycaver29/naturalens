import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  CONSERVATION_STATUSES,
  type ConservationStatus,
  type Detection,
  type SpeciesInfo,
} from '../types';

/**
 * Species identification via the Gemini API.
 *
 * Cloud rather than on-device: Expo Go can only load the native modules it ships
 * with, so an on-device TFLite runtime would mean giving up the Expo Go workflow.
 */
/**
 * flash-lite over flash: measured ~1.5s vs ~7-18s per photo, with the same answer on
 * test images. Naming an animal doesn't need the bigger model's reasoning.
 */
const MODEL = 'gemini-3.1-flash-lite';

/**
 * Gemini tokenizes images in fixed tiles, so going below this doesn't reduce input
 * tokens or latency — it only costs detail. Measured: 512px bought nothing.
 */
const MAX_WIDTH = 1024;

/**
 * How loudly a failure should be drawn.
 *
 * Separate from the message because they answer different questions. The message is copy
 * and has to stay exactly as written (see `messageForStatus`); the tone is chrome. Being
 * offline is a condition of the world and gets a neutral banner; a rate limit is a "wait"
 * and gets warning; anything we can't recover from gets danger.
 */
export type FailureTone = 'neutral' | 'warning' | 'danger';

/** An identification failure carrying both the sentence to show and how to show it. */
export class DetectorError extends Error {
  readonly tone: FailureTone;

  constructor(message: string, tone: FailureTone = 'danger') {
    super(message);
    this.name = 'DetectorError';
    this.tone = tone;
  }
}

/** Tone for anything thrown out of this module — `danger` for errors from elsewhere. */
export function toneOf(err: unknown): FailureTone {
  return err instanceof DetectorError ? err.tone : 'danger';
}

/**
 * The species half of the answer, shared by both calls below: identifying a photo, and
 * looking a species up by name. Same fields, same wording, one definition.
 *
 * Every field is output tokens, and output tokens are the whole latency cost — the four
 * of them measured at ~230ms on top of a bare label. The length limits are load-bearing,
 * not stylistic.
 */
const SPECIES_PROPERTIES = {
  description: { type: 'string' },
  habitat: { type: 'string' },
  diet: { type: 'string' },
  // Constrained rather than free text, so the badge can switch on it safely.
  conservationStatus: { type: 'string', enum: CONSERVATION_STATUSES },
};

const SPECIES_FIELDS = ['description', 'habitat', 'diet', 'conservationStatus'];

const SPECIES_INSTRUCTION =
  'One or two sentences for description, and a short phrase each for habitat and diet — ' +
  'a few words, not a sentence. Give its IUCN Red List status, or "Data Deficient" if you ' +
  'are unsure.';

const IDENTIFY_PROMPT =
  'Identify the animal in this photo. Give the most specific species name you can ' +
  'reasonably support (for example "red fox" rather than "fox", "brown bear" rather ' +
  'than "bear"), in plain English rather than Latin. Set confidence to how sure you ' +
  `are, from 0 to 1. Then describe the species. ${SPECIES_INSTRUCTION} ` +
  'If there is no animal in the photo, set isAnimal to false and the rest will be ignored.';

const IDENTIFY_SCHEMA = {
  type: 'object',
  properties: {
    isAnimal: { type: 'boolean' },
    label: { type: 'string' },
    confidence: { type: 'number' },
    ...SPECIES_PROPERTIES,
  },
  required: ['isAnimal', 'label', 'confidence', ...SPECIES_FIELDS],
};

const SPECIES_SCHEMA = {
  type: 'object',
  properties: SPECIES_PROPERTIES,
  required: SPECIES_FIELDS,
};

interface SpeciesResult {
  description: string;
  habitat: string;
  diet: string;
  conservationStatus: ConservationStatus;
}

interface IdentifyResult extends SpeciesResult {
  isAnimal: boolean;
  label: string;
  confidence: number;
}

/** Shrinks the capture and returns it base64-encoded for an inline upload. */
async function toBase64Jpeg(photoUri: string): Promise<string> {
  const rendered = await ImageManipulator.manipulate(photoUri)
    .resize({ width: MAX_WIDTH })
    .renderAsync();

  const { base64 } = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.8,
    base64: true,
  });

  if (!base64) throw new Error('Could not encode the photo.');
  return base64;
}

/** The generated text sits on the model_output step. */
function extractText(body: any): string {
  const step = body?.steps?.find((s: any) => s.type === 'model_output');
  const text = step?.content?.find((c: any) => c.type === 'text')?.text;

  if (typeof text !== 'string') {
    throw new Error('Unexpected response from Gemini.');
  }
  return text;
}

/**
 * Turns an API failure into a sentence the user can act on.
 *
 * Whatever we throw here lands verbatim in the error banner via setInitError — the message
 * *is* the UI copy, so it can't be a status code and a slice of someone's JSON.
 *
 * The 400 case is the fiddly one, and worth the check: a bad key returns 400 ("API key not
 * valid"), but so does a request we've malformed ourselves. Mapping every 400 to "bad key"
 * would blame the user's key for our bug.
 */
function messageForStatus(status: number, detail: string): DetectorError {
  if (status === 429) {
    // Free-tier limits are tight enough that this is a routine outcome of tapping the
    // shutter a few times — a "wait", not a fault.
    return new DetectorError(
      'Too many photos too quickly — wait a moment and try again.',
      'warning',
    );
  }
  if (status === 403 || (status === 400 && /api key/i.test(detail))) {
    return new DetectorError('Your Gemini API key was rejected. Check apps/mobile/.env.', 'danger');
  }
  if (status >= 500) {
    return new DetectorError('Gemini is having trouble right now. Try again in a moment.', 'danger');
  }
  return new DetectorError("Couldn't identify that photo. Try again.", 'danger');
}

/** One structured-JSON round trip. Both callers below differ only in input and schema. */
async function askGemini<T>(input: unknown[], schema: object): Promise<T> {
  const proxyUrl = process.env.EXPO_PUBLIC_GEMINI_PROXY_URL || 'https://gemini-proxy.divijk2911.workers.dev';

  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      input,
      // Gemini thinks by default; naming an animal doesn't need it, and it was burning
      // ~230 reasoning tokens of pure latency per photo.
      generation_config: { thinking_level: 'minimal' },
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema,
      },
    }),
  };

  let response: Response;
  try {
    response = await fetch(proxyUrl + '/v1beta/interactions', request);
  } catch {
    // fetch only rejects on a network-level failure — a 4xx or 5xx still resolves. So
    // anything landing here means the request never made it off the phone.
    throw new DetectorError("You're offline. Connect and try again.", 'neutral');
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    // The user gets a sentence; the developer gets what actually happened.
    console.warn(`[detector] Gemini ${response.status}: ${detail.slice(0, 300)}`);
    throw messageForStatus(response.status, detail);
  }

  try {
    return JSON.parse(extractText(await response.json()));
  } catch {
    throw new DetectorError('Could not read the response. Try again.', 'danger');
  }
}

function toSpeciesInfo(result: SpeciesResult): SpeciesInfo {
  return {
    description: result.description,
    habitat: result.habitat,
    diet: result.diet,
    // The schema constrains this, but it's a model — fall back rather than render a
    // status the badge has no colour for.
    conservationStatus: CONSERVATION_STATUSES.includes(result.conservationStatus)
      ? result.conservationStatus
      : 'Data Deficient',
  };
}

/** Classifies a captured photo. Returns an empty list when there's no animal in frame. */
export async function detectInImage(photoUri: string): Promise<Detection[]> {
  const image = await toBase64Jpeg(photoUri);

  const result = await askGemini<IdentifyResult>(
    [
      { type: 'text', text: IDENTIFY_PROMPT },
      { type: 'image', data: image, mime_type: 'image/jpeg' },
    ],
    IDENTIFY_SCHEMA
  );

  // Shown a chair, the model fills in label "chair" with confidence 1 and describes the
  // upholstery — isAnimal is the only thing that says it isn't a species. Trust it, and
  // throw the rest away.
  if (!result.isAnimal || !result.label) return [];

  return [
    {
      label: result.label,
      // Clamp: the model reports its own confidence, so don't trust the range blindly.
      score: Math.min(1, Math.max(0, result.confidence ?? 0)),
      info: toSpeciesInfo(result),
    },
  ];
}

/**
 * Looks a species up by name, with no photo.
 *
 * Species facts follow from the label, not the image — which is what makes finds saved
 * before species info existed backfillable, where something like a location never could be.
 */
export async function fetchSpeciesInfo(label: string): Promise<SpeciesInfo> {
  const result = await askGemini<SpeciesResult>(
    [{ type: 'text', text: `Describe the animal species "${label}". ${SPECIES_INSTRUCTION}` }],
    SPECIES_SCHEMA
  );

  return toSpeciesInfo(result);
}
