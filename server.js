const express = require("express");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

// Import nového AWS SDK v3
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Nastavenie klienta pre S3
const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1", // zmeň podľa regiónu, ak treba
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// statické súbory (upload.html)
app.use(express.static("public"));

// stránka pre nahrávanie
app.get("/upload", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "upload.html"));
});

// nahrávanie fotiek
app.post("/upload", upload.array("photos"), async (req, res) => {
  try {
    const event = req.query.event || "default";

    const uploads = req.files.map(async (file) => {
      const params = {
        Bucket: process.env.S3_BUCKET,
        Key: `events/${event}/${Date.now()}-${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      await s3.send(new PutObjectCommand(params));
    });

    await Promise.all(uploads);
    res.status(200).send("OK");
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).send("Upload error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Uploader running on port ${PORT}`));
