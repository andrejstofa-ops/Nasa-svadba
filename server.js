const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const path = require("path");
require("dotenv").config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Povie Expressu, že má hľadať statické súbory (napr. upload.html) v priečinku "public"
app.use(express.static("public"));

// Zobrazí stránku s formulárom na nahratie
app.get("/upload", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "upload.html"));
});

// Spracuje nahratie fotiek a uloží ich na S3
app.post("/upload", upload.array("photos"), async (req, res) => {
  try {
    const s3 = new AWS.S3();
    const event = req.query.event || "default";

    const uploads = req.files.map((file) => {
      const params = {
        Bucket: process.env.S3_BUCKET,
        Key: `events/${event}/${Date.now()}-${file.originalname}`,
        Body: file.buffer,
      };
      return s3.upload(params).promise();
    });

    await Promise.all(uploads);
    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload error");
  }
});

// Spustenie servera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Uploader running on port ${PORT}`));
