const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://83b2a756db7f1053a1002542c14b1229.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'c1f796e39fc829add53cd92f4cd5f8fd',
    secretAccessKey: 'c0b3f5cf56b0ffe3b23a5581ed1dd26f5c4e05c535a998bf67657f083be899ed',
  }
});
const key = 'originals/44a92928353f0ee79f1b9ce0699cd2e04990df4b3e7e29b1ce4b519f39f39cd6.jpg';
const filePath = require('path').join(__dirname, 'temp_export', 'naturalens-data-export', 'r2', key);
s3.send(new PutObjectCommand({ Bucket: 'naturalens-data', Key: key, Body: fs.createReadStream(filePath), ContentType: 'image/jpeg' }))
  .then(() => console.log('Successfully uploaded single file!'))
  .catch(console.error);
