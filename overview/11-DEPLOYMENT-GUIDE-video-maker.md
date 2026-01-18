# Deployment Guide - Video Frames Editor

## Overview

How to deploy after each stage and verify it works.

**Workflow per stage:**
```
1. Claude Code builds + tests ✓
2. You push to GitHub (or deploy manually)
3. Railway auto-deploys (or you trigger)
4. You verify in browser
5. Move to next stage
```

---

## Deployment Methods

### Option A: GitHub Auto-Deploy (Recommended)

If you connected GitHub to Railway:

```bash
# After Claude Code finishes a stage
git add .
git commit -m "Stage X complete"
git push origin main
```

Railway auto-deploys on push. Watch the deploy in Railway dashboard.

### Option B: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project (first time only)
railway link

# Deploy
railway up
```

### Option C: Railway Dashboard

1. Go to Railway dashboard
2. Click your service
3. Click **"Deploy"** → **"Deploy Now"**

---

## Stage-by-Stage Deployment

### Stage 1: Setup & Database

**What was built:**
- Backend with health endpoint
- Database schema
- Frontend placeholder

**Deploy:**
```bash
git add .
git commit -m "Stage 1: Setup and database"
git push origin main
```

**Verify:**

1. **Backend health check:**
```bash
curl https://backend-xxxx.railway.app/health
```
Expected:
```json
{"status":"ok","db":"connected"}
```

2. **Frontend loads:**
- Open `https://frontend-xxxx.railway.app`
- Should see landing page (even if just "Hello World")

**Troubleshooting:**
- 502 error → Check Railway logs, service might still be starting
- DB not connected → Verify DATABASE_URL is set
- Build failed → Check Railway build logs

---

### Stage 2: Projects

**What was built:**
- Projects CRUD API
- Projects list page
- Create project modal

**Deploy:**
```bash
git add .
git commit -m "Stage 2: Projects CRUD"
git push origin main
```

**Verify:**

1. Open `https://frontend-xxxx.railway.app/projects`
2. Click **"New Project"**
3. Enter name, click Create
4. See project appear in list
5. Click project to open
6. **Refresh page** - project should still be there
7. Delete project
8. Refresh - project should be gone

**Troubleshooting:**
- 404 on /projects → Frontend routing not working
- Can't create → Check backend logs for errors
- Data doesn't persist → Database connection issue

---

### Stage 3: Videos

**What was built:**
- Videos CRUD API
- Context API
- Videos list in project
- Video editor page
- Context editor panel

**Deploy:**
```bash
git add .
git commit -m "Stage 3: Videos and Context"
git push origin main
```

**Verify:**

1. Open a project
2. Click **"New Video"**
3. Enter name, click Create
4. Click video to open editor
5. Find context panel
6. Edit context text: "A colorful cartoon style"
7. **Refresh page** - context should persist
8. Delete video
9. Verify it's gone

**Troubleshooting:**
- Video created but no context → Check auto-context creation in backend
- Context doesn't save → Check PATCH endpoint

---

### Stage 4: Frames

**What was built:**
- Frames CRUD API
- Frame list panel
- Frame detail panel
- Drag-and-drop reorder

**Deploy:**
```bash
git add .
git commit -m "Stage 4: Frames with reordering"
git push origin main
```

**Verify:**

1. Open video editor
2. Click **"Add Frame"**
3. Create 3 frames: "Intro", "Middle", "Outro"
4. Verify order: 1, 2, 3
5. **Drag "Outro" to top**
6. Verify new order: Outro, Intro, Middle
7. **Refresh page** - order should persist
8. Delete middle frame
9. Verify remaining frames still in order

**Troubleshooting:**
- Drag doesn't work → Check frontend drag library
- Order doesn't persist → Check reorder API endpoint
- Frames disappear → Check cascade delete isn't triggered

---

### Stage 5: Image Generation

**What was built:**
- Image generation API (GPT Image + Cloudinary)
- Chat UI in frame panel
- Image grid with selection
- Fullscreen modal
- Download button
- Gallery page

**Deploy:**
```bash
git add .
git commit -m "Stage 5: Image generation"
git push origin main
```

**Verify:**

1. Open a frame
2. Type prompt: "A red apple on a wooden table"
3. Click **"Generate"**
4. Wait for 4 images to appear (~30-60 seconds)
5. **Click image** → should open fullscreen modal
6. **Press Escape** or click X → modal closes
7. **Click download button** → image downloads
8. **Click "Select"** on an image → shows checkmark
9. **Refresh** → selected image persists
10. Try with context:
    - Set video context: "Pixar animation style"
    - Check "Include video context"
    - Generate → images should match style
11. Go to Gallery page → see saved images

**Troubleshooting:**
- Generation fails → Check OpenAI API key, organization verification
- Images don't appear → Check Cloudinary credentials
- Slow generation → Normal, GPT Image takes 30-60 seconds
- 429 error → Rate limited, wait and retry

---

### Stage 6: Authentication

**What was built:**
- Auth API (signup, login, JWT)
- Protected routes
- Login/signup pages
- User isolation

**Deploy:**
```bash
git add .
git commit -m "Stage 6: Authentication"
git push origin main
```

**Verify:**

1. **Logout** (if logged in) or clear localStorage
2. Go to `/projects` → should redirect to `/login`
3. Click "Sign up"
4. Create account: `user1@test.com` / `password123`
5. Should redirect to `/projects`
6. Create a project: "User 1 Project"
7. **Logout**
8. Sign up as different user: `user2@test.com` / `password123`
9. Go to `/projects`
10. **Should NOT see** "User 1 Project"
11. Create "User 2 Project"
12. Logout, login as user1
13. Should only see "User 1 Project"

**Troubleshooting:**
- Can't signup → Check JWT_SECRET is set
- Already logged in after signup → Token handling issue
- See other user's data → User isolation bug (critical!)

---

## Checking Logs

### Railway Dashboard
1. Click service (backend or frontend)
2. Click **"Logs"** tab
3. View real-time logs

### Common Log Patterns

**Successful request:**
```
POST /projects 201 12ms
```

**Error:**
```
ERROR: relation "projects" does not exist
```
→ Run migrations: `npx prisma migrate deploy`

**Database connection:**
```
prisma:info Connected to database
```

---

## Rolling Back

If a deploy breaks something:

### Railway Dashboard
1. Click service
2. Go to **"Deployments"** tab
3. Find last working deployment
4. Click **"..."** → **"Rollback"**

### Git
```bash
git revert HEAD
git push origin main
```

---

## Environment Variable Changes

If you need to change env vars:

1. Railway dashboard → Service → Variables
2. Edit value
3. Click **"Deploy"** to apply

Note: Some changes require restart.

---

## Domain Setup (Optional)

### Custom Domain
1. Railway dashboard → Service → Settings
2. **"Domains"** section
3. Click **"+ Custom Domain"**
4. Enter domain: `app.yourdomain.com`
5. Add CNAME record in your DNS:
   - Type: CNAME
   - Name: app
   - Value: (Railway provides this)

### HTTPS
Railway provides free SSL automatically.

---

## Quick Reference

### URLs
```
Frontend: https://frontend-xxxx.railway.app
Backend:  https://backend-xxxx.railway.app
API:      https://backend-xxxx.railway.app/api
Health:   https://backend-xxxx.railway.app/health
```

### Useful Commands
```bash
# Deploy
git push origin main

# Check backend health
curl https://backend-xxxx.railway.app/health

# View logs (Railway CLI)
railway logs

# Run migrations manually
railway run npx prisma migrate deploy
```

### Stage Summary

| Stage | Deploy Check |
|-------|--------------|
| 1 | `curl /health` → 200 |
| 2 | Create/delete project in browser |
| 3 | Edit context, refresh, persists |
| 4 | Reorder frames, refresh, persists |
| 5 | Generate images, select, fullscreen, download |
| 6 | Two users can't see each other's data |
