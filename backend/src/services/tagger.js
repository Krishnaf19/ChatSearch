

const https = require('https');

const EMOTION_PATTERNS = [
  {
    emotion: 'sadness',
    patterns: [
      /crushing/i, /downsizing/i, /drained/i, /hollow/i, /dark.*zone/i, /heavy/i,
      /layoff/i, /depressed/i, /sad/i, /grief/i, /bura din/i, /khali/i, /dimag sunn/i,
      /devastating/i, /alone/i, /udaas/i
    ]
  },
  {
    emotion: 'excitement',
    patterns: [
      /adrenaline/i, /cliff jump/i, /rapids/i, /rafting/i, /thrill/i, /daredevil/i,
      /hyped/i, /yessss/i, /let's goooo/i, /wild/i, /insane/i, /expedition/i,
      /maza aayega/i, /bap re/i, /dil gale mein/i, /kaand kiya/i
    ]
  },
  {
    emotion: 'gratitude',
    patterns: [
      /dil se shukriya/i, /true brother/i, /true friend/i, /appreciate you/i,
      /thanks bhai/i, /thanks man/i, /thank you/i, /means a lot/i, /shukriya/i
    ]
  },
  {
    emotion: 'joy',
    patterns: [
      /legend/i, /gorgeous/i, /sundar/i, /haha/i, /loving/i, /wonderful/i,
      /cleaner air/i, /best combination/i, /sixer maar ke/i
    ]
  },
  {
    emotion: 'anxiety',
    patterns: [
      /kalesh/i, /shaky/i, /drama/i, /worried/i, /stress/i, /tension lag raha/i, /eleventh hour/i
    ]
  },
  {
    emotion: 'anticipation',
    patterns: [
      /long weekend/i, /trip plan karein/i, /i vote for/i, /garam jackets pack/i,
      /count me in/i, /late night drive/i
    ]
  }
];

const TOPIC_PATTERNS = [
  {
    topic: 'adventure',
    patterns: [
      /rapids/i, /rafting/i, /cliff jump/i, /river gorge/i, /gorge/i, /wilderness/i,
      /mountain pass/i, /adrenaline/i, /trek/i, /conquer/i, /rishikesh/i, /expedition/i
    ]
  },
  {
    topic: 'travel_planning',
    patterns: [
      /getaway/i, /manali/i, /goa/i, /shimla/i, /himachal/i, /cottage/i, /airbnb/i,
      /holiday/i, /road trip/i, /booked/i, /book kar di/i, /pack/i, /solang/i, /chutti/i, /trip/i
    ]
  },
  {
    topic: 'venting',
    patterns: [
      /crushing day/i, /downsizing/i, /layoff/i, /drained/i, /khali/i, /dark.*zone/i,
      /bura din/i, /leadership ka failure/i, /dimag sunn/i, /devastating/i
    ]
  },
  {
    topic: 'food',
    patterns: [
      /dinner/i, /biryani/i, /sushi/i, /maggi/i, /chai/i, /paranthe/i, /makkhan/i,
      /murthal/i, /butter/i, /spicy/i, /khana/i
    ]
  },
  {
    topic: 'sports',
    patterns: [
      /ipl/i, /cricket match/i, /thriller/i, /sixer/i, /last over/i, /match/i
    ]
  },
  {
    topic: 'work',
    patterns: [
      /sprint/i, /manager/i, /chutti/i, /pto/i, /slides/i, /sync/i,
      /quarterly planning/i, /engineer/i
    ]
  }
];


function ruleBasedTag(text) {
  let matchedEmotion = 'neutral';
  let matchedTopic = 'chat';

  for (const item of EMOTION_PATTERNS) {
    if (item.patterns.some((regex) => regex.test(text))) {
      matchedEmotion = item.emotion;
      break;
    }
  }

  for (const item of TOPIC_PATTERNS) {
    if (item.patterns.some((regex) => regex.test(text))) {
      matchedTopic = item.topic;
      break;
    }
  }

  return { emotion: matchedEmotion, topic: matchedTopic };
}


async function claudeTag(text, apiKey) {
  return new Promise((resolve, reject) => {
    const prompt = `Classify this single chat message (may be English or Hinglish) into JSON format with keys "emotion" and "topic".
Emotion must be one of: sadness, excitement, joy, gratitude, anxiety, anticipation, neutral.
Topic should be a concise lowercase category like: adventure, travel_planning, venting, work, food, sports, chat.
Only output valid JSON: {"emotion": "...", "topic": "..."}

Message: "${text.replace(/"/g, '\\"')}"`;

    const postData = JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 64,
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const rawText = parsed.content?.[0]?.text;
          const jsonMatch = rawText?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]));
          } else {
            reject(new Error('Invalid LLM tagging response'));
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


async function tagMessage(text) {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await claudeTag(text, process.env.ANTHROPIC_API_KEY);
      if (result && result.emotion && result.topic) {
        return result;
      }
    } catch (err) {
      console.warn(`[Claude Tagging Warning]: ${err.message}. Using rule-based tagger.`);
    }
  }


  return ruleBasedTag(text);
}

module.exports = {
  tagMessage,
  ruleBasedTag
};
