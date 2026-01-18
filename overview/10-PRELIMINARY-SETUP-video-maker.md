# Preliminary Setup - Video Frames Editor

## Overview

Complete these steps **before** starting development. Claude Code cannot do these - you must do them manually.

**Time estimate:** 30-45 minutes

---

## Checklist

```
[ ] 1. Railway account + project + PostgreSQL
[ ] 2. Cloudinary account + credentials
[ ] 3. OpenAI account + API key + organization verification
[ ] 4. GitHub repository (optional, for CI/CD)
```

---

## 1. Railway Setup

### Create Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (recommended) or email
3. Verify email if required

### Create Project
1. Click **"New Project"**
2. Select **"Empty Project"**
3. Name it: `video-frames-editor`

### Add PostgreSQL
1. In your project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Wait for provisioning (~30 seconds)
4. Click the PostgreSQL service
5. Go to **"Variables"** tab
6. Copy `DATABASE_URL` - you'll need this later

```
DATABASE_URL=postgresql://postgres:xxxxx@xxx.railway.app:5432/railway
```

### Create Backend Service (placeholder)
1. Click **"+ New"** → **"Empty Service"**
2. Name it: `backend`
3. Go to **"Settings"** tab
4. Set **"Root Directory"**: `backend`
5. Set **"Build Command"**: `npm run build`
6. Set **"Start Command"**: `npm start`

### Create Frontend Service (placeholder)
1. Click **"+ New"** → **"Empty Service"**
2. Name it: `frontend`
3. Go to **"Settings"** tab
4. Set **"Root Directory"**: `frontend`
5. Set **"Build Command"**: `npm run build`
6. Set **"Start Command"**: `npm start`

### Note Your URLs
After first deploy, Railway assigns URLs:
- Backend: `https://backend-xxxx.railway.app`
- Frontend: `https://frontend-xxxx.railway.app`

(You can also set custom domains later)

---

## 2. Cloudinary Setup

### Create Account
1. Go to [cloudinary.com](https://cloudinary.com)
2. Click **"Sign Up For Free"**
3. Choose the **Free** plan (25 GB storage, 25 GB bandwidth/month)
4. Verify email

### Get Credentials
1. Go to **Dashboard** (home page after login)
2. Find the **"Product Environment Credentials"** section
3. Copy these values:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

### Configure Upload Settings (Optional)
1. Go to **Settings** → **Upload**
2. Under **"Upload presets"**, you can create one:
   - Name: `video-frames`
   - Signing Mode: `Signed`
   - Folder: `video-frames`

(Or let the app create folders dynamically - simpler)

---

## 3. OpenAI Setup

### Create Account
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Add payment method (required for API usage)

### Generate API Key
1. Go to **API Keys** section
2. Click **"Create new secret key"**
3. Name it: `video-frames-editor`
4. Copy the key immediately (shown only once):

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
```

### Organization Verification (Required for GPT Image)

⚠️ **Important:** GPT Image models (`gpt-image-1`, etc.) require organization verification.

1. Go to **Settings** → **Organization**
2. Look for **"API Organization Verification"** or similar
3. Complete the verification process:
   - May require phone verification
   - May require business details
   - Usually approved within 24-48 hours

4. Check access:
   - Go to **Limits** or **Usage** page
   - Verify `gpt-image-1` is available

**If not verified:** You can still develop with mocked images, but real image generation won't work until verified.

---

## 4. GitHub Repository (Optional)

For automatic deploys from GitHub:

1. Create new repo: `video-frames-editor`
2. Keep it private (recommended)
3. In Railway:
   - Go to each service
   - **Settings** → **Source**
   - Connect to GitHub repo
   - Select branch: `main`

---

## Environment Variables Summary

Collect all these values:

```bash
# Database (from Railway PostgreSQL)
DATABASE_URL=postgresql://postgres:xxxxx@xxx.railway.app:5432/railway

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx

# App settings (set these yourself)
JWT_SECRET=generate-a-random-32-char-string
NODE_ENV=production
```

### Generate JWT_SECRET

Run this in terminal:
```bash
openssl rand -hex 32
```

Or use: `your-super-secret-jwt-key-change-this-in-production`

---

## Set Environment Variables in Railway

### Backend Service
1. Click **backend** service
2. Go to **"Variables"** tab
3. Add each variable:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (Railway auto-injects from PostgreSQL) |
| `JWT_SECRET` | your-generated-secret |
| `OPENAI_API_KEY` | sk-proj-xxx |
| `CLOUDINARY_CLOUD_NAME` | your_cloud_name |
| `CLOUDINARY_API_KEY` | 123456789 |
| `CLOUDINARY_API_SECRET` | abcdefg |
| `NODE_ENV` | production |
| `FRONTEND_URL` | https://frontend-xxxx.railway.app |

**Tip:** Click **"Raw Editor"** to paste multiple at once:
```
JWT_SECRET=xxx
OPENAI_API_KEY=sk-proj-xxx
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
NODE_ENV=production
FRONTEND_URL=https://frontend-xxxx.railway.app
```

### Frontend Service
1. Click **frontend** service
2. Go to **"Variables"** tab
3. Add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | https://backend-xxxx.railway.app |

---

## Verification Checklist

Before starting development, confirm:

```
[x] Railway project created
[x] PostgreSQL running, DATABASE_URL copied
[x] Backend service created (placeholder)
[x] Frontend service created (placeholder)
[x] Cloudinary account, credentials copied
[x] OpenAI account, API key created
[x] OpenAI organization verification submitted
[x] All environment variables set in Railway
[x] JWT_SECRET generated
```

---

## Cost Estimates

### Free Tiers

| Service | Free Tier |
|---------|-----------|
| Railway | $5 credit/month (covers small apps) |
| Cloudinary | 25 GB storage, 25 GB bandwidth |
| OpenAI | Pay-as-you-go only |

### OpenAI Costs (GPT Image)

| Model | Quality | Per Image |
|-------|---------|-----------|
| gpt-image-1 | Low | $0.011 |
| gpt-image-1 | Medium | $0.042 |
| gpt-image-1 | High | $0.167 |

**Example:** 4 images × $0.042 = **$0.17 per generation**

### Monthly Estimate (Light Usage)
- 100 generations/month × $0.17 = **~$17 OpenAI**
- Railway: **$0-5** (within free tier)
- Cloudinary: **$0** (within free tier)

---

## Troubleshooting

### Railway PostgreSQL won't connect
- Check if service is running (green status)
- Verify DATABASE_URL is correct
- Try restarting the database service

### OpenAI API returns 401
- Check API key is correct
- Verify payment method is added
- Check organization verification status

### Cloudinary upload fails
- Verify cloud name, API key, API secret
- Check if free tier limits exceeded
- Ensure credentials are for the correct environment

---

## Next Steps

Once all setup is complete:
1. Start **Stage 1** of development plan
2. Claude Code will build the app
3. You deploy after each stage
4. See **11-DEPLOYMENT-GUIDE** for deploy steps
