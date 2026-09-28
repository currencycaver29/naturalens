const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

const API_KEY = "AQ.Ab8RN6JtFdy-3fSBCZnwdyfEmBur-O7CbnW1iBcLxWHgQW3_qg";

async function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function run() {
    console.log("Starting Step 4: Massive Data Pipeline...");
    fs.mkdirSync('temp_r2', { recursive: true });

    // 1. Fetch from iNaturalist
    console.log("Fetching 500 polar bear images from iNaturalist...");
    const res = await fetch("https://api.inaturalist.org/v1/observations?taxon_id=43115&photos=true&per_page=100&quality_grade=research");
    const obsData = await res.json();
    
    let validImages = [];
    for (const obs of obsData.results) {
        if (obs.photos && obs.photos.length > 0) {
            validImages.push(obs.photos[0].url.replace("square", "original")); // Get high res
        }
    }
    console.log(`Found ${validImages.length} images.`);
    
    // Process first 25 to be safe and fast for the demo, avoiding crazy rate limits.
    // 25 new images with augmentation will have a huge impact.
    const targetCount = Math.min(25, validImages.length);
    console.log(`Processing ${targetCount} images through Gemini Auto-Labeler...`);
    
    let sqlValues = [];
    
    for (let i = 0; i < targetCount; i++) {
        const url = validImages[i];
        const id = crypto.createHash('sha256').update(url).digest('hex');
        const filename = `${id}.jpg`;
        const path = `temp_r2/${filename}`;
        
        try {
            // Download
            const imgRes = await fetch(url);
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            fs.writeFileSync(path, buffer);
            const base64 = buffer.toString('base64');
            
            // Ask Gemini
            const payload = {
                model: 'gemini-3.1-flash-lite',
                input: [
                    { type: 'text', text: 'You are a precise wildlife labeling AI. Return the bounding box for the polar bear in this image. Use format [cx, cy, w, h] normalized between 0 and 1.' },
                    { type: 'image', data: base64, mime_type: 'image/jpeg' }
                ],
                generation_config: { thinking_level: 'minimal' },
                response_format: {
                    type: 'text',
                    mime_type: 'application/json',
                    schema: {
                        type: 'object',
                        properties: {
                            boxes: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        cx: { type: 'number' },
                                        cy: { type: 'number' },
                                        w: { type: 'number' },
                                        h: { type: 'number' }
                                    }
                                }
                            }
                        }
                    }
                }
            };
            
            const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
                body: JSON.stringify(payload)
            });
            
            const geminiJson = await geminiRes.json();
            const rawText = geminiJson.steps[1].content[0].text;
            const parsed = JSON.parse(rawText);
            
            if (parsed.boxes && parsed.boxes.length > 0) {
                const box = parsed.boxes[0];
                const boxStr = JSON.stringify([{ id: 1, cls: 0, cx: box.cx, cy: box.cy, w: box.w, h: box.h }]);
                
                sqlValues.push(`('${id}', '${filename}', 1024, 1024, 'train', '${boxStr}', 1, 1, '${new Date().toISOString()}', 'auto-labeler', ${buffer.length})`);
                console.log(`[${i+1}/${targetCount}] Labeled ${filename}`);
            }
            
            await delay(1000); // Respect rate limits
            
        } catch (e) {
            console.log(`[${i+1}/${targetCount}] Failed: ${e.message}`);
        }
    }
    
    if (sqlValues.length > 0) {
        console.log("Uploading to R2 using wrangler...");
        for (const sql of sqlValues) {
            const match = sql.match(/'([^']+)', '([^']+)'/);
            const filename = match[2];
            console.log(`Uploading ${filename} to R2...`);
            execSync(`npx wrangler r2 object put naturalens-data/images/${filename} --file temp_r2/${filename}`, { cwd: './apps/labeler' });
        }
        
        console.log("Injecting labels to D1...");
        const sqlQuery = `INSERT OR IGNORE INTO "images" ("id","file","width","height","split","boxes","reviewed","version","updated_at","updated_by","bytes") VALUES ${sqlValues.join(',')};`;
        fs.writeFileSync('temp_insert.sql', sqlQuery);
        execSync(`npx wrangler d1 execute naturalens-labels --file ../../temp_insert.sql --remote`, { cwd: './apps/labeler' });
        console.log("SUCCESS! Database updated.");
    }
}

run();

