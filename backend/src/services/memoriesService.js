const fs = require('fs');
const path = require('path');

const PROCESSED_PATH = path.join(__dirname, '../../data/processed/messages.json');


function loadMessages() {
  if (!fs.existsSync(PROCESSED_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf-8'));
  } catch (err) {
    console.error('[MemoriesService] Error reading messages:', err);
    return [];
  }
}


function getContextWindow(messages, centerIndex, windowSize = 2) {
  const start = Math.max(0, centerIndex - windowSize);
  const end = Math.min(messages.length, centerIndex + windowSize + 1);
  return messages.slice(start, end).map((m) => ({
    id: m.id,
    sender: m.sender,
    text: m.text,
    timestamp: m.timestamp,
    emotion: m.emotion,
    topic: m.topic,
    isTarget: m.id === messages[centerIndex].id
  }));
}


function getRelativeTimeDescription(msgDate, targetDate = new Date()) {
  const diffMs = targetDate.getTime() - msgDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.round(diffDays / 30.44);
  const diffYears = Math.round(diffDays / 365.25);

  if (diffYears >= 1) {
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  }
  if (diffMonths >= 1) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  return 'Recent';
}


function getMemories(queryDateStr = null) {
  const messages = loadMessages();
  if (!messages.length) {
    return {
      onThisDay: [],
      highlights: [],
      availableDates: []
    };
  }


  let refDate = queryDateStr ? new Date(queryDateStr) : new Date();
  if (isNaN(refDate.getTime())) {
    refDate = new Date();
  }

  const queryMonth = refDate.getUTCMonth(); 
  const queryDay = refDate.getUTCDate();   


  const sameDayMatches = [];
  messages.forEach((msg, idx) => {
    const d = new Date(msg.timestamp);
    if (!isNaN(d.getTime())) {
      if (d.getUTCMonth() === queryMonth && d.getUTCDate() === queryDay) {
        sameDayMatches.push({
          message: msg,
          index: idx,
          contextWindow: getContextWindow(messages, idx, 2),
          timeframe: getRelativeTimeDescription(d, refDate)
        });
      }
    }
  });


  const milestoneIndices = [
    { idx: 11, title: 'Manali Trip Lock-In', subtitle: 'The gang locked in the Riverside Wooden Cottage in Old Manali!', category: 'Group Milestone', badge: 'Decision Made' },
    { idx: 20, title: 'Rahul\'s Venting & Brotherhood', subtitle: 'Kabir rushed over with dinner when Rahul needed support.', category: 'Heartfelt Memory', badge: 'Support & Care' },
    { idx: 30, title: '35ft Cliff Jump in Rishikesh', subtitle: 'Adrenaline-packed white water rafting and river gorge jump.', category: 'Epic Adventure', badge: 'Adventure' },
    { idx: 37, title: 'Midnight Murthal Paranthe Run', subtitle: 'Spontaneous 2 AM road trip for butter paranthe & chai.', category: 'Foodie Memory', badge: 'Late Night Vibes' },
    { idx: 26, title: 'IPL Match Thriller Victory', subtitle: 'Last-over sixer victory celebration with the whole gang.', category: 'Sports Thrill', badge: 'Victory Celebration' }
  ];

  const highlights = milestoneIndices
    .filter((item) => item.idx < messages.length)
    .map((item) => {
      const msg = messages[item.idx];
      const d = new Date(msg.timestamp);
      return {
        id: `memory_${msg.id}`,
        title: item.title,
        subtitle: item.subtitle,
        category: item.category,
        badge: item.badge,
        matchedMessage: msg,
        contextWindow: getContextWindow(messages, item.idx, 2),
        relativeTime: getRelativeTimeDescription(d, new Date('2025-04-18T00:00:00Z')),
        dateFormatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        rawDate: msg.timestamp
      };
    });

  
  const dateMap = {};
  messages.forEach((m) => {
    const d = new Date(m.timestamp);
    if (!isNaN(d.getTime())) {
      const dateKey = d.toISOString().split('T')[0];
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          date: dateKey,
          displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: 0,
          topic: m.topic,
          preview: m.text
        };
      }
      dateMap[dateKey].count += 1;
    }
  });

  const availableDates = Object.values(dateMap);

  const onThisDayResults = sameDayMatches.map((match) => ({
    id: `otd_${match.message.id}`,
    title: `Memory from ${match.timeframe}`,
    matchedMessage: match.message,
    contextWindow: match.contextWindow,
    relativeTime: match.timeframe,
    dateFormatted: new Date(match.message.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    rawDate: match.message.timestamp
  }));

  return {
    queryDate: refDate.toISOString().split('T')[0],
    queryMonthDay: refDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    hasExactMatches: onThisDayResults.length > 0,
    onThisDay: onThisDayResults,
    highlights,
    availableDates
  };
}

module.exports = {
  getMemories,
  getContextWindow
};
