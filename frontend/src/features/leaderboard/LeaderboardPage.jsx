import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLeaderboard, setQuery, executeSearch, setActiveTab } from '../search/searchSlice';
import {
  Trophy,
  Flame,
  MessageSquare,
  Users,
  Search,
  Compass,
  Heart,
  Utensils,
  Briefcase,
  TrendingUp,
  Award,
  Sparkles,
  RefreshCw
} from 'lucide-react';

const SENDER_COLORS = {
  Rohan: { color: '#0284c7', bg: '#e0f2fe', initials: 'Ro' },
  Rahul: { color: '#4338ca', bg: '#e0e7ff', initials: 'Ra' },
  Kabir: { color: '#059669', bg: '#dcfce7', initials: 'Ka' },
  Priya: { color: '#db2777', bg: '#fce7f3', initials: 'Pr' },
  Ananya: { color: '#d97706', bg: '#fef3c7', initials: 'An' }
};

const TOPIC_ICONS = {
  adventure: Compass,
  travel_planning: TrendingUp,
  venting: Heart,
  food: Utensils,
  sports: Trophy,
  work: Briefcase,
  chat: MessageSquare
};

export default function LeaderboardPage() {
  const dispatch = useDispatch();
  const { leaderboardData, leaderboardLoading } = useSelector((state) => state.search);

  useEffect(() => {
    dispatch(fetchLeaderboard());
  }, [dispatch]);

  const handleTopicSearch = (topicKey, topicLabel) => {
    const queryMap = {
      adventure: 'adventurous talks rapids cliff jump',
      travel_planning: 'manali trip vacation planning cottage',
      venting: 'layoff startup work stress sad',
      food: 'murthal drive paranthe biryani food dinner',
      sports: 'ipl cricket match thriller sixer',
      work: 'quarterly planning slides work sprint'
    };
    const query = queryMap[topicKey] || `${topicLabel} chat`;
    dispatch(setQuery(query));
    dispatch(executeSearch(query));
    dispatch(setActiveTab('search'));
  };

  const handleMemberSearch = (sender) => {
    const query = `${sender.toLowerCase()} talks discussion`;
    dispatch(setQuery(query));
    dispatch(executeSearch(query));
    dispatch(setActiveTab('search'));
  };

  const getSenderMeta = (sender) =>
    SENDER_COLORS[sender] || { color: '#475569', bg: '#f1f5f9', initials: sender?.[0] || '?' };

  const formatTimestamp = (isoString) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  const topics = leaderboardData?.topicsLeaderboard || [];
  const members = leaderboardData?.membersLeaderboard || [];
  const totalMessages = leaderboardData?.totalMessages || 0;
  const topTopic = leaderboardData?.topTopic;
  const mostActiveSpeaker = leaderboardData?.mostActiveSpeaker;

  const getRankBadge = (rank) => {
    if (rank === 1) return { label: '🥇 #1 Most Discussed', class: 'rank-gold' };
    if (rank === 2) return { label: '🥈 #2 Trending', class: 'rank-silver' };
    if (rank === 3) return { label: '🥉 #3 Popular', class: 'rank-bronze' };
    return { label: `#${rank}`, class: 'rank-normal' };
  };

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <div className="leaderboard-badge">
          <Flame size={14} />
          <span>Topic Analytics & Conversation Trends</span>
        </div>
        <h2>Most Active Topics Leaderboard</h2>
        <p>
          Rankings of which subjects (adventure, food, work-venting, travel) dominate your group
          chats and which members contribute most to each conversation.
        </p>
      </div>

  
      <div className="leaderboard-stat-cards">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Top Subject</span>
            <span className="stat-val">{topTopic?.label || 'Travel & Trips'}</span>
            <span className="stat-sub">{topTopic?.messageCount || 0} messages ({topTopic?.percentage || 0}%)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}>
            <Users size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Most Active Speaker</span>
            <span className="stat-val">{mostActiveSpeaker?.sender || 'Kabir'}</span>
            <span className="stat-sub">{mostActiveSpeaker?.messageCount || 0} chats contributed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <MessageSquare size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Indexed Messages</span>
            <span className="stat-val">{totalMessages} Chats</span>
            <span className="stat-sub">Across 7 topic categories</span>
          </div>
        </div>
      </div>

      {leaderboardLoading ? (
        <div className="loading-indicator">
          <RefreshCw size={20} className="spinning" />
          Calculating leaderboard rankings…
        </div>
      ) : (
        <>
        
          <div className="leaderboard-section">
            <div className="section-title-row">
              <h3>🏆 Ranked Subjects</h3>
              <span className="section-hint">Click &ldquo;Explore in Search&rdquo; to jump directly to those messages</span>
            </div>

            <div className="topics-leaderboard-grid">
              {topics.map((t) => {
                const IconComponent = TOPIC_ICONS[t.topic] || MessageSquare;
                const rankInfo = getRankBadge(t.rank);
                const primarySpeaker = t.primarySpeaker;
                const sm = primarySpeaker ? getSenderMeta(primarySpeaker.sender) : null;

                return (
                  <div key={t.topic} className={`topic-rank-card ${rankInfo.class}`}>
                
                    <div className="card-top-header">
                      <div className="topic-title-group">
                        <div className="topic-icon-badge" style={{ backgroundColor: t.bgColor, color: t.color }}>
                          <IconComponent size={18} />
                        </div>
                        <div>
                          <h4>{t.label}</h4>
                          <span className="topic-tagline-text">{t.tagline}</span>
                        </div>
                      </div>
                      <span className={`rank-pill ${rankInfo.class}`}>{rankInfo.label}</span>
                    </div>

       
                    <div className="topic-volume-meter">
                      <div className="volume-label-row">
                        <span className="volume-count">{t.messageCount} messages</span>
                        <span className="volume-pct">{t.percentage}% of total chat</span>
                      </div>
                      <div className="meter-track">
                        <div
                          className="meter-fill"
                          style={{ width: `${Math.max(t.percentage, 8)}%`, backgroundColor: t.color }}
                        />
                      </div>
                    </div>

               
                    <div className="topic-breakdown-row">
                      {primarySpeaker && sm && (
                        <div className="top-contributor-box">
                          <span className="box-title">Top Speaker</span>
                          <div className="contributor-pill">
                            <span
                              className="mini-avatar"
                              style={{ backgroundColor: sm.bg, color: sm.color }}
                            >
                              {sm.initials}
                            </span>
                            <span className="contrib-name">{primarySpeaker.sender}</span>
                            <span className="contrib-count">({primarySpeaker.count} msgs · {primarySpeaker.percentage}%)</span>
                          </div>
                        </div>
                      )}

                      {t.dominantEmotions && t.dominantEmotions.length > 0 && (
                        <div className="dominant-emotion-box">
                          <span className="box-title">Vibe / Emotion</span>
                          <span className={`emotion-pill emotion-${t.dominantEmotions[0].emotion}`}>
                            {t.dominantEmotions[0].emotion} ({t.dominantEmotions[0].percentage}%)
                          </span>
                        </div>
                      )}
                    </div>

                
                    {t.topContributors && t.topContributors.length > 1 && (
                      <div className="all-contributors-row">
                        <span className="sub-label">Participants:</span>
                        <div className="contrib-avatars-list">
                          {t.topContributors.map((c) => {
                            const cm = getSenderMeta(c.sender);
                            return (
                              <span
                                key={c.sender}
                                className="member-avatar-chip"
                                style={{ backgroundColor: cm.bg, color: cm.color }}
                                title={`${c.sender}: ${c.count} messages (${c.percentage}%)`}
                              >
                                {cm.initials}
                                <span className="avatar-count">{c.count}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                 
                    {t.samples && t.samples[0] && (
                      <div className="topic-sample-quote">
                        <span className="quote-author">{t.samples[0].sender}:</span>
                        <span className="quote-body">&ldquo;{t.samples[0].text}&rdquo;</span>
                      </div>
                    )}

                
                    <div className="topic-card-footer">
                      <button
                        type="button"
                        className="explore-topic-btn"
                        onClick={() => handleTopicSearch(t.topic, t.label)}
                      >
                        <Search size={13} />
                        Explore &ldquo;{t.label}&rdquo; Chats
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          <div className="leaderboard-section">
            <div className="section-title-row">
              <h3>👥 Member Contribution Matrix</h3>
              <span className="section-hint">Who leads in each topic area</span>
            </div>

            <div className="members-grid-cards">
              {members.map((m) => {
                const sm = getSenderMeta(m.sender);
                return (
                  <div key={m.sender} className="member-card">
                    <div className="member-card-header">
                      <span
                        className="member-large-avatar"
                        style={{ backgroundColor: sm.bg, color: sm.color }}
                      >
                        {sm.initials}
                      </span>
                      <div className="member-details">
                        <h4>{m.sender}</h4>
                        <span className="member-stat">
                          {m.messageCount} messages ({m.percentage}% total activity)
                        </span>
                      </div>
                      <span className="member-rank-badge">#{m.rank}</span>
                    </div>

                    <div className="member-fav-topic">
                      <span className="fav-label">Favorite Subject:</span>
                      <span className="fav-val">
                        {m.topTopicLabel} ({m.topTopicCount} msgs)
                      </span>
                    </div>

                    <div className="member-topics-list">
                      {m.topicBreakdown.map((tb) => (
                        <span key={tb.topic} className="member-topic-tag">
                          {tb.label}: <strong>{tb.count}</strong>
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="member-chat-btn"
                      onClick={() => handleMemberSearch(m.sender)}
                    >
                      <Search size={12} />
                      View {m.sender}&apos;s Chats
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
