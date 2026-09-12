# searchChat — Two-Tier Group Chat Search Engine

A search system built specifically for large group chats where traditional keyword search (Ctrl+F or SQL LIKE queries) fails:
1. **Factual/Decision Questions** (*"When did we decide on Manali?"*) — where the resolution is negotiated across a multi-message back-and-forth, and the destination name isn't even repeated at the moment agreement is reached.
2. **Emotional/Tone Questions** (*"My sad conversation with Rahul"* or *"Our adventurous talks"*) — where nobody typed the literal word "sad" or "adventurous", and the feeling is implicit.

---

## 💡 The Two-Tier Strategy

```
Query comes in
   │
   ▼
Extract person name (if mentioned) → hard filter
   │
   ▼
TIER 1: Keyword search on filtered candidates (Text, Topic, Emotion tags)
   │
   ├── Found matches? ──► [RETURN: 🔍 Keyword Match] (Fast, exact, cheap)
   │
   └── Found nothing? 
          │
          ▼
       TIER 2: Semantic / Tone search (Embeddings + Cosine similarity)
          │
          └──► [RETURN: 🎯 Tone / Semantic Match] (Meaning-based)
                 │
                 ▼
              expandContext() (+/- 5 messages surrounding match)
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Redux Toolkit, React-Redux, Axios, Lucide Icons, Plain CSS
- **Backend**: Node.js, Express.js, CORS, Morgan, Dotenv
- **Data Layer**: Flat JSON files (`data/raw/`, `data/processed/`, `data/embeddings/`)
- **Embeddings & Tagging**:
  - Zero-config built-in deterministic semantic vectorizer fallback (works 100% offline out-of-the-box!)
  - Pluggable support for **Voyage AI**, **OpenAI**, and **Anthropic Claude** / **Gemini** via `.env`.
- **Similarity**: Hand-written Cosine Similarity (~10 lines).

---

## 🚀 Quick Start

### 1. Install Dependencies

In the root directory:
```bash
npm run install:all
```
*(Or run `npm install` inside both `backend` and `frontend`)*

### 2. Run the Automated Demo Script

Verify all 3 canonical scenarios instantly without touching a browser:
```bash
npm run demo
```
This runs `backend/test-demo.js`:
- Ingests the sample group chat (`data/raw/chat_export.json`)
- Runs Query 1: `"when did we decide on Manali"` ➔ Hits **Tier 1 (Keyword)** & returns the entire cottage booking thread
- Runs Query 2: `"my sad talk with rahul"` ➔ Filters to **Rahul**, hits **Tier 1 (Emotion Tag: sadness)** & returns the career venting thread
- Runs Query 3: `"my adventurous talks with rahul"` ➔ Filters to **Rahul**, misses Tier 1, falls through to **Tier 2 (Semantic / Tone)** & returns the cliff jumping & grade-4 rapids thread

### 3. Run the Development Servers

Start Backend (Port 5000):
```bash
npm run dev:backend
```

Start Frontend (Port 5173):
```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Configuration & Environment Variables

Copy `backend/.env.example` to `backend/.env` to configure external providers if desired:

```env
PORT=5000

# Provider: local (default, zero-config), voyage, or openai
EMBEDDING_PROVIDER=local

# Voyage AI
# VOYAGE_API_KEY=your_key_here
# VOYAGE_MODEL=voyage-3-lite

# OpenAI
# OPENAI_API_KEY=your_key_here
# OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Anthropic Claude (for LLM ingestion tagging)
# ANTHROPIC_API_KEY=your_claude_key
```

When no API key is specified, `searchChat` automatically uses its built-in semantic vectorizer and high-precision lexicon tagger so everything works out of the box.

---

## 📂 Project Structure

```
searchChat/
├── backend/
│   ├── data/
│   │   ├── raw/
│   │   │   └── chat_export.json         # Raw chat messages
│   │   ├── processed/
│   │   │   └── messages.json            # Tagged with emotion & topic
│   │   └── embeddings/
│   │       └── message_embeddings.json  # Precomputed vector embeddings
│   ├── src/
│   │   ├── routes/
│   │   │   ├── ingest.js                # POST /api/ingest
│   │   │   ├── search.js                # POST /api/search
│   │   │   └── status.js                # GET /api/status, GET /api/messages
│   │   ├── services/
│   │   │   ├── embeddings.js            # Voyage / OpenAI / local vectorizer
│   │   │   ├── searchEngine.js          # Two-tier pipeline + person + context expansion
│   │   │   └── tagger.js                # Emotion and topic tagger
│   │   ├── utils/
│   │   │   └── similarity.js            # Hand-written cosine similarity (~10 lines)
│   │   └── server.js                    # Express app
│   ├── test-demo.js                     # End-to-end automated verification script
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   └── search/
│   │   │       ├── searchSlice.js       # Redux Toolkit state lifecycle
│   │   │       └── SearchPage.jsx       # UI with badges, search bar, & context thread
│   │   ├── App.css                      # Modern responsive styling
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── store.js                     # Redux store
│   ├── package.json
│   └── vite.config.js
├── package.json                         # Root workspace scripts
└── README.md
```
