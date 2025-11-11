# Deployment Guide

## Backend Deployment (Vercel/Railway/Render)

### Option 1: Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to backend folder:
   ```bash
   cd school_backend
   ```

3. Create `vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "dist/main.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "dist/main.js"
       }
     ]
   }
   ```

4. Add build command to package.json:
   ```json
   "scripts": {
     "vercel-build": "npm run build"
   }
   ```

5. Deploy:
   ```bash
   vercel
   ```

6. Add environment variables in Vercel dashboard:
   - All variables from `.env` file

### Option 2: Railway

1. Push your code to GitHub

2. Go to [railway.app](https://railway.app)

3. Create new project from GitHub repo

4. Select `school_backend` folder

5. Add environment variables from `.env`

6. Deploy automatically

### Option 3: Render

1. Go to [render.com](https://render.com)

2. Create new Web Service

3. Connect GitHub repository

4. Set root directory to `school_backend`

5. Build command: `npm install && npm run build`

6. Start command: `npm run start:prod`

7. Add environment variables from `.env`

## Frontend Deployment (Vercel/Netlify)

### Option 1: Vercel

1. Navigate to frontend folder:
   ```bash
   cd school__admin
   ```

2. The `vercel.json` is already created

3. Update `.env`:
   ```
   VITE_API_URL=https://your-backend-url.vercel.app
   ```

4. Deploy:
   ```bash
   vercel
   ```

### Option 2: Netlify

1. Push your code to GitHub

2. Go to [netlify.com](https://netlify.com)

3. Create new site from Git

4. Set base directory to `school__admin`

5. Build command: `npm run build`

6. Publish directory: `dist`

7. Add environment variable:
   - `VITE_API_URL=https://your-backend-url.com`

8. Deploy

The `_redirects` file is already created for SPA routing.

## Environment Variables Checklist

### Backend (.env)
- ✅ All Firebase Admin SDK variables
- ✅ Firebase Client Config (for authentication)
- ✅ PORT (optional, defaults to 3000)
- ✅ CORS_ORIGIN (set to your frontend URL)

### Frontend (.env)
- ✅ VITE_API_URL (your backend URL)

## Important Notes

1. **Never commit `.env` files** - they're already in `.gitignore`

2. **Update CORS_ORIGIN** in backend `.env` to match your frontend URL:
   ```
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```

3. **Update VITE_API_URL** in frontend `.env` to match your backend URL:
   ```
   VITE_API_URL=https://your-backend-url.vercel.app
   ```

4. **Firebase credentials** should be added as environment variables in your deployment platform

5. **Test locally first** before deploying

## Local Testing

1. Start backend:
   ```bash
   cd school_backend
   npm run start:dev
   ```

2. Start frontend:
   ```bash
   cd school__admin
   npm run dev
   ```

3. Visit `http://localhost:5173`

## Troubleshooting

### "Cannot connect to backend"
- Check if backend is running
- Verify `VITE_API_URL` is correct
- Check CORS settings in backend

### "Unauthorized" errors
- Clear browser localStorage
- Re-login
- Check Firebase credentials

### Page refresh shows 404
- Verify `vercel.json` or `_redirects` file exists
- Check deployment platform settings for SPA routing

### Mobile menu not working
- Clear browser cache
- Hard refresh (Ctrl+F5)
