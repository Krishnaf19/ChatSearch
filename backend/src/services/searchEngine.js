const path = require('path');
const fs = require('fs');
const { cosineSimilarity } = require('../utils/similarity');
const { embedText } = require('./embeddings');

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
      clean.includes(`${sLower} ka`)
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
 * Executes Two-Tier Search Pipeline
 */
async function searchChat(query) {
  const allMessages = getMessages();
  const embeddingsMap = getEmbeddings();

  if (allMessages.length === 0) {
    return {
      query,
      tierUsed: 'none',
      badge: '⚠️ No Data',
      personFilter: null,
      results: [],
      totalAvailable: 0,
      message: 'No ingested messages found. Please run ingestion first.'
    };
  }

  // 1. Discover known senders
  const knownSenders = Array.from(new Set(allMessages.map((m) => m.sender)));

  // 2. Extract Person Filter
  const person = extractPerson(query, knownSenders);

  // Filter candidates if person is mentioned
  const candidatePool = person
    ? allMessages.filter((m) => m.sender.toLowerCase() === person.toLowerCase())
    : allMessages;

  // 3. Extract Keywords
  const keywords = extractKeywords(query, person);

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
        // Exact substring in text or emotion or topic
        // Preserves Tier 2 fallback: "adventure".includes("adventurous") is FALSE
        if (textLower.includes(kw)) {
          matchedKeywords.push(`text:"${kw}"`);
        } else if (emotionLower.includes(kw)) {
          matchedKeywords.push(`emotion:"${kw}"`);
        } else if (topicLower.includes(kw)) {
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

  // If Tier 1 found matches, return immediately (fast, exact, cheap)
  if (keywordHits.length > 0) {
    keywordHits.sort((a, b) => b.score - a.score);
    const topHits = keywordHits.slice(0, 3);

    const results = topHits.map((hit) => ({
      matchedMessage: hit.message,
      score: hit.score,
      reason: hit.reason,
      contextWindow: expandContext(hit.message.id, allMessages, 5)
    }));

    return {
      query,
      tierUsed: 'keyword',
      badge: 'Keyword Match',
      personFilter: person,
      keywords,
      results
    };
  }

  // ----------------------------------------------------
  // TIER 2: Semantic / Tone Search (Embeddings + Topic)
  // ----------------------------------------------------
  const queryVector = await embedText(query);
  const semanticScores = [];

  for (const msg of candidatePool) {
    const msgVec = embeddingsMap[msg.id];
    if (msgVec) {
      const similarity = cosineSimilarity(queryVector, msgVec);
      semanticScores.push({
        message: msg,
        score: Number(similarity.toFixed(4)),
        reason: `Semantic cosine similarity score: ${(similarity * 100).toFixed(1)}% (Emotion: ${msg.emotion || 'neutral'}, Topic: ${msg.topic || 'chat'})`
      });
    }
  }

  // Sort by highest cosine similarity
  semanticScores.sort((a, b) => b.score - a.score);
  const topSemanticHits = semanticScores.filter((item) => item.score > 0.15).slice(0, 3);

  const results = topSemanticHits.map((hit) => ({
    matchedMessage: hit.message,
    score: hit.score,
    reason: hit.reason,
    contextWindow: expandContext(hit.message.id, allMessages, 5)
  }));

  return {
    query,
    tierUsed: 'semantic',
    badge: '🎯 Tone / Semantic Match',
    personFilter: person,
    keywords,
    results
  };
}

module.exports = {
  searchChat,
  extractPerson,
  extractKeywords,
  expandContext
};
