const path = require('path');
const fs = require('fs');
const { cosineSimilarity } = require('../utils/similarity');
const { embedText, isLocalProvider } = require('./embeddings');

const PROCESSED_DATA_PATH = path.join(__dirname, '../../data/processed/messages.json');
const EMBEDDINGS_DATA_PATH = path.join(__dirname, '../../data/embeddings/message_embeddings.json');

// Combined English and Hinglish Stop Words
const STOP_WORDS = new Set([
  // English
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
  'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
  'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
  'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'i\'d', 'i\'ll', 'i\'m',
  'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
  'let\'s', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off',
  'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'same', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'so',
  'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve',
  'were', 'weren\'t', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'with', 'won\'t', 'would', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve',
  'your', 'yours', 'yourself', 'yourselves', 'talk', 'talks', 'conversation', 'conversations',
  'tell', 'chat', 'chats', 'message', 'messages', 'decide', 'decided',

  // Hinglish common functional & filler particles
  'ke', 'sath', 'saath', 'se', 'ka', 'ki', 'ko', 'mein', 'me', 'pe', 'par',
  'hai', 'hain', 'tha', 'the', 'thi', 'bhai', 'yaar', 'kab', 'kya', 'kaise',
  'kaha', 'kahan', 'aur', 'hum', 'meri', 'mera', 'mere', 'apna', 'apne',
  'baat', 'baatein', 'wale', 'wali', 'karein', 'karo', 'hua', 'hui', 'thaa',
  'bhi', 'toh', 'to', 'ho', 'gaya', 'gayi', 'gaye', 'kisne', 'kisko', 'woh', 'yeh'
]);

/**
 * Loads processed messages from disk
 */
function getMessages() {
  if (!fs.existsSync(PROCESSED_DATA_PATH)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(PROCESSED_DATA_PATH, 'utf-8'));
}

/**
 * Loads embeddings from disk
 */
function getEmbeddings() {
  if (!fs.existsSync(EMBEDDINGS_DATA_PATH)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(EMBEDDINGS_DATA_PATH, 'utf-8'));
}

/**
 * Extracts person name from English or Hinglish query if present in known senders
 */
function extractPerson(query, knownSenders) {
  const clean = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = clean.split(/\s+/).filter(Boolean);

  for (const sender of knownSenders) {
    const sLower = sender.toLowerCase();
    
    // Check direct token match
    if (words.includes(sLower)) {
      return sender;
    }
    // Check English / Hinglish prepositional phrases
    if (
      clean.includes(`with ${sLower}`) ||
      clean.includes(`from ${sLower}`) ||
      clean.includes(`${sLower} ke sath`) ||
      clean.includes(`${sLower} ke saath`) ||
      clean.includes(`${sLower} se`) ||
      clean.includes(`${sLower} ki`) ||
      clean.includes(`${sLower} ka`) ||
      clean.includes(`${sLower} or`) ||
      clean.includes(`${sLower} and`)
    ) {
      return sender;
    }
  }
  return null;
}

/**
 * Extracts searchable keywords from query, removing punctuation, stop words, and sender names
 */
function extractKeywords(query, personName) {
  const clean = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = clean.split(/\s+/).filter(Boolean);

  const personLower = personName ? personName.toLowerCase() : null;

  return tokens.filter((t) => {
    if (personLower && t === personLower) return false;
    return !STOP_WORDS.has(t) && t.length > 1;
  });
}

/**
 * Expands context by getting windowSize messages before and after matched message index
 */
function expandContext(matchedId, allMessages, windowSize = 5) {
  const index = allMessages.findIndex((m) => m.id === matchedId);
  if (index === -1) return [];

  const start = Math.max(0, index - windowSize);
  const end = Math.min(allMessages.length, index + windowSize + 1);

  return allMessages.slice(start, end).map((msg) => ({
    ...msg,
    isTarget: msg.id === matchedId
  }));
}

/**
 * Executes Two-Tier Search Pipeline with calibrated relevance filters and edge case protection.
 * Options: { page = 1, limit = 0 }
 * If limit is 0 (or omitted), all valid matches are returned, and totalAvailable / hasMore are calculated.
 */
async function searchChat(query, options = {}) {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.max(0, parseInt(options.limit, 10) || 0);

  // Edge case 1: Empty, whitespace or too short queries
  if (!query || typeof query !== 'string' || !query.trim()) {
    return {
      query: '',
      tierUsed: 'none',
      badge: 'Invalid Query',
      personFilter: null,
      results: [],
      totalAvailable: 0,
      hasMore: false,
      message: 'Please enter a search query.'
    };
  }

  const trimmedQuery = query.trim().slice(0, 300);
  const hasEmoji = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(trimmedQuery);
  const alphanumericChars = trimmedQuery.replace(/[^a-zA-Z0-9]/g, '');

  if (alphanumericChars.length < 2 && !hasEmoji) {
    return {
      query: trimmedQuery,
      tierUsed: 'none',
      badge: 'Query Too Short',
      personFilter: null,
      results: [],
      totalAvailable: 0,
      hasMore: false,
      message: 'Please enter at least 2 alphanumeric characters or an emoji to search.'
    };
  }

  const allMessages = getMessages();
  const embeddingsMap = getEmbeddings();

  if (allMessages.length === 0) {
    return {
      query: trimmedQuery,
      tierUsed: 'none',
      badge: '⚠️ No Data',
      personFilter: null,
      results: [],
      totalAvailable: 0,
      hasMore: false,
      message: 'No ingested messages found. Please run ingestion first.'
    };
  }

  // 1. Discover known senders
  const knownSenders = Array.from(new Set(allMessages.map((m) => m.sender)));

  // 2. Extract Person Filter
  const person = extractPerson(trimmedQuery, knownSenders);

  // Filter candidates if person is mentioned
  const candidatePool = person
    ? allMessages.filter((m) => m.sender.toLowerCase() === person.toLowerCase())
    : allMessages;

  // 3. Extract Keywords
  const keywords = extractKeywords(trimmedQuery, person);

  // Edge case 2: Only person is specified and no other keywords or concepts
  if (person && keywords.length === 0 && !hasEmoji) {
    const personMessages = candidatePool.slice(0, 10);
    const results = personMessages.map((msg) => ({
      matchedMessage: msg,
      score: 1,
      reason: `Message from ${person}`,
      contextWindow: expandContext(msg.id, allMessages, 5)
    }));

    const paginatedResults = limit > 0
      ? results.slice((page - 1) * limit, page * limit)
      : results;

    return {
      query: trimmedQuery,
      tierUsed: 'person',
      badge: `👤 Chats with ${person}`,
      personFilter: person,
      keywords: [],
      totalAvailable: results.length,
      hasMore: limit > 0 ? results.length > page * limit : results.length > 3,
      page,
      limit,
      results: paginatedResults
    };
  }

  // ----------------------------------------------------
  // TIER 1: Keyword Search (Text, Topic, Emotion)
  // ----------------------------------------------------
  const keywordHits = [];

  if (keywords.length > 0) {
    for (const msg of candidatePool) {
      const textLower = msg.text.toLowerCase();
      const topicLower = (msg.topic || '').toLowerCase();
      const emotionLower = (msg.emotion || '').toLowerCase();

      let matchedKeywords = [];

      for (const kw of keywords) {
        // Keyword match against text (with word boundary for short 2-char tokens) or topic / emotion stem
        const matchesText = kw.length <= 2
          ? new RegExp(`\\b${kw}\\b`, 'i').test(textLower)
          : textLower.includes(kw);

        const matchesEmotion = emotionLower.includes(kw) || kw.includes(emotionLower);
        const matchesTopic = topicLower.includes(kw) || kw.includes(topicLower);

        if (matchesText) {
          matchedKeywords.push(`text:"${kw}"`);
        } else if (matchesEmotion) {
          matchedKeywords.push(`emotion:"${kw}"`);
        } else if (matchesTopic) {
          matchedKeywords.push(`topic:"${kw}"`);
        }
      }

      if (matchedKeywords.length > 0) {
        keywordHits.push({
          message: msg,
          score: matchedKeywords.length,
          reason: `Keyword match in ${matchedKeywords.join(', ')}`
        });
      }
    }
  }

  // If Tier 1 found matches, return matches with pagination support
  if (keywordHits.length > 0) {
    keywordHits.sort((a, b) => b.score - a.score);

    const allTier1Results = keywordHits.map((hit) => ({
      matchedMessage: hit.message,
      score: hit.score,
      reason: hit.reason,
      contextWindow: expandContext(hit.message.id, allMessages, 5)
    }));

    const paginatedResults = limit > 0
      ? allTier1Results.slice((page - 1) * limit, page * limit)
      : allTier1Results;

    return {
      query: trimmedQuery,
      tierUsed: 'keyword',
      badge: 'Keyword Match',
      personFilter: person,
      keywords,
      totalAvailable: allTier1Results.length,
      hasMore: limit > 0 ? allTier1Results.length > page * limit : allTier1Results.length > 3,
      page,
      limit,
      results: paginatedResults
    };
  }

  // ----------------------------------------------------
  // TIER 2: Semantic / Tone Search (Embeddings + Topic)
  // ----------------------------------------------------
  const queryVector = await embedText(trimmedQuery);
  const semanticScores = [];

  for (const msg of candidatePool) {
    const msgVec = embeddingsMap[msg.id];
    if (msgVec) {
      const similarity = cosineSimilarity(queryVector, msgVec);
      semanticScores.push({
        message: msg,
        score: Number(similarity.toFixed(4)),
        reason: `Semantic tone & context match: ${(similarity * 100).toFixed(1)}% (Emotion: ${msg.emotion || 'neutral'}, Topic: ${msg.topic || 'chat'})`
      });
    }
  }

  // Sort by highest cosine similarity
  semanticScores.sort((a, b) => b.score - a.score);

  // Strictly calibrate threshold to eliminate false positives on unmentioned/unrelated queries
  const isLocal = isLocalProvider();
  const SEMANTIC_MIN_THRESHOLD = isLocal ? 0.40 : 0.30;

  const topScore = semanticScores.length > 0 ? semanticScores[0].score : 0;

  // If the top score is below the confidence threshold, there are NO true matches
  if (topScore < SEMANTIC_MIN_THRESHOLD) {
    return {
      query: trimmedQuery,
      tierUsed: 'none',
      badge: 'No Matches Found',
      personFilter: person,
      keywords,
      totalAvailable: 0,
      hasMore: false,
      noMatch: true,
      results: [],
      message: `No conversations found matching "${trimmedQuery}". Try searching for travel, adventure, food, work, or friends.`
    };
  }

  // Adaptive cutoff: filter out matches that fall off sharply from top match
  const adaptiveCutoff = Math.max(SEMANTIC_MIN_THRESHOLD, topScore * 0.50);
  const validSemanticHits = semanticScores.filter((item) => item.score >= adaptiveCutoff);

  const allTier2Results = validSemanticHits.map((hit) => ({
    matchedMessage: hit.message,
    score: hit.score,
    reason: hit.reason,
    contextWindow: expandContext(hit.message.id, allMessages, 5)
  }));

  const paginatedResults = limit > 0
    ? allTier2Results.slice((page - 1) * limit, page * limit)
    : allTier2Results;

  return {
    query: trimmedQuery,
    tierUsed: 'semantic',
    badge: '🎯 Tone / Semantic Match',
    personFilter: person,
    keywords,
    totalAvailable: allTier2Results.length,
    hasMore: limit > 0 ? allTier2Results.length > page * limit : allTier2Results.length > 3,
    page,
    limit,
    results: paginatedResults
  };
}

module.exports = {
  searchChat,
  extractPerson,
  extractKeywords,
  expandContext
};
