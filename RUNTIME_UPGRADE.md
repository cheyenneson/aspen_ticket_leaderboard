# Firebase Functions Runtime Upgrade Guide

## Current Runtime: Node.js 20

Your project has been configured to use Node.js 20, which is the recommended LTS version.

## Available Runtimes

Firebase Cloud Functions supports:
- **Node.js 18** (Active LTS)
- **Node.js 20** (Active LTS) ✅ **Recommended**
- **Node.js 22** (Current)

## How to Upgrade Runtime

### 1. Update `functions/package.json`

Change the engines field:
```json
{
  "engines": {
    "node": "20"  // or "22" for latest
  }
}
```

### 2. Update `firebase.json`

Change the runtime field:
```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"  // or "nodejs22"
  }
}
```

### 3. Test Locally (Optional)

```bash
# Make sure you have the correct Node version installed
node --version  # Should match your runtime

# Test with Firebase emulators
firebase emulators:start
```

### 4. Deploy

```bash
firebase deploy --only functions
```

## Downgrading (if needed)

To downgrade to Node.js 18:

1. Change `functions/package.json` engines.node to `"18"`
2. Change `firebase.json` runtime to `"nodejs18"`
3. Redeploy: `firebase deploy --only functions`

## Runtime Support Timeline

- **Node.js 18**: Supported until April 2025
- **Node.js 20**: Supported until April 2026
- **Node.js 22**: Supported until April 2027

## Notes

- The runtime upgrade only affects Cloud Functions
- Your React app (Hosting) is not affected by this change
- No code changes needed - your current code is compatible with all supported runtimes
- Google automatically manages security patches for the runtime

## Troubleshooting

If deployment fails after upgrade:

1. **Check Node version compatibility:**
   ```bash
   cd functions
   npm install
   ```

2. **Clear Firebase cache:**
   ```bash
   firebase functions:delete api
   firebase deploy --only functions
   ```

3. **Check function logs:**
   ```bash
   firebase functions:log
   ```

## Verification

After deployment, verify your runtime:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Functions**
4. Check the runtime version listed for your `api` function

