# 🚀 Universal CRM - GitHub Actions Auto-Deploy

## Setup Instructions

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `universal-crm` (or any name)
3. Make it **Public** or **Private**
4. Click **Create repository**

### Step 2: Upload These Files
Upload all files from this folder to your GitHub repo:
- `index.html`
- `assets/` folder
- `.github/workflows/firebase-deploy.yml`
- `firebase.json`
- `404.html` (if exists)

**Quick way:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/universal-crm.git
git push -u origin main
```

### Step 3: Add Firebase Service Account Secret

1. **Get Service Account Key:**
   - Go to https://console.firebase.google.com/project/wasi-app-1/settings/serviceaccounts/adminsdk
   - Click "Generate new private key"
   - Download the JSON file

2. **Add to GitHub Secrets:**
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `FIREBASE_SERVICE_ACCOUNT_WASI_APP_1`
   - Value: Paste the entire content of the downloaded JSON file
   - Click "Add secret"

### Step 4: Enable GitHub Actions
1. Go to your repo → Actions tab
2. Click "I understand my workflows, go ahead and enable them"

### Step 5: Trigger Deploy
- Push any change to the `main` branch
- OR go to Actions → Deploy to Firebase Hosting → Run workflow

---

## 🎉 After Setup

Every time you push to `main` branch, auto-deploy hoga!

**Live URL:** https://wasi-app-1.web.app/

**Demo Login:**
- Email: demo@emerald.com
- Password: demo123

---

## 🔑 Demo Login Already Configured

The `index.html` has demo login script injected. It will work immediately after deploy!

---

## 📁 Files to Upload

```
universal-crm/
├── .github/
│   └── workflows/
│       └── firebase-deploy.yml
├── assets/
│   ├── index-XXXX.js
│   ├── index-XXXX.css
│   └── ... (all asset files)
├── index.html
├── firebase.json
└── 404.html
```

---

## 🆘 Troubleshooting

**Error: "Failed to get Firebase project"**
- Make sure service account has "Firebase Hosting Admin" role
- Go to Firebase Console → Project Settings → Service Accounts → Click "Generate new private key"

**Error: "Permission denied"**
- Make sure the secret name is exactly: `FIREBASE_SERVICE_ACCOUNT_WASI_APP_1`

---

**Done! 🚀**
