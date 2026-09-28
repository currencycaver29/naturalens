const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: 'https://83b2a756db7f1053a1002542c14b1229.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'c1f796e39fc829add53cd92f4cd5f8fd',
    secretAccessKey: 'c0b3f5cf56b0ffe3b23a5581ed1dd26f5c4e05c535a998bf67657f083be899ed',
  },
});

const r2Dir = path.join(__dirname, 'temp_export', 'naturalens-data-export', 'r2');
const BUCKET_NAME = 'naturalens-data';
const MAX_CONCURRENT = 15;

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
  let failed = 0;
  
  return new Promise((resolve) => {
    function next() {
      if (index >= filesToUpload.length && active === 0) {
        resolve({ completed, failed });
        return;
      }
      
      while (active < MAX_CONCURRENT && index < filesToUpload.length) {
        const filePath = filesToUpload[index++];
        const objectKey = path.relative(r2Dir, filePath).replace(/\\/g, '/');
        
        let contentType = 'application/octet-stream';
        if (objectKey.endsWith('.jpg') || objectKey.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (objectKey.endsWith('.png')) contentType = 'image/png';
        
        const fileStream = fs.createReadStream(filePath);
        const uploadParams = {
          Bucket: BUCKET_NAME,
          Key: objectKey,
          Body: fileStream,
          ContentType: contentType,
        };

        active++;
        s3Client.send(new PutObjectCommand(uploadParams))
          .then(() => {
            completed++;
            if (completed % 100 === 0) console.log(`Uploaded ${completed}/${filesToUpload.length} files...`);
            active--;
            next();
          })
          .catch((err) => {
            console.error(`Failed to upload ${objectKey}:`, err.message);
            failed++;
            active--;
            next();
          });
      }
    }
    
    next();
  });
}

uploadFiles().then(({ completed, failed }) => {
  console.log(`Finished! Successfully uploaded ${completed} files. Failed: ${failed}`);
});
