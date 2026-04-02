# SignWorld — Deployment Guide

## Project structure

```
signworld/
├── api/
│   └── chat.js          ← Vercel serverless function (proxies Anthropic)
├── public/
│   └── index.html       ← Your full frontend app
├── vercel.json          ← Routing config
├── package.json
└── README.md
```

---

## Deploy to Vercel (step by step)

### 1. Get an Anthropic API key
Go to https://console.anthropic.com → API Keys → Create key
Copy it somewhere safe.

### 2. Install Vercel CLI
```bash
npm install -g vercel
```

### 3. Login to Vercel
```bash
vercel login
```

### 4. Deploy
Run this inside the `signworld/` folder:
```bash
vercel
```
Follow the prompts:
- Set up a new project? → **Y**
- What's the project name? → **signworld** (or anything)
- Which directory is your code? → **.** (current folder)

### 5. Add your API key (IMPORTANT)
After deploy, go to:
**Vercel Dashboard → Your Project → Settings → Environment Variables**

Add:
| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...your key here...` |

Then redeploy:
```bash
vercel --prod
```

### 6. Done 🎉
Your site is live at `https://signworld-xxx.vercel.app`

---

## How it works

```
User types in chat
    ↓
Frontend sends POST to /api/chat
    ↓
Vercel serverless function (api/chat.js)
    ↓
Calls Anthropic API with your secret key
    ↓
Returns response to frontend
    ↓
User sees AI tutor reply
```

Your API key **never touches the browser**. ✅

---

## Local development

```bash
npm install
vercel dev
```

Then open http://localhost:3000

---

## Lock down CORS (before launch)

In `api/chat.js`, change:
```js
res.setHeader('Access-Control-Allow-Origin', '*');
```
to your real domain:
```js
res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com');
```
