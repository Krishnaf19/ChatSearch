import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMemories, setSelectedMemoryDate, setQuery, executeSearch, setActiveTab } from '../search/searchSlice';
import {
  Calendar,
  Sparkles,
  Clock,
  Heart,
  Compass,
  MessageCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Award,
  Flame,
  CalendarCheck
} from 'lucide-react';

const SENDER_COLORS = {
  Rohan: { color: '#0284c7', bg: '#e0f2fe', initials: 'Ro' },
  Rahul: { color: '#4338ca', bg: '#e0e7ff', initials: 'Ra' },
  Kabir: { color: '#059669', bg: '#dcfce7', initials: 'Ka' },
  Priya: { color: '#db2777', bg: '#fce7f3', initials: 'Pr' },
  Ananya: { color: '#d97706', bg: '#fef3c7', initials: 'An' }
};

export default function MemoriesPage() {
  const dispatch = useDispatch();
  const { memoriesData, memoriesLoading, selectedMemoryDate } = useSelector((state) => state.search);

  const [activeFilter, setActiveFilter] = useState('highlights'); // 'highlights' or specific date
  const [expandedThreads, setExpandedThreads] = useState({});

  useEffect(() => {
    dispatch(fetchMemories(activeFilter === 'highlights' ? null : selectedMemoryDate));
  }, [dispatch, activeFilter, selectedMemoryDate]);

  const toggleThread = (id) => {
    setExpandedThreads((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectDate = (dateStr) => {
    setActiveFilter(dateStr);
    dispatch(setSelectedMemoryDate(dateStr));
    dispatch(fetchMemories(dateStr));
  };

  const handleOpenInSearch = (text) => {
    dispatch(setQuery(text));
    dispatch(executeSearch(text));
    dispatch(setActiveTab('search'));
  };

  const getSenderMeta = (sender) =>
    SENDER_COLORS[sender] || { color: '#475569', bg: '#f1f5f9', initials: sender?.[0] || '?' };

  const formatTimestamp = (isoString) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const highlights = memoriesData?.highlights || [];
  const onThisDay = memoriesData?.onThisDay || [];
  const availableDates = memoriesData?.availableDates || [];

  const displayList = activeFilter === 'highlights' ? highlights : onThisDay;

  return (
    <div className="memories-container">
      {/* Intro Header */}
      <div className="memories-header">
        <div className="memories-badge">
          <Sparkles size={14} />
          <span>Group Highlights & Memories</span>
        </div>
        <h2>&ldquo;On This Day&rdquo; Throwbacks</h2>
        <p>
          Resurface iconic conversations, major trip plans, emotional late-night support,
          and unforgettable adventures shared by the group over the months and years.
        </p>
      </div>

      {/* Date & Filter Navigation Bar */}
      <div className="memories-filter-bar">
        <div className="filter-chips">
          <button
            type="button"
            className={`filter-chip${activeFilter === 'highlights' ? ' active' : ''}`}
            onClick={() => {
              setActiveFilter('highlights');
              dispatch(fetchMemories(null));
            }}
          >
            <Award size={14} />
            ⭐ All-Time Highlights ({highlights.length})
          </button>

          {availableDates.map((d) => {
            const isSelected = activeFilter === d.date;
            return (
              <button
                key={d.date}
                type="button"
                className={`filter-chip date-chip${isSelected ? ' active' : ''}`}
                onClick={() => handleSelectDate(d.date)}
              >
                <Calendar size={13} />
                <span>{d.monthDay}</span>
                <span className="chip-count">({d.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      {memoriesLoading ? (
        <div className="loading-indicator">
          <Clock size={20} className="spinning" />
          Fetching group memories & highlights…
        </div>
      ) : displayList.length === 0 ? (
        <div className="no-memories-card">
          <CalendarCheck size={36} />
          <h3>No recorded memories on this exact day</h3>
          <p>Try switching to &ldquo;All-Time Highlights&rdquo; or explore another date from the chat history above.</p>
          <button
            type="button"
            className="submit-btn"
            onClick={() => setActiveFilter('highlights')}
          >
            View All-Time Highlights
          </button>
        </div>
      ) : (
        <div className="memories-grid">
          {displayList.map((item, idx) => {
            const focal = item.matchedMessage;
            const sm = getSenderMeta(focal.sender);
            const isExpanded = expandedThreads[item.id] !== false; // default expanded for rich view

            return (
              <div key={item.id || idx} className="memory-card">
                {/* Memory Top Ribbon */}
                <div className="memory-ribbon">
                  <div className="memory-meta-left">
                    <span className="memory-category-tag">
                      {item.category || 'Group Memory'}
                    </span>
                    {item.badge && <span className="memory-badge-pill">{item.badge}</span>}
                  </div>
                  <div className="memory-timeframe">
                    <Clock size={13} />
                    <span>{item.relativeTime || 'Memory'}</span>
                    <span className="memory-date">({item.dateFormatted})</span>
                  </div>
                </div>

                {/* Milestone Title & Summary */}
                {item.title && (
                  <div className="memory-headline">
                    <h3>{item.title}</h3>
                    {item.subtitle && <p>{item.subtitle}</p>}
                  </div>
                )}

                {/* Focal Quote Card */}
                <div className="memory-focal-box">
                  <div className="memory-sender-row">
                    <div className="sender-avatar" style={{ backgroundColor: sm.bg, color: sm.color }}>
                      {sm.initials}
                    </div>
                    <div className="sender-details">
                      <span className="sender-name">{focal.sender}</span>
                      <span className="sender-timestamp">{formatTimestamp(focal.timestamp)}</span>
                    </div>
                    {focal.emotion && (
                      <span className={`emotion-pill emotion-${focal.emotion}`}>
                        {focal.emotion}
                      </span>
                    )}
                    {focal.topic && (
                      <span className="topic-pill">
                        #{focal.topic}
                      </span>
                    )}
                  </div>

                  <blockquote className="memory-quote">
                    &ldquo;{focal.text}&rdquo;
                  </blockquote>

                  <div className="memory-actions">
                    <button
                      type="button"
                      className="search-link-btn"
                      onClick={() => handleOpenInSearch(focal.text)}
                    >
                      <Search size={13} />
                      Find similar in chat
                    </button>
                    {item.contextWindow && item.contextWindow.length > 1 && (
                      <button
                        type="button"
                        className="toggle-thread-btn"
                        onClick={() => toggleThread(item.id)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={14} />
                            Hide Context ({item.contextWindow.length} msgs)
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} />
                            Show Full Thread ({item.contextWindow.length} msgs)
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Surrounding Context Thread */}
                {isExpanded && item.contextWindow && item.contextWindow.length > 0 && (
                  <div className="memory-thread-context">
                    <div className="thread-title">
                      <MessageCircle size={13} />
                      <span>Full Thread Context</span>
                    </div>
                    <div className="context-messages-list">
                      {item.contextWindow.map((ctx) => {
                        const isMatch = ctx.id === focal.id;
                        const cm = getSenderMeta(ctx.sender);
                        return (
                          <div
                            key={ctx.id}
                            className={`context-msg-row${isMatch ? ' is-focal-msg' : ''}`}
                          >
                            <span
                              className="context-avatar"
                              style={{ backgroundColor: cm.bg, color: cm.color }}
                            >
                              {cm.initials}
                            </span>
                            <div className="context-content">
                              <div className="context-header">
                                <span className="ctx-author" style={{ color: cm.color }}>
                                  {ctx.sender}
                                </span>
                                <span className="ctx-time">{formatTimestamp(ctx.timestamp)}</span>
                                {isMatch && <span className="focal-marker">FEATURED MOMENT</span>}
                              </div>
                              <div className="ctx-text">{ctx.text}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
