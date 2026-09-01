export interface SendOtpInput {
  to: string;
  code: string;
  from: string;
  apiKey: string;
}

export type SendOtpResult = { ok: true } | { ok: false; status: number };

/**
 * Transactional OTP mail via Resend's HTTP API. The code is in the body only —
 * never logged, never returned to the Worker caller.
 *
 * Digits sit on their own line so iOS Mail can offer AutoFill.
 */
export async function sendOtpEmail(input: SendOtpInput): Promise<SendOtpResult> {
  const text = [
    "Your NaturaLens sign-in code is:",
    "",
    input.code,
    "",
    "It expires in 10 minutes.",
    "",
    "If you did not ask for this, ignore the message.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:48px 24px;background:#ffffff;color:#000000;font-family:Archivo,Helvetica,sans-serif;">
    <p style="margin:0 0 24px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#666666;">NaturaLens</p>
    <p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#666666;">Your sign-in code is</p>
    <p style="margin:0 0 24px;font-size:36px;letter-spacing:0.24em;font-weight:500;color:#000000;">${input.code}</p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:#666666;">It expires in 10 minutes. If you did not ask for this, ignore the message.</p>
  </body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: "Your NaturaLens code",
        text,
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("otp_send_failed", { status: response.status, detail: detail.slice(0, 200) });
      return { ok: false, status: response.status };
    }

    return { ok: true };
  } catch (error) {
    console.error("otp_send_failed", { status: 0, error: error instanceof Error ? error.message : "network" });
    return { ok: false, status: 0 };
  }
}
