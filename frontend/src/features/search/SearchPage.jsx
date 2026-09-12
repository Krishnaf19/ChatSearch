import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  executeSearch,
  fetchStatus,
  fetchAllMessages,
  runIngest,
  setQuery,
  clearSearch,
  setActiveTab
} from './searchSlice';
import MemoriesPage from '../memories/MemoriesPage';
import {
  Sparkles,
  Zap,
  RefreshCw,
  MessageSquare,
  X,
  CalendarCheck,
  Calendar,
  Compass,
  HeartCrack,
  Coffee,
  BriefcaseBusiness,
  ChevronDown,
  SearchX,
  Search
} from 'lucide-react';

const QUICK_TOPICS = [
  {
    id: 'manali',
    title: 'Manali Decision',
    subtitle: 'Cottage booking agreement',
    query: 'manali trip kab decide hua',
    tier: 'Keyword',
    tag: 'Travel',
    members: ['Rohan', 'Priya', 'Rahul', 'Kabir', 'Ananya'],
    icon: CalendarCheck
  },
  {
    id: 'sadness',
    title: 'Rahul\u2019s Sad Talk',
    subtitle: 'Startup layoff & burnout venting',
    query: 'rahul ke sath sad baatein',
    tier: 'Emotion',
    tag: 'Support',
    members: ['Rahul', 'Kabir'],
    icon: HeartCrack
  },
  {
    id: 'adventure',
    title: 'Adventurous Talks',
    subtitle: '35ft cliff jump & river rapids',
    query: 'rahul ke sath adventurous baatein',
    tier: 'Semantic',
    tag: 'Adventure',
    members: ['Rahul', 'Kabir'],
    icon: Compass
  },
  {
    id: 'murthal',
    title: 'Murthal Drive',
    subtitle: 'Midnight butter paranthe & chai',
    query: 'weekend late night drive murthal',
    tier: 'Keyword',
    tag: 'Food',
    members: ['Rohan', 'Kabir', 'Ananya', 'Rahul'],
    icon: Coffee
  },
  {
    id: 'work-stress',
    title: 'Work Stress Talk',
    subtitle: 'Late-night project pressure and burnout',
    query: 'rahul or rohan ke sath work stress discussion',
    tier: 'Semantic',
    tag: 'Work',
    members: ['Rahul', 'Rohan', 'Kabir'],
    icon: BriefcaseBusiness
  }
];

const SENDER_COLORS = {
  Rohan: { color: '#0284c7', bg: '#e0f2fe', initials: 'Ro' },
  Rahul: { color: '#4338ca', bg: '#e0e7ff', initials: 'Ra' },
  Kabir: { color: '#059669', bg: '#dcfce7', initials: 'Ka' },
  Priya: { color: '#db2777', bg: '#fce7f3', initials: 'Pr' },
  Ananya: { color: '#d97706', bg: '#fef3c7', initials: 'An' }
};

export default function SearchPage() {
  const dispatch = useDispatch();
  const {
    query,
    status,
    response,
    ingestStatus,
    ingestMessage,
    activeTab
  } = useSelector((state) => state.search);

  const [activeCard, setActiveCard] = useState('manali');
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    dispatch(fetchStatus());
    dispatch(fetchAllMessages());
    dispatch(executeSearch('manali trip kab decide hua'));
  }, [dispatch]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setVisibleCount(3);
    dispatch(executeSearch(query.trim()));
  };

  const handleCardClick = (card) => {
    setActiveCard(card.id);
    setVisibleCount(3);
    dispatch(setQuery(card.query));
    dispatch(executeSearch(card.query));
  };

  const handleClear = () => {
    dispatch(clearSearch());
    setActiveCard(null);
    setVisibleCount(3);
  };

  const getSenderMeta = (sender) =>
    SENDER_COLORS[sender] || { color: '#475569', bg: '#f1f5f9', initials: sender?.[0] || '?' };

  const formatTimestamp = (isoString) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const results = response?.results || [];
  const displayedResults = results.slice(0, visibleCount);
  const hasMoreToView = results.length > visibleCount;

  return (
    <div className="search-page">
      {/* Header */}
      <header className="page-header">
        <div className="brand">
          <div className="brand-icon">
            <MessageSquare size={18} />
          </div>
          <h1>searchChat</h1>
        </div>

        <div className="header-actions">
          <span className="sync-badge">📦 5,000 chats synced</span>
          <button
            className="reindex-btn"
            onClick={() => dispatch(runIngest())}
            disabled={ingestStatus === 'loading'}
          >
            <RefreshCw size={13} className={ingestStatus === 'loading' ? 'spinning' : ''} />
            {ingestStatus === 'loading' ? 'Indexing\u2026' : 'Re-index'}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs-container">
        <button
          type="button"
          className={`nav-tab-btn${activeTab === 'search' ? ' active' : ''}`}
          onClick={() => dispatch(setActiveTab('search'))}
        >
          <Search size={15} />
          <span>Search Conversations</span>
        </button>
        <button
          type="button"
          className={`nav-tab-btn${activeTab === 'memories' ? ' active' : ''}`}
          onClick={() => dispatch(setActiveTab('memories'))}
        >
          <Sparkles size={15} />
          <span>Group Highlights & &ldquo;On This Day&rdquo;</span>
          <span className="nav-tab-badge">Memories</span>
        </button>
      </nav>

      {activeTab === 'memories' ? (
        <MemoriesPage />
      ) : (
        <>
          {/* Search */}
      <section className="search-section">
        <div className="search-intro">
          <h2>Find the right conversation</h2>
          <p>
            Search through your group chat history to quickly locate decisions, emotions,
            plans, and memorable moments shared by everyone.
            <span>Jump into the exact thread, review the surrounding context, and understand what happened in seconds.</span>
          </p>
        </div>

        <form className="search-bar" onSubmit={handleSearchSubmit}>

          <input
            type="text"
            placeholder="Search by topic, emotion, person, or memory…"
            value={query}
            onChange={(e) => dispatch(setQuery(e.target.value))}
          />
          {query && (
            <button type="button" className="clear-btn" onClick={handleClear}>
              <X size={15} />
            </button>
          )}
          <button type="submit" className="submit-btn">Search</button>
        </form>

        {ingestMessage && <div className="ingest-toast">{ingestMessage}</div>}
      </section>

      {/* Quick Topics */}
      <section className="quick-topics">
        <div className="section-label">Quick Access</div>
        <div className="topics-grid">
          {QUICK_TOPICS.map((item) => {
            const isActive = activeCard === item.id;
            return (
              <div
                key={item.id}
                className={`topic-card${isActive ? ' active' : ''}`}
                onClick={() => handleCardClick(item)}
              >
                <div className="tag">{item.tag}</div>
                <div className="title">{item.title}</div>
                <div className="subtitle">{item.subtitle}</div>
                <div className="members">
                  {item.members.map((name) => {
                    const m = getSenderMeta(name);
                    return (
                      <span
                        key={name}
                        className="member-avatar"
                        title={name}
                        style={{
                          backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : m.bg,
                          color: isActive ? '#fff' : m.color
                        }}
                      >
                        {m.initials}
                      </span>
                    );
                  })}
                </div>
                <div className="tier-label">{item.tier}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Search Results */}
      <section className="results-section">
        <div className="results-header">
          <div className="section-label">
            {status === 'loading'
              ? 'Searching…'
              : response && results.length > 0
              ? `Results — ${results.length} relevant ${results.length === 1 ? 'chat' : 'chats'} found (showing ${displayedResults.length})`
              : 'Results'}
          </div>

          {response && response.badge && results.length > 0 && (
            <div className={`tier-badge ${response.tierUsed || 'semantic'}`}>
              {response.badge}
            </div>
          )}
        </div>

        {status === 'loading' && (
          <div className="loading-indicator">
            <RefreshCw size={18} className="spinning" />
            Searching - Find right conversation
          </div>
        )}

        {/* No Results Empty State */}
        {status === 'succeeded' && response && results.length === 0 && (
          <div className="no-results-card">
            <div className="no-results-icon">
              <SearchX size={32} />
            </div>
            <h3>No matching conversations found</h3>
            <p>
              {response.message || `No mentions or semantic matches found for "${response.query}".`}
            </p>
            <div className="no-results-suggestions">
              <span>Try searching for:</span>
              <button type="button" onClick={() => handleCardClick(QUICK_TOPICS[0])}>Manali trip</button>
              <button type="button" onClick={() => handleCardClick(QUICK_TOPICS[1])}>Rahul sad talk</button>
              <button type="button" onClick={() => handleCardClick(QUICK_TOPICS[2])}>Adventurous talks</button>
              <button type="button" onClick={() => handleCardClick(QUICK_TOPICS[3])}>Murthal drive</button>
            </div>
          </div>
        )}

        {/* Display up to visibleCount chats */}
        {status === 'succeeded' && response && displayedResults.length > 0 &&
          displayedResults.map((item, idx) => {
            const focal = item.matchedMessage;
            const sm = getSenderMeta(focal.sender);

            return (
              <div key={focal.id || idx} className="thread-card">
                <div className="thread-focal">
                  <div className="focal-header">
                    <div className="focal-sender">
                      <span className="avatar" style={{ backgroundColor: sm.bg, color: sm.color }}>
                        {sm.initials}
                      </span>
                      <div className="sender-info">
                        <span className="user-tag">Chat by</span>
                        <span className="name">{focal.sender}</span>
                        <span className="time">{formatTimestamp(focal.timestamp)}</span>
                      </div>
                    </div>
                    <span className="match-badge">Match #{idx + 1}</span>
                  </div>

                  <div className="focal-quote">&ldquo;{focal.text}&rdquo;</div>

                  <div className="focal-reason">
                    <strong>Why: </strong>{item.reason}
                  </div>
                </div>

                {item.contextWindow && item.contextWindow.length > 0 && (
                  <div className="context-thread">
                    <div className="context-label">
                      Thread · {item.contextWindow.length} messages
                    </div>
                    <div className="context-messages">
                      {item.contextWindow.map((msg) => {
                        const isFocal = msg.id === focal.id;
                        const mm = getSenderMeta(msg.sender);
                        return (
                          <div key={msg.id} className={`context-msg${isFocal ? ' is-focal' : ''}`}>
                            <span className="avatar" style={{ backgroundColor: mm.bg, color: mm.color }}>
                              {mm.initials}
                            </span>
                            <div className="msg-body">
                              <div className="msg-meta">
                                <span className="author" style={{ color: mm.color }}>{msg.sender}</span>
                                <span className="time">{formatTimestamp(msg.timestamp)}</span>
                                {isFocal && <span className="focal-tag">MATCH</span>}
                              </div>
                              <p className="msg-text">{msg.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        }

        {/* View More Chats Button */}
        {hasMoreToView && (
          <div className="view-more-container">
            <button
              type="button"
              className="view-more-btn"
              onClick={() => setVisibleCount((prev) => prev + 3)}
            >
              <ChevronDown size={16} />
              View More Chats ({results.length - visibleCount} remaining)
            </button>
          </div>
        )}

        {/* All shown notice */}
        {!hasMoreToView && results.length > 3 && (
          <div className="all-shown-badge">
            ✓ All {results.length} relevant chats displayed
          </div>
        )}
      </section>
        </>
      )}
    </div>
  );
}
