const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://83b2a756db7f1053a1002542c14b1229.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'c1f796e39fc829add53cd92f4cd5f8fd',
    secretAccessKey: 'c0b3f5cf56b0ffe3b23a5581ed1dd26f5c4e05c535a998bf67657f083be899ed',
  }
});

const r2Dir = path.join(__dirname, 'temp_export', 'naturalens-data-export', 'r2');
const BUCKET_NAME = 'naturalens-data';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });
  return arrayOfFiles;
}

async function uploadFiles() {
  const filesToUpload = getAllFiles(r2Dir);
  console.log(`Found ${filesToUpload.length} files. Checking missing...`);
  
  let uploadedCount = 0;
  for (const filePath of filesToUpload) {
    const objectKey = path.relative(r2Dir, filePath).replace(/\\/g, '/');
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey }));
    } catch (err) {
      if (err.name === 'NotFound') {
         console.log(`Uploading missing file: ${objectKey}`);
         const fileStream = fs.createReadStream(filePath);
         const uploadParams = {
           Bucket: BUCKET_NAME,
           Key: objectKey,
           Body: fileStream,
           ContentType: objectKey.endsWith('.json') ? 'application/json' : 'image/jpeg'
         };
         try {
           await s3.send(new PutObjectCommand(uploadParams));
           uploadedCount++;
         } catch (uploadErr) {
           console.error(`Failed to upload ${objectKey}:`, uploadErr.message);
         }
      }
    }
  }
  console.log(`Finished! Uploaded ${uploadedCount} missing files.`);
}
uploadFiles();
