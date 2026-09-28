const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

const r2Dir = path.join(__dirname, 'temp_export', 'naturalens-data-export', 'r2');
const BUCKET_NAME = 'naturalens-data';
const MAX_CONCURRENT = 10;

async function uploadFiles() {
  console.log('Scanning files...');
  let filesToUpload = [];

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else {
        filesToUpload.push(fullPath);
      }
    }
  }

  scanDir(r2Dir);
  console.log(`Found ${filesToUpload.length} files to upload.`);

  let index = 0;
  let active = 0;
  let completed = 0;
  
  return new Promise((resolve) => {
    function next() {
      if (index >= filesToUpload.length && active === 0) {
        resolve();
        return;
      }
      
      while (active < MAX_CONCURRENT && index < filesToUpload.length) {
        const filePath = filesToUpload[index++];
        const objectKey = path.relative(r2Dir, filePath).replace(/\\/g, '/');
        
        active++;
        execPromise(`npx wrangler r2 object put "${BUCKET_NAME}/${objectKey}" --file="${filePath}"`)
          .then(() => {
            completed++;
            if (completed % 50 === 0) console.log(`Uploaded ${completed}/${filesToUpload.length} files...`);
            active--;
            next();
          })
          .catch((err) => {
            console.error(`Failed to upload ${objectKey}:`, err.message);
            active--;
            next();
          });
      }
    }
    
    next();
  });
}

uploadFiles().then(() => console.log('All files uploaded successfully!'));
