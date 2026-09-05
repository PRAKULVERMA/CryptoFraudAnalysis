<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# ChainTrace AI - Blockchain Intelligence

Tracing Illicit Funds. Identifying Exchange Destinations.

## Project Structure

```
chaintrace-ai---blockchain-intelligence (1)/
├── frontend/                 ← React + Vite frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── backend/                  ← Express backend API
│   ├── server.js
│   ├── routes/
│   ├── services/
│   ├── package.json
│   └── .env.example
├── metadata.json
├── .gitignore
└── README.md
```

## Run Locally

**Prerequisites:** Node.js

### 1. Install Frontend Dependencies
```
cd frontend
npm install
```

### 2. Install Backend Dependencies
```
cd backend
npm install
```

### 3. Configure Environment
Copy `backend/.env.example` to `backend/.env` and set your `GEMINI_API_KEY`.

### 4. Start Backend
```
cd backend
npm start
```

### 5. Start Frontend (in a new terminal)
```
cd frontend
npm run dev
```

Open http://localhost:3000
