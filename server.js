/**
 * Simple anonymous photo uploader (Express + AWS S3 presigned URLs)
 * Production tips:
 *  - Put this behind HTTPS (your host should do this automatically).
 *  - Set proper CORS in S3 bucket.
 *  - Use EVENT_SECRET to protect token generation/validation.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');
require('dotenv').config();

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('tiny'));

// Serve static files (upload page)
app.use(express.static(path.join(__dirname, 'public')));

const {
  PORT = 3000,
  AWS_REGION,
  S3_BUCKET,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  EVENT_SECRET = 'change_me'
} = process.env;

// S3 client
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
});

// --- Simple token helpers (HMAC) ---
function makeEventToken(eventId, ttlSeconds = 24*3600) {
  const expiry = Math.floor(Date.now()/1000) + ttlSeconds;
  const mac = crypto.createHmac('sha256', EVENT_SECRET).update(`${eventId}|${expiry}`).digest('hex');
  return Buffer.from(`${eventId}|${expiry}|${mac}`).toString('base64url');
}

function verifyEventToken(token) {
  if (token === 'DEV') return { eventId: 'dev', ok: true }; // dev shortcut
  try {
    const raw = Buffer.from(token, 'base64url').toString();
    const [eventId, expiryStr, mac] = raw.split('|');
    if (!eventId || !expiryStr || !mac) return { ok: false };
    const now = Math.floor(Date.now()/1000);
    if (parseInt(expiryStr, 10) < now) return { ok: false };
    const expected = crypto.createHmac('sha256', EVENT_SECRET).update(`${eventId}|${expiryStr}`).digest('hex');
    const eq = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(mac, 'hex'));
    return eq ? { eventId, ok: true } : { ok: false };
  } catch (e) {
    return { ok: false };
  }
}

// --- API: issue presigned URL ---
app.get('/api/get-presigned', async (req, res) => {
  try {
    const { token, filename = 'upload.jpg', contentType = 'image/jpeg', event } = req.query;
    const ver = verifyEventToken(token);
    if (!ver.ok) return res.status(403).json({ error: 'Invalid or expired token' });

    const eventId = event || ver.eventId;
    const safeName = String(filename).replace(/[^\w.\-]/g, '_');
    const key = `events/${eventId}/${Date.now()}_${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: 'private'
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 15 }); // 15 minutes
    return res.json({ uploadUrl, key });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- Admin helper to mint tokens (simple page) ---
app.get('/admin', (req, res) => {
  const event = req.query.event || 'wedding2025';
  const ttl = parseInt(req.query.ttl || '86400', 10); // 24h
  const token = makeEventToken(event, ttl);
  const sampleLink = `${req.protocol}://${req.get('host')}/upload?event=${encodeURIComponent(event)}&token=${token}`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end([
    `Event: ${event}`,
    `TTL: ${ttl}s`,
    `Token: ${token}`,
    `Link: ${sampleLink}`
  ].join('\n'));
});

import path from "path";
app.use(express.static("public"));

app.get("/upload", (req, res) => {
  res.sendFile(path.resolve("public/upload.html"));
});


// Health check
app.get('/healthz', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Uploader running on port ${PORT}`);
});
