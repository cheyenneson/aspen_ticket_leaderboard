# Firebase Deployment Guide

This guide will help you deploy the Aspen Ticket Leaderboard to Firebase.

## Prerequisites

1. **Firebase Account**: Create a Firebase account at https://firebase.google.com
2. **Firebase CLI**: Install globally
   ```bash
   npm install -g firebase-tools
   ```

## Initial Setup

### 1. Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project" or select an existing one
3. Follow the setup wizard
4. Note your Project ID (you'll need it below)

### 2. Login to Firebase CLI

```bash
firebase login
```

### 3. Initialize Firebase in Your Project

```bash
firebase init
```

When prompted:
- **Select features**: Choose "Hosting" and "Functions"
- **Select project**: Choose your Firebase project or select "Use an existing project"
- **Functions setup**:
  - Language: JavaScript
  - ESLint: No (or Yes if you prefer)
  - Install dependencies: Yes
- **Hosting setup**:
  - Public directory: `dist`
  - Single-page app: Yes
  - GitHub deploys: No (or configure if you want)

### 4. Update .firebaserc

Edit `.firebaserc` and replace with your actual project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

### 5. Configure Eventbrite Token

Set your Eventbrite token as a Firebase environment variable:

```bash
firebase functions:config:set eventbrite.token="YOUR_EVENTBRITE_PRIVATE_TOKEN"
```

To verify it's set:
```bash
firebase functions:config:get
```

## Deployment

### Build and Deploy Everything

```bash
npm run deploy
```

Or deploy step-by-step:

### 1. Build the React App

```bash
npm run build
```

### 2. Deploy to Firebase

```bash
firebase deploy
```

Or deploy separately:

```bash
# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions
```

## After Deployment

### 1. Get Your URLs

After successful deployment, you'll see:
- **Hosting URL**: `https://your-project-id.web.app`
- **Functions URL**: `https://us-central1-your-project-id.cloudfunctions.net/api`

### 2. Test Your Deployment

Visit your hosting URL to see the leaderboard!

Test the API directly:
```bash
curl https://your-project-id.web.app/api/health
```

## Local Testing with Firebase Emulators (Optional)

To test the full setup locally before deploying:

```bash
# Install functions dependencies
cd functions
npm install
cd ..

# Start emulators
firebase emulators:start
```

Then update `.env.local` to use the emulator:
```
VITE_API_URL=http://localhost:5001/your-project-id/us-central1/api
```

## Updating After Changes

### Update Frontend Only
```bash
npm run build
firebase deploy --only hosting
```

### Update Backend Only
```bash
firebase deploy --only functions
```

### Update Everything
```bash
npm run deploy
```

## Environment Variables

### Development (Local)
Uses `.env.local`:
```
VITE_API_URL=http://localhost:3001/api
```

### Production (Firebase)
Uses `.env.production`:
```
VITE_API_URL=/api
```

The production setup uses relative paths because Firebase Hosting rewrites `/api/**` requests to your Cloud Function.

## Troubleshooting

### Functions Not Working

1. Check function logs:
   ```bash
   firebase functions:log
   ```

2. Verify Eventbrite token is set:
   ```bash
   firebase functions:config:get
   ```

3. Check the health endpoint:
   ```bash
   curl https://your-project-id.web.app/api/health
   ```

### CORS Issues

The Cloud Function is configured with CORS enabled. If you still see CORS errors:
1. Check browser console for specific error
2. Verify the function is deployed successfully
3. Try clearing browser cache

### Build Errors

If `npm run build` fails:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install`
3. Try building again

### Data Not Showing

1. Check browser console for errors
2. Verify Eventbrite token is valid
3. Check that event IDs in `functions/index.js` are correct
4. View function logs: `firebase functions:log`

## Cost Considerations

Firebase offers a generous free tier:
- **Hosting**: 10 GB storage, 360 MB/day data transfer
- **Cloud Functions**: 2M invocations/month, 400K GB-seconds/month

For this project, you should stay within the free tier unless you have very high traffic.

## Custom Domain (Optional)

To use a custom domain:

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow the verification steps
4. Add the DNS records to your domain registrar

## Security

### Protect Your Tokens
- Never commit `.env` files with real tokens
- Use Firebase environment config for secrets
- The Eventbrite token is stored server-side only

### Firebase Security Rules
Since you're only using Hosting and Functions (not Firestore/Database), no additional security rules are needed.

## Continuous Deployment (Optional)

For automatic deployments:

1. **GitHub Actions**: Create `.github/workflows/deploy.yml`
2. **Firebase Hosting GitHub Integration**: Set up in Firebase Console

Example GitHub Action:
```yaml
name: Deploy to Firebase
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
```

## Monitoring

Monitor your deployment:
- **Firebase Console**: https://console.firebase.google.com
- **Function logs**: `firebase functions:log`
- **Usage metrics**: Available in Firebase Console

## Support

For Firebase-specific issues:
- Firebase Documentation: https://firebase.google.com/docs
- Firebase Support: https://firebase.google.com/support

