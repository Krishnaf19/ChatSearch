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
    name: 'adventure',
    dims: [0, 1, 2, 3],
    keywords: [
      'adventure', 'adventurous', 'thrill', 'thrilling', 'thriller', 'wilderness', 'rafting', 'raft',
      'cliff', 'jump', 'jumping', 'jumped', 'rapids', 'mountain', 'mountains', 'trek', 'trekking',
      'hike', 'hiking', 'pass', 'adrenaline', 'daredevil', 'conquer', 'expedition', 'kaand', 'gorge',
      'rishikesh', 'nasha', 'pagal', 'glacier', 'glacial', 'meltwater', 'whirlpool', 'whirlpools', 'outdoor'
    ]
  },
  // Sadness / grief / burnout / layoff / struggle / emotional venting (English + Hinglish)
  {
    name: 'sadness',
    dims: [4, 5, 6, 7],
    keywords: [
      'sad', 'sadness', 'depressed', 'depression', 'grief', 'crushing', 'downsizing', 'drained',
      'hollow', 'dark', 'heavy', 'crying', 'tears', 'layoff', 'layoffs', 'alone', 'failure',
      'venting', 'sorrow', 'hurt', 'bura', 'khali', 'dimag sunn', 'tension', 'udaas', 'exhausted',
      'exhausting', 'burnout', 'burned out', 'stress', 'struggle', 'devastating', 'shaky',
      'emotional', 'emotion', 'emotions', 'feeling', 'feelings', 'vulnerable', 'heartfelt',
      'deep', 'serious', 'sentimental', 'heartbreak', 'broken', 'cry', 'weep', 'dil se',
      'ro raha tha', 'ro diya', 'low feel', 'dard', 'pain', 'tough times', 'hard times', 'struggling',
      'heart to heart', 'heart-to-heart', 'so sad', 'very sad', 'bad day'
    ]
  },
  // Travel / vacation / getaway / holiday planning / accommodation
  {
    name: 'travel',
    dims: [8, 9, 10, 11],
    keywords: [
      'trip', 'getaway', 'travel', 'travelling', 'vacation', 'manali', 'goa', 'shimla', 'cottage',
      'airbnb', 'himachal', 'roadtrip', 'booking', 'booked', 'weekend', 'dates', 'pack', 'packing',
      'jackets', 'swiped', 'chutti', 'dussehra', 'solang', 'chalenge', 'valley', 'holiday', 'orchard'
    ]
  },
  // Joy / celebration / enthusiasm
  {
    name: 'joy',
    dims: [12, 13, 14, 15],
    keywords: [
      'happy', 'hyped', 'excited', 'excitement', 'yessss', 'legend', 'celebrate', 'celebrating',
      'celebration', 'amazing', 'gorgeous', 'delight', 'yay', 'wonderful', 'sundar', 'mast', 'maza',
      'loving', 'love', 'fun', 'funny', 'comedy', 'cheerful', 'positive', 'laughing', 'laughter'
    ]
  },
  // Work / office / corporate
  {
    name: 'work',
    dims: [16, 17, 18, 19],
    keywords: [
      'work', 'sprint', 'startup', 'engineer', 'manager', 'slides', 'planning', 'sync', 'pto',
      'leaves', 'division', 'quarterly', 'drive', 'kalesh', 'presentation', 'presentations', 'deadline', 'product',
      'stress', 'work stress', 'pressure', 'late night project', 'exhaustion'
    ]
  },
  // Food / dining / midnight treats (English + Hinglish)
  {
    name: 'food',
    dims: [20, 21, 22, 23],
    keywords: [
      'dinner', 'food', 'curry', 'sushi', 'pasta', 'spicy', 'thai', 'eat', 'eating', 'coffee',
      'hungry', 'craving', 'biryani', 'paranthe', 'murthal', 'makkhan', 'butter', 'maggi', 'chai',
      'tea', 'khana', 'kulhad'
    ]
  },
  // Sports / entertainment
  {
    name: 'sports',
    dims: [24, 25, 26, 27],
    keywords: [
      'shogun', 'netflix', 'episode', 'spoilers', 'watch', 'watching', 'movie', 'series', 'ipl',
      'cricket', 'match', 'sixer', 'six', 'runs', 'balls', 'wickets', 'thriller', 'last over'
    ]
  },
  // Gratitude / friendship / support
  {
    name: 'support',
    dims: [28, 29, 30, 31],
    keywords: [
      'shukriya', 'thanks', 'thank', 'brother', 'friend', 'appreciate', 'grateful', 'support', 'together',
      'emotional', 'heartfelt', 'dil se', 'bond', 'meaningful', 'care', 'caring', 'help', 'true friend',
      'heart to heart', 'heart-to-heart', 'supportive', 'comfort', 'sympathy', 'understanding'
    ]
  }
];

// Emoji mappings to concepts for edge-case query handling
const EMOJI_MAP = {
  '🏔️': 'mountain adventure',
  '🏔': 'mountain adventure',
  '🧗': 'climbing adventure trek',
  '🚣': 'rafting adventure rapids',
  '🏕️': 'camping wilderness outdoor',
  '🏕': 'camping wilderness outdoor',
  '💔': 'heartbreak sad sadness grief',
  '😭': 'crying tears sad depressed',
  '😢': 'sad sorrow weeping',
  '😞': 'sad down disappointed',
  '🍕': 'pizza food dinner craving',
  '🍔': 'burger food eat craving',
  '☕': 'chai coffee tea late night',
  '🍛': 'curry biryani food dinner',
  '✈️': 'trip travel vacation getaway flight',
  '✈': 'trip travel vacation getaway flight',
  '🚗': 'roadtrip drive getaway',
  '🏖️': 'beach goa vacation holiday getaway',
  '🏖': 'beach goa vacation holiday getaway',
  '🎉': 'party celebrate happy joy',
  '🥳': 'celebrate excited happy joy',
  '🔥': 'hyped excited amazing insane',
  '🏏': 'cricket ipl match sports',
  '⚽': 'sports match game football',
  '💼': 'work office sprint planning',
  '💻': 'work code engineer software'
};

const STOP_WORDS_SET = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'did', 'do', 'does', 'doing',
  'down', 'during', 'each', 'few', 'for', 'from', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'him', 'his', 'how', 'i', 'if',
  'in', 'into', 'is', 'it', 'its', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'our', 'ours', 'out', 'over', 'own', 'same', 'she', 'should', 'so',
  'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
  'while', 'who', 'whom', 'why', 'with', 'you', 'your', 'yours',
  'ke', 'sath', 'saath', 'se', 'ka', 'ki', 'ko', 'mein', 'me', 'pe', 'par',
  'hai', 'hain', 'tha', 'the', 'thi', 'bhai', 'yaar', 'kab', 'kya', 'kaise',
  'kaha', 'kahan', 'aur', 'hum', 'meri', 'mera', 'mere', 'apna', 'apne',
  'baat', 'baatein', 'wale', 'wali', 'karein', 'karo', 'hua', 'hui', 'thaa',
  'bhi', 'toh', 'to', 'ho', 'gaya', 'gayi', 'gaye', 'kisne', 'kisko', 'woh', 'yeh'
]);

function escapeRegex(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Built-in deterministic semantic vector generator
 * Produces dense vector representations capturing semantic meaning, concepts, and lexical tokens.
 * Uses exact word-boundary matching to prevent false positives from substring collisions.
 */
function localEmbed(text) {
  const vec = new Array(VECTOR_DIM).fill(0);
  if (!text || typeof text !== 'string') return vec;

  // Expand emojis into semantic concept words
  let expanded = text;
  for (const [emoji, meaning] of Object.entries(EMOJI_MAP)) {
    if (expanded.includes(emoji)) {
      expanded = expanded.split(emoji).join(' ' + meaning + ' ');
    }
  }

  const normalized = expanded.toLowerCase();
  const tokens = normalized.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const tokenSet = new Set(tokens);

  // 1. Concept cluster activations with whole word boundaries
  for (const cluster of CONCEPT_CLUSTERS) {
    let hits = 0;
    for (const kw of cluster.keywords) {
      if (kw.includes(' ')) {
        const regex = new RegExp('\\b' + escapeRegex(kw) + '\\b', 'i');
        if (regex.test(normalized)) hits += 1.5;
      } else {
        if (tokenSet.has(kw)) hits += 1.5;
      }
    }
    if (hits > 0) {
      const weight = Math.log1p(hits);
      for (const d of cluster.dims) {
        vec[d] += weight;
      }
    }
  }

  // 2. Lexical word overlap via signed hashing on meaningful content tokens
  for (const token of tokens) {
    if (STOP_WORDS_SET.has(token) || token.length < 3) continue;
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) & 0xffffffff;
    }
    const targetDim = 32 + (Math.abs(hash) % (VECTOR_DIM - 32));
    const sign = (hash & 1) ? 1 : -1;
    vec[targetDim] += sign * 0.4;
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
 * Returns true if the current configuration uses the local deterministic vectorizer
 * (i.e., no external API key is configured). Used by the search engine to pick
 * appropriate similarity thresholds.
 */
function isLocalProvider() {
  const provider = (process.env.EMBEDDING_PROVIDER || '').toLowerCase();
  if (provider === 'voyage' && process.env.VOYAGE_API_KEY) return false;
  if ((provider === 'openai' || process.env.OPENAI_API_KEY) && process.env.OPENAI_API_KEY) return false;
  return true;
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
  localEmbed,
  isLocalProvider
};
