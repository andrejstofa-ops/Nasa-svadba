# Wedding / Event Photo Uploader (QR + Anonymous Uploads)

This is a super-simple web app that lets guests upload photos anonymously via a QR code link.
- Backend: Node.js (Express) generates **presigned S3 URLs**.
- Frontend: Minimal HTML page that uploads files **directly to S3**.
- No logins required for guests.

## What you need
1) **AWS account** (free tier is ok).
2) An **S3 bucket** (region EU is recommended: eu-central-1).
3) An **IAM user** with minimal permissions (PutObject to your bucket).
4) A place to run this app (e.g., **Render** free web service or any VPS).

## 1) Create S3 bucket
- Go to AWS Console → S3 → Create bucket.
- Name: something unique, e.g. `my-wedding-photos-2025`.
- Region: e.g. **eu-central-1** (Frankfurt).
- Block **all public access** (recommended).
- Create.

### Set CORS on the bucket
S3 → Your bucket → Permissions → **CORS configuration** → paste this:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "HEAD", "GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```
> For stricter security, replace `*` in `AllowedOrigins` with your site domain when you have it (e.g. `https://yourapp.onrender.com`).

## 2) Create IAM user with minimal permissions
- AWS Console → IAM → Users → Add users → Name `wedding-uploader`.
- Access type: **Access key** (programmatic access).
- Attach policy: choose **Create policy** and paste:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPutOnlyToEventPrefix",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/events/*"
    }
  ]
}
```
- Replace `YOUR_BUCKET_NAME` and save.
- Finish user creation and **download the Access key ID and Secret access key**.

## 3) Configure environment variables
Create `.env` file (or use your hosting's dashboard to set env vars):

```
PORT=3000
AWS_REGION=eu-central-1
S3_BUCKET=YOUR_BUCKET_NAME
AWS_ACCESS_KEY_ID=YOUR_AWS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET
EVENT_SECRET=change_this_long_random_string
```

## 4) Run locally (optional)
- Install Node.js 18+.
- In this folder run:
```
npm install
npm start
```
- Open http://localhost:3000/upload?event=wedding2025&token=DEV
  (In dev mode, token `DEV` is accepted).

## 5) Deploy (example with Render)
1. Create a GitHub repository and upload these files (you can use GitHub UI → "Add file" → "Upload files").
2. Go to https://render.com → New → Web Service → Connect your repo.
3. Environment:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add all **Environment Variables** from step 3 in Render dashboard.
5. Deploy. Your app will be live at something like `https://yourapp.onrender.com`.

## 6) Make a QR code
- Create a link like:
```
https://YOUR_DOMAIN/upload?event=wedding2025&token=ONE_TIME_TOKEN
```
- Generate a QR code (any online QR generator works) pointing to that link.
- Print it on cards or show it on screen at the event.

> Tip: You can generate tokens in the admin panel (at `/admin`) and set expiry. Or pre-generate a simple static token good for the whole day.

## 7) Downloading photos
Files are uploaded to S3 under: `events/{EVENT_ID}/{timestamp_filename}`.
Use AWS Console → S3 to download, or connect any gallery tool that reads from S3.

## GDPR / Safety
- Put a short consent note on the upload page.
- Consider enabling a daily expiry for tokens.
- Keep the bucket **not public**; you can review files before sharing.

## Troubleshooting
- **403 on upload**: check IAM policy and bucket CORS; ensure Content-Type is set.
- **CORS errors**: double-check the CORS JSON and your domain.
- **AccessDenied in presign**: verify AWS keys and region.
- **iPhone fails on large files**: set a size limit and/or compress client-side.
```

