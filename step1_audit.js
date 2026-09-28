const fs = require('fs');
const { execSync } = require('child_process');

async function runAudit() {
    console.log("Starting Step 1: Data Audit...");

    // 1. Read the total images from R2 manifest
    console.log("Reading R2 manifest...");
    const r2ManifestStr = fs.readFileSync('temp_export/naturalens-data-export/r2-manifest.json', 'utf8');
    const r2Manifest = JSON.parse(r2ManifestStr);
    
    // Extract file names (removing 'display/' prefix if present)
    const allR2Images = new Set();
    for (const obj of r2Manifest.objects) {
        if (obj.key.endsWith('.jpg') || obj.key.endsWith('.png')) {
            const fileName = obj.key.split('/').pop();
            allR2Images.add(fileName);
        }
    }
    console.log(`Found ${allR2Images.size} total images in R2 bucket.`);

    // 2. Query D1 for labeled images
    console.log("Querying live D1 database for labeled images...");
    try {
        const d1Output = execSync('npx wrangler d1 execute naturalens-labels --command "SELECT file FROM images" --json --remote', {
            cwd: './apps/labeler',
            encoding: 'utf8',
            stdio: 'pipe'
        });
        
        const d1Data = JSON.parse(d1Output);
        const labeledImages = new Set();
        
        if (d1Data && d1Data[0] && d1Data[0].results) {
            for (const row of d1Data[0].results) {
                labeledImages.add(row.file);
            }
        }
        
        console.log(`Found ${labeledImages.size} labeled images in D1 database.`);
        
        // 3. Find the missing ones
        const missingImages = [];
        for (const img of allR2Images) {
            if (!labeledImages.has(img)) {
                missingImages.push(img);
            }
        }
        
        console.log(`\nAUDIT COMPLETE!`);
        console.log(`Total unlabeled images identified: ${missingImages.length}`);
        
        fs.writeFileSync('unlabeled_images.json', JSON.stringify(missingImages, null, 2));
        console.log(`Saved list to unlabeled_images.json`);
        
    } catch (e) {
        console.error("Failed to query D1:", e.message);
    }
}

runAudit();
