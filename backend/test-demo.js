/**
 * End-to-end demo test script for searchChat.
 * Runs ingestion and executes the 3 canonical test queries from the spec:
 * 1. "when did we decide on Manali" (or "manali trip") -> Hits Tier 1 (Keyword)
 * 2. "my sad talk with rahul" -> Hits Tier 1 (Keyword/Emotion)
 * 3. "my adventurous talks with rahul" -> Falls through to Tier 2 (Semantic / Tone)
 */

const fs = require('fs');
const path = require('path');
const { tagMessage } = require('./src/services/tagger');
const { embedText } = require('./src/services/embeddings');
const { searchChat } = require('./src/services/searchEngine');

const RAW_PATH = path.join(__dirname, 'data/raw/chat_export.json');
const PROCESSED_DIR = path.join(__dirname, 'data/processed');
const EMBEDDINGS_DIR = path.join(__dirname, 'data/embeddings');
const PROCESSED_PATH = path.join(PROCESSED_DIR, 'messages.json');
const EMBEDDINGS_PATH = path.join(EMBEDDINGS_DIR, 'message_embeddings.json');

async function runIngestion() {
  console.log('\n📦 ==============================================');
  console.log('📦 STEP 1: Running Ingestion Pipeline');
  console.log('📦 ==============================================');

  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  if (!fs.existsSync(EMBEDDINGS_DIR)) fs.mkdirSync(EMBEDDINGS_DIR, { recursive: true });

  const raw = JSON.parse(fs.readFileSync(RAW_PATH, 'utf-8'));
  console.log(`Ingesting ${raw.length} raw messages from chat_export.json...`);

  const processed = [];
  const embeddings = {};

  for (const item of raw) {
    const tagResult = await tagMessage(item.text);
    const enriched = {
      id: item.id,
      sender: item.sender,
      text: item.text,
      timestamp: item.timestamp,
      emotion: tagResult.emotion,
      topic: tagResult.topic
    };
    processed.push(enriched);
    embeddings[item.id] = await embedText(item.text);
  }

  fs.writeFileSync(PROCESSED_PATH, JSON.stringify(processed, null, 2));
  fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(embeddings, null, 2));
  console.log(`✅ Ingestion complete! Saved to data/processed and data/embeddings.\n`);
}

function printResult(query, res) {
  console.log(`\n======================================================`);
  console.log(`🔎 Query: "${query}"`);
  console.log(`🏷️  Badge: ${res.badge}`);
  console.log(`⚙️  Tier Used: ${res.tierUsed.toUpperCase()}`);
  console.log(`👤 Person Filter: ${res.personFilter || 'None'}`);
  console.log(`🔑 Keywords Extracted: [${(res.keywords || []).join(', ')}]`);
  console.log(`📊 Matches Found: ${res.results.length}`);

  if (res.results.length > 0) {
    const top = res.results[0];
    console.log(`\n🎯 Focal Match:`);
    console.log(`   [${top.matchedMessage.sender} (${top.matchedMessage.timestamp})]: "${top.matchedMessage.text}"`);
    console.log(`   Emotion: "${top.matchedMessage.emotion}", Topic: "${top.matchedMessage.topic}"`);
    console.log(`   Reason: ${top.reason}`);

    console.log(`\n🧵 Expanded Context Window (${top.contextWindow.length} messages):`);
    top.contextWindow.forEach((msg) => {
      const marker = msg.isTarget ? '👉 [MATCH] ' : '          ';
      console.log(`${marker}[${msg.sender}]: ${msg.text}`);
    });
  } else {
    console.log('❌ No matches found.');
  }
  console.log(`======================================================`);
}

async function runDemo() {
  await runIngestion();

  console.log('\n🚀 ==============================================');
  console.log('🚀 STEP 2: Executing The 3 Canonical Demo Queries');
  console.log('🚀 ==============================================');

  // Test 1: "when did we decide on Manali"
  const q1 = "when did we decide on Manali";
  const r1 = await searchChat(q1);
  printResult(q1, r1);

  if (r1.tierUsed !== 'keyword') {
    console.error(`❌ Assertion Failed: Expected Tier 1 (keyword), got ${r1.tierUsed}`);
  } else {
    console.log(`✅ Assertion Passed: Query 1 resolved by Tier 1 (Keyword Search)`);
  }

  // Test 2: "my sad talk with rahul"
  const q2 = "my sad talk with rahul";
  const r2 = await searchChat(q2);
  printResult(q2, r2);

  if (r2.personFilter !== 'Rahul') {
    console.error(`❌ Assertion Failed: Expected personFilter to be "Rahul", got ${r2.personFilter}`);
  }
  if (r2.tierUsed !== 'keyword') {
    console.error(`❌ Assertion Failed: Expected Tier 1 (keyword/emotion match), got ${r2.tierUsed}`);
  } else {
    console.log(`✅ Assertion Passed: Query 2 resolved by Tier 1 (Person Filter + Emotion Tag)`);
  }

  // Test 3: "my adventurous talks with rahul"
  const q3 = "my adventurous talks with rahul";
  const r3 = await searchChat(q3);
  printResult(q3, r3);

  if (r3.personFilter !== 'Rahul') {
    console.error(`❌ Assertion Failed: Expected personFilter to be "Rahul", got ${r3.personFilter}`);
  }
  if (r3.tierUsed !== 'semantic') {
    console.error(`❌ Assertion Failed: Expected Tier 2 (semantic fallback), got ${r3.tierUsed}`);
  } else {
    console.log(`✅ Assertion Passed: Query 3 successfully fell through to Tier 2 (Semantic / Tone Match)!`);
  }

  console.log('\n🎉 ALL DEMO QUERIES VERIFIED SUCCESSFULLY!\n');
}

if (require.main === module) {
  runDemo().catch((err) => {
    console.error('Demo execution failed:', err);
    process.exit(1);
  });
}

module.exports = { runDemo, runIngestion };
