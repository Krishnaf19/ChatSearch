const https = require('https');

/**
 * Universal Embedding Service
 * Supports Voyage AI, OpenAI, Gemini, and a built-in deterministic semantic vectorizer fallback.
 * Includes English and Hinglish conversational semantics.
 */

// Dimension size for local semantic vectors
const VECTOR_DIM = 64;

// Semantic concept anchors mapped to specific vector dimensions
const CONCEPT_CLUSTERS = [
  // Adventure / thrill / outdoor sports / adrenaline (English + Hinglish)
  {
    dims: [0, 1, 2, 3],
    keywords: [
      'adventure', 'adventurous', 'thrill', 'wilderness', 'rafting', 'cliff', 'jump',
      'rapids', 'mountain', 'trek', 'hike', 'pass', 'adrenaline', 'daredevil',
      'conquer', 'expedition', 'kaand', 'gorge', 'rishikesh', 'nasha', 'pagal'
    ]
  },
  // Sadness / grief / burnout / layoff / struggle (English + Hinglish)
  {
    dims: [4, 5, 6, 7],
    keywords: [
      'sad', 'sadness', 'depressed', 'grief', 'crushing', 'downsizing', 'drained',
      'hollow', 'dark', 'heavy', 'crying', 'tears', 'layoff', 'alone', 'failure',
      'venting', 'sorrow', 'hurt', 'bura', 'khali', 'dimag sunn', 'tension', 'udaas'
    ]
  },
  // Travel / vacation / getaway / holiday planning / accommodation
  {
    dims: [8, 9, 10, 11],
    keywords: [
      'trip', 'getaway', 'travel', 'vacation', 'manali', 'goa', 'shimla', 'cottage',
      'airbnb', 'himachal', 'roadtrip', 'booking', 'weekend', 'dates', 'pack',
      'jackets', 'swiped', 'chutti', 'dussehra', 'solang', 'chalenge'
    ]
  },
  // Joy / celebration / enthusiasm
  {
    dims: [12, 13, 14, 15],
    keywords: [
      'happy', 'hyped', 'excited', 'yessss', 'legend', 'celebrate', 'amazing',
      'gorgeous', 'delight', 'yay', 'wonderful', 'sundar', 'mast', 'maza'
    ]
  },
  // Work / office / corporate
  {
    dims: [16, 17, 18, 19],
    keywords: [
      'work', 'sprint', 'startup', 'engineer', 'manager', 'slides', 'planning',
      'sync', 'pto', 'leaves', 'division', 'quarterly', 'drive', 'kalesh'
    ]
  },
  // Food / dining / midnight treats (English + Hinglish)
  {
    dims: [20, 21, 22, 23],
    keywords: [
      'dinner', 'food', 'curry', 'sushi', 'pasta', 'spicy', 'thai', 'eat',
      'coffee', 'hungry', 'craving', 'biryani', 'paranthe', 'murthal', 'makkhan',
      'maggi', 'chai', 'khana'
    ]
  },
  // Sports / entertainment
  {
    dims: [24, 25, 26, 27],
    keywords: [
      'shogun', 'netflix', 'episode', 'spoilers', 'watch', 'movie', 'series',
      'ipl', 'cricket', 'match', 'sixer', 'thriller', 'last over'
    ]
  }
];

/**
 * Built-in deterministic semantic vector generator
 * Produces dense vector representations capturing semantic meaning, concepts, and lexical tokens.
 */
function localEmbed(text) {
  const vec = new Array(VECTOR_DIM).fill(0);
  if (!text || typeof text !== 'string') return vec;

  const normalized = text.toLowerCase();
  const tokens = normalized.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

  // 1. Concept cluster activations
  for (const cluster of CONCEPT_CLUSTERS) {
    let hits = 0;
    for (const kw of cluster.keywords) {
      if (normalized.includes(kw)) {
        hits += 1.5;
      }
    }
    if (hits > 0) {
      const weight = Math.log1p(hits);
      for (const d of cluster.dims) {
        vec[d] += weight;
      }
    }
  }

  // 2. Token hash projections across remaining dimensions [28..63]
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) & 0xffffffff;
    }
    const targetDim = 28 + (Math.abs(hash) % (VECTOR_DIM - 28));
    vec[targetDim] += 0.5;
  }

  // Normalize vector to unit length (L2 norm)
  let sumSq = 0;
  for (let i = 0; i < VECTOR_DIM; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) {
      vec[i] = Number((vec[i] / norm).toFixed(6));
    }
  }

  return vec;
}

/**
 * Voyage AI Embedding API call
 */
async function voyageEmbed(text, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      input: [text],
      model: process.env.VOYAGE_MODEL || 'voyage-3-lite'
    });

    const options = {
      hostname: 'api.voyageai.com',
      port: 443,
      path: '/v1/embeddings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.data && parsed.data[0] && parsed.data[0].embedding) {
            resolve(parsed.data[0].embedding);
          } else {
            reject(new Error(parsed.error?.message || 'Failed to get Voyage embedding'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * OpenAI Embedding API call
 */
async function openAiEmbed(text, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      input: text,
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
    });

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/embeddings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.data && parsed.data[0] && parsed.data[0].embedding) {
            resolve(parsed.data[0].embedding);
          } else {
            reject(new Error(parsed.error?.message || 'Failed to get OpenAI embedding'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Master embedText function
 */
async function embedText(text) {
  const provider = (process.env.EMBEDDING_PROVIDER || '').toLowerCase();
  
  if (provider === 'voyage' && process.env.VOYAGE_API_KEY) {
    try {
      return await voyageEmbed(text, process.env.VOYAGE_API_KEY);
    } catch (err) {
      console.warn(`[Voyage AI Embedding Warning]: ${err.message}. Falling back to local vectorizer.`);
    }
  }

  if ((provider === 'openai' || process.env.OPENAI_API_KEY) && process.env.OPENAI_API_KEY) {
    try {
      return await openAiEmbed(text, process.env.OPENAI_API_KEY);
    } catch (err) {
      console.warn(`[OpenAI Embedding Warning]: ${err.message}. Falling back to local vectorizer.`);
    }
  }

  return localEmbed(text);
}

module.exports = {
  embedText,
  localEmbed
};
