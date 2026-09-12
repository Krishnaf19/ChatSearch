const fs = require('fs');
const path = require('path');

const PROCESSED_PATH = path.join(__dirname, '../../data/processed/messages.json');

const TOPIC_METADATA = {
  adventure: {
    label: 'Adventure & Thrills',
    icon: 'Compass',
    tagline: 'River rafting, cliff jumps, mountain expeditions',
    color: '#0284c7',
    bgColor: '#e0f2fe'
  },
  travel_planning: {
    label: 'Travel & Trips',
    icon: 'Calendar',
    tagline: 'Manali, Himachal getaways, cottage bookings & PTOs',
    color: '#059669',
    bgColor: '#dcfce7'
  },
  venting: {
    label: 'Work Venting & Support',
    icon: 'Heart',
    tagline: 'Burnout, startup layoffs, late-night brotherhood',
    color: '#e11d48',
    bgColor: '#ffe4e6'
  },
  food: {
    label: 'Food & Late-Night Drives',
    icon: 'Utensils',
    tagline: 'Murthal butter paranthe, chai, biryani & sushi',
    color: '#d97706',
    bgColor: '#fef3c7'
  },
  sports: {
    label: 'Sports & Matches',
    icon: 'Trophy',
    tagline: 'IPL thrillers, last-over sixers & nail-biters',
    color: '#7c3aed',
    bgColor: '#f3e8ff'
  },
  work: {
    label: 'Work & Planning',
    icon: 'Briefcase',
    tagline: 'Quarterly planning syncs, decks & sprint deliverables',
    color: '#475569',
    bgColor: '#f1f5f9'
  },
  chat: {
    label: 'Casual Banter',
    icon: 'MessageSquare',
    tagline: 'Everyday hangouts, spontaneous catchups & check-ins',
    color: '#6b7280',
    bgColor: '#f3f4f6'
  }
};


function loadMessages() {
  if (!fs.existsSync(PROCESSED_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf-8'));
  } catch (err) {
    console.error('[LeaderboardService] Error reading messages:', err);
    return [];
  }
}


function getTopicsLeaderboard() {
  const messages = loadMessages();
  if (!messages.length) {
    return {
      totalMessages: 0,
      topicsLeaderboard: [],
      membersLeaderboard: [],
      overallEmotions: {}
    };
  }

  const topicCounts = {};
  const topicSenders = {};
  const topicEmotions = {};
  const topicSamples = {};

  const memberCounts = {};
  const memberTopics = {};
  const memberEmotions = {};

  messages.forEach((msg) => {
    const rawTopic = msg.topic || 'chat';
    const sender = msg.sender || 'Anonymous';
    const emotion = msg.emotion || 'neutral';

    topicCounts[rawTopic] = (topicCounts[rawTopic] || 0) + 1;

    if (!topicSenders[rawTopic]) topicSenders[rawTopic] = {};
    topicSenders[rawTopic][sender] = (topicSenders[rawTopic][sender] || 0) + 1;

    if (!topicEmotions[rawTopic]) topicEmotions[rawTopic] = {};
    topicEmotions[rawTopic][emotion] = (topicEmotions[rawTopic][emotion] || 0) + 1;

    if (!topicSamples[rawTopic]) topicSamples[rawTopic] = [];
    if (topicSamples[rawTopic].length < 3) {
      topicSamples[rawTopic].push({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp,
        emotion: msg.emotion
      });
    }


    memberCounts[sender] = (memberCounts[sender] || 0) + 1;

    if (!memberTopics[sender]) memberTopics[sender] = {};
    memberTopics[sender][rawTopic] = (memberTopics[sender][rawTopic] || 0) + 1;

    if (!memberEmotions[sender]) memberEmotions[sender] = {};
    memberEmotions[sender][emotion] = (memberEmotions[sender][emotion] || 0) + 1;
  });

  const totalMessages = messages.length;

  const topicsLeaderboard = Object.keys(topicCounts)
    .map((topicKey) => {
      const count = topicCounts[topicKey];
      const percentage = Math.round((count / totalMessages) * 100);
      const meta = TOPIC_METADATA[topicKey] || {
        label: topicKey.replace(/_/g, ' ').toUpperCase(),
        tagline: `${count} messages discussed`,
        color: '#4f46e5',
        bgColor: '#eef2ff'
      };

  
      const sendersMap = topicSenders[topicKey] || {};
      const topContributors = Object.keys(sendersMap)
        .map((s) => ({
          sender: s,
          count: sendersMap[s],
          percentage: Math.round((sendersMap[s] / count) * 100)
        }))
        .sort((a, b) => b.count - a.count);

     
      const emotionsMap = topicEmotions[topicKey] || {};
      const dominantEmotions = Object.keys(emotionsMap)
        .map((e) => ({
          emotion: e,
          count: emotionsMap[e],
          percentage: Math.round((emotionsMap[e] / count) * 100)
        }))
        .sort((a, b) => b.count - a.count);

      return {
        topic: topicKey,
        label: meta.label,
        tagline: meta.tagline,
        color: meta.color,
        bgColor: meta.bgColor,
        messageCount: count,
        percentage,
        topContributors,
        primarySpeaker: topContributors[0] || null,
        dominantEmotions,
        samples: topicSamples[topicKey] || []
      };
    })
    .sort((a, b) => b.messageCount - a.messageCount)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));

  const membersLeaderboard = Object.keys(memberCounts)
    .map((sender) => {
      const count = memberCounts[sender];
      const percentage = Math.round((count / totalMessages) * 100);

      const userTopics = memberTopics[sender] || {};
      const topTopicEntry = Object.entries(userTopics).sort((a, b) => b[1] - a[1])[0];
      const topTopic = topTopicEntry ? topTopicEntry[0] : 'chat';
      const topTopicLabel = TOPIC_METADATA[topTopic]?.label || topTopic;

      const userEmotions = memberEmotions[sender] || {};
      const dominantEmotionEntry = Object.entries(userEmotions).sort((a, b) => b[1] - a[1])[0];
      const dominantEmotion = dominantEmotionEntry ? dominantEmotionEntry[0] : 'neutral';

      return {
        sender,
        messageCount: count,
        percentage,
        topTopic,
        topTopicLabel,
        topTopicCount: topTopicEntry ? topTopicEntry[1] : 0,
        dominantEmotion,
        topicBreakdown: Object.keys(userTopics).map((t) => ({
          topic: t,
          label: TOPIC_METADATA[t]?.label || t,
          count: userTopics[t]
        })).sort((a, b) => b.count - a.count)
      };
    })
    .sort((a, b) => b.messageCount - a.messageCount)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));

  return {
    totalMessages,
    topicsLeaderboard,
    membersLeaderboard,
    topTopic: topicsLeaderboard[0] || null,
    mostActiveSpeaker: membersLeaderboard[0] || null
  };
}

module.exports = {
  getTopicsLeaderboard
};
