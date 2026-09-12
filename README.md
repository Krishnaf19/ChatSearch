# searchChat

A modern search dashboard for group chat history, designed to find the right conversation quickly even when the exact words are not repeated verbatim.

This project combines a lightweight two-tier retrieval pipeline with a clean frontend interface. It is useful for searching across decisions, emotional moments, travel plans, and context-heavy discussions that are spread across multiple messages.

---

## Overview

Group chat search is often harder than it looks because users do not always search by exact phrasing. They may ask things like:

- "When did we decide on Manali?"
- "Our sad conversation with Rahul"
- "Adventurous talks from the trip"

Traditional keyword-only matching often misses these requests. This app solves that by combining:

1. Exact text and tag-based matching
2. Semantic similarity matching for tone and meaning
3. Context expansion so users can see the surrounding conversation thread

---

## Features

- Fast keyword-first search for literal matches and topic/emotion clues
- Semantic fallback for meaning-based queries
- Person-aware filtering when a name is mentioned in the query
- Context window expansion around the matched message
- Friendly dashboard UI for exploring results and browsing messages
- Local-first setup with optional integrations for external embedding providers

---

## Mocked vs Real Data

This repository includes a demo dataset to make the app easy to run and understand without needing a production chat export.

- Mocked/demo data: `backend/data/raw/chat_export.json`
- Mocked sample indexing: `backend/data/processed/messages.json`
- Mocked embeddings: `backend/data/embeddings/message_embeddings.json`
- Real app flow: the backend also supports ingesting live chat data via the `/api/ingest` route and then searching it through the same pipeline

In other words, the sample dataset is intended for local demos, while the application architecture is designed to work with real exported conversations in the same format.

---

## Tech Stack

- Frontend: React, Vite, Redux Toolkit, Axios, Lucide Icons
- Backend: Node.js, Express
- Data: JSON-based chat export, processed message metadata, embeddings store
- Search: Keyword retrieval + cosine similarity for semantic matching

---

## Project Structure

```bash
searchChat/
├── backend/
│   ├── data/
│   │   ├── raw/
│   │   │   └── chat_export.json
│   │   ├── processed/
│   │   │   └── messages.json
│   │   └── embeddings/
│   │       └── message_embeddings.json
│   ├── src/
│   │   ├── routes/
│   │   │   ├── ingest.js
│   │   │   ├── search.js
│   │   │   └── status.js
│   │   ├── services/
│   │   │   ├── embeddings.js
│   │   │   ├── searchEngine.js
│   │   │   └── tagger.js
│   │   ├── utils/
│   │   │   └── similarity.js
│   │   └── server.js
│   ├── test-demo.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   └── search/
│   │   │       ├── SearchPage.jsx
│   │   │       └── searchSlice.js
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── store.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── package.json
├── README.md
└── .gitignore
```

---

## Getting Started

### 1. Install dependencies

From the project root:

```bash
npm run install:all
```

This installs both the frontend and backend packages.

### 2. Run the backend

```bash
npm run dev:backend
```

The backend serves the API on:

- http://localhost:5000

### 3. Run the frontend

```bash
npm run dev:frontend
```

The frontend runs on:

- http://localhost:5173

### 4. Run the demo script

```bash
npm run demo
```

This executes the backend demo flow and validates the main search scenarios against the mock sample chat dataset.

> The demo data is intentionally lightweight and representative. It is designed to showcase the search behavior clearly without requiring any external data source.

---

## Example Queries

The app is designed to answer questions like:

- Manali trip when was it decided?
- Rahul sad messages
- Adventurous talks with Rahul
- Weekend travel planning
- Work stress and late-night chat context

---

## Notes

- The app works locally without external services by default.
- Embedding integrations can be configured later if you want to replace the local default behavior with a cloud provider.
- The UI is intentionally simple and readable so it can be extended for production search workflows.

---

## License

This project is provided for learning and demonstration purposes.
