# 💬 searchChat

> **Intelligent Two-Tier Search, Historical "On This Day" Highlights & Topic Analytics for Group Chats.**

`searchChat` is an end-to-end conversation intelligence platform designed to make group chat histories searchable, memorable, and insightful. It bridges the gap between literal keyword search and human memory by combining exact text matching, emotion and topic tagging, semantic embedding similarity, nostalgic milestone throwbacks, and interactive topic leaderboards.

---

## 🌟 Key Highlights & Capabilities

### 🔍 1. Two-Tier Retrieval Engine
- **Tier 1 (High-Precision Keyword & Tag Match)**: Matches queries directly against message text, participant names, and pre-extracted emotional/topic tags (e.g., `"when did we decide on Manali"`, `"my sad talk with rahul"`).
- **Tier 2 (Semantic & Tone Similarity Fallback)**: Automatically activates when literal keywords are insufficient, leveraging cosine similarity across high-dimensional semantic embeddings to retrieve tone, vibe, and conceptual matches (e.g., `"my adventurous talks with rahul"`).
- **Context Window Expansion**: Returns the focal matching message alongside surrounding conversation threads (2 messages before and after) so users always have the complete conversational context.

### 📅 2. Group Highlights & "On This Day" Memories
- **Nostalgic Flashbacks**: Resurface conversations and decisions that happened exactly a year ago, 6 months ago, or on matching calendar dates.
- **Curated Group Milestones**: Auto-identifies landmark moments like trip agreements, emotional support brotherhood threads, thrilling adventure jumps, and spontaneous late-night food runs.
- **Interactive Calendar Filter**: Browse historical milestones by date or explore the all-time group highlight reel with expandable full-thread previews.

### 🏆 3. Most Active Topics Leaderboard
- **Subject Categorization**: Tracks and ranks the top subjects discussed across the chat history—including **Adventure**, **Travel & Trips**, **Work-Venting & Support**, **Food & Late-Night Drives**, and **Sports**.
- **Topic Analytics**: Displays message volume, percentage share of total group conversations, and dominant emotional vibe per topic.
- **Speaker Contribution Matrix**: Highlights who dominates each topic (e.g., Top Contributor: Rahul for Adventure, Rohan for Travel) and breaks down each member's personal conversation profile.
- **Click-to-Explore**: Seamlessly jump from any topic or member profile straight into filtered search results.

---

## 🏗️ Architecture & Pipeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                        searchChat Architecture                         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
   ┌───────────────┐                                 ┌───────────────┐
   │  Raw Chats    │ (JSON Export)                   │ User Query    │
   └───────┬───────┘                                 └───────┬───────┘
           │                                                 │
           ▼ (Ingestion Pipeline)                            ▼
   ┌────────────────────────────────┐                ┌───────────────┐
   │ • Emotion & Topic Tagger       │                │ Two-Tier      │
   │ • Embedding Vector Generator   │                │ Search Router │
   │ • Flat-file Storage Persistence│                └───────┬───────┘
   └───────┬────────────────────────┘                        │
           │                                      ┌──────────┴──────────┐
           ▼                                      ▼                     ▼
┌───────────────────────┐                  ┌─────────────┐       ┌─────────────┐
│ Processed Index Store │                  │ Tier 1:     │       │ Tier 2:     │
│ • messages.json       │ ───────────────► │ Keyword &   │       │ Semantic &  │
│ • embeddings.json     │                  │ Tag Match   │       │ Cosine Sim  │
└───────────────────────┘                  └─────────────┘       └─────────────┘
           │                                      │                     │
           │                                      └──────────┬──────────┘
           │                                                 ▼
           │                                    ┌────────────────────────┐
           │                                    │ Context Thread Builder │
           │                                    │ (±2 Window Expansion)  │
           │                                    └────────────┬───────────┘
           │                                                 │
           ▼                                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 React + Redux Toolkit Modern Frontend                  │
│   • Search Explorer  • "On This Day" Memories  • Topics Leaderboard    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Redux Toolkit, Axios, Lucide React, Modern CSS3 |
| **Backend** | Node.js, Express, Morgan, Dotenv, CORS |
| **Data & Storage** | JSON-based storage (`chat_export.json`, `messages.json`, `message_embeddings.json`) |
| **NLP & Search** | Two-tier heuristic tagger, TF-IDF / Substring matching, Vector Cosine Similarity |

---

## 📁 Repository Structure

```bash
searchChat/
├── backend/
│   ├── data/
│   │   ├── raw/
│   │   │   └── chat_export.json           # Raw source chat exports
│   │   ├── processed/
│   │   │   └── messages.json              # Tagged and normalized messages
│   │   └── embeddings/
│   │       └── message_embeddings.json    # Vector embeddings map
│   ├── src/
│   │   ├── routes/
│   │   │   ├── ingest.js                  # Ingestion & re-indexing route
│   │   │   ├── search.js                  # Two-tier search route
│   │   │   ├── memories.js                # "On This Day" & highlights route
│   │   │   ├── leaderboard.js             # Most active topics leaderboard route
│   │   │   └── status.js                  # System health & metadata route
│   │   ├── services/
│   │   │   ├── embeddings.js              # Vector embedding provider
│   │   │   ├── searchEngine.js            # Two-tier query matching logic
│   │   │   ├── tagger.js                  # Rule-based & LLM emotion/topic tagger
│   │   │   ├── memoriesService.js         # Memory calculation & milestone extractor
│   │   │   └── leaderboardService.js      # Topic & member aggregation analytics
│   │   ├── utils/
│   │   │   └── similarity.js              # Cosine similarity vector utility
│   │   └── server.js                      # Express API server entry point
│   ├── test-demo.js                       # End-to-end demo test suite
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── search/                    # Search dashboard, query bar & results
│   │   │   │   ├── SearchPage.jsx
│   │   │   │   └── searchSlice.js
│   │   │   ├── memories/                  # "On This Day" & highlight cards
│   │   │   │   └── MemoriesPage.jsx
│   │   │   └── leaderboard/               # Ranked subjects & member analytics
│   │   │       └── LeaderboardPage.jsx
│   │   ├── App.css                        # Design system & responsive styles
│   │   ├── App.jsx                        # Root React layout
│   │   ├── main.jsx                       # React DOM entry
│   │   └── store.js                       # Redux store configuration
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── package.json                           # Root monorepo script runner
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later

### 1. Installation
Install all dependencies across both frontend and backend in one command:

```bash
npm run install:all
```

### 2. Launch Development Servers

#### Option A: Run Backend & Frontend Separately
```bash
# Terminal 1: Start Backend API (Port 5000)
npm run dev:backend

# Terminal 2: Start Frontend UI (Port 5173)
npm run dev:frontend
```

#### Option B: Run Monorepo Dev Command
```bash
npm run dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🧪 Testing & Verification

Run the automated end-to-end verification script to validate data ingestion and the three canonical search scenarios:

```bash
npm run demo
```

### Verified Benchmark Scenarios:
1. **`"when did we decide on Manali"`** ➔ Evaluates **Tier 1 (Keyword Search)** and extracts decision dates.
2. **`"my sad talk with rahul"`** ➔ Evaluates **Tier 1 (Person Filter + Emotion Tag)**.
3. **`"my adventurous talks with rahul"`** ➔ Evaluates **Tier 2 (Semantic Tone Fallback)** via cosine similarity.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/search` | Execute two-tier search with body `{ "query": "..." }` |
| `GET` | `/api/memories` | Fetch "On This Day" memories and curated milestones (`?date=YYYY-MM-DD`) |
| `GET` | `/api/leaderboard` | Fetch most active topics, member contributions, and emotion stats |
| `POST` | `/api/ingest` | Trigger full chat re-ingestion, tagging, and embedding indexing |
| `GET` | `/api/status` | Get system status, message counts, senders, and active provider |
| `GET` | `/api/messages` | Retrieve all processed messages with tags |

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in `backend/` if you want to customize embedding or tagging providers:

```env
PORT=5000
EMBEDDING_PROVIDER=local-semantic

# Optional: Claude API key for enhanced zero-shot tagging (rule-based fallback used by default)
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

---

## 📄 License

This project is open source and available under the [ISC License](LICENSE).
