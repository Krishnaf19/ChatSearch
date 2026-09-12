import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE = '/api';

/**
 * Async thunk to execute search
 */
export const executeSearch = createAsyncThunk(
  'search/executeSearch',
  async (query, { rejectWithValue }) => {
    try {
      const startTime = performance.now();
      const response = await axios.post(`${API_BASE}/search`, { query });
      const durationMs = Math.round(performance.now() - startTime);
      return { ...response.data, durationMs };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message || 'Search failed');
    }
  }
);

/**
 * Async thunk to fetch system status
 */
export const fetchStatus = createAsyncThunk(
  'search/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/status`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message || 'Failed to fetch status');
    }
  }
);

/**
 * Async thunk to fetch all messages
 */
export const fetchAllMessages = createAsyncThunk(
  'search/fetchAllMessages',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/messages`);
      return response.data.messages || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message || 'Failed to fetch messages');
    }
  }
);

/**
 * Async thunk to trigger ingestion
 */
export const runIngest = createAsyncThunk(
  'search/runIngest',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE}/ingest`);
      dispatch(fetchStatus());
      dispatch(fetchAllMessages());
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message || 'Ingestion failed');
    }
  }
);

// Initial mock queries to seed the dashboard history nicely
const DEFAULT_SEARCH_HISTORY = [
  {
    query: 'manali trip kab decide hua',
    tierUsed: 'keyword',
    badge: 'Keyword Match',
    personFilter: null,
    resultsCount: 2,
    durationMs: 4,
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString()
  },
  {
    query: 'rahul ke sath sad baatein',
    tierUsed: 'keyword',
    badge: 'Keyword Match',
    personFilter: 'Rahul',
    resultsCount: 3,
    durationMs: 3,
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString()
  },
  {
    query: 'rahul ke sath adventurous baatein',
    tierUsed: 'semantic',
    badge: 'Semantic Match',
    personFilter: 'Rahul',
    resultsCount: 3,
    durationMs: 8,
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
  }
];

const initialState = {
  query: '',
  status: 'idle',
  error: null,
  response: null,
  
  allMessages: [],
  allMessagesLoading: false,

  searchHistory: DEFAULT_SEARCH_HISTORY,

  systemStatus: {
    isIngested: false,
    messageCount: 0,
    senders: [],
    emotions: [],
    topics: [],
    provider: 'local-semantic'
  },
  systemStatusLoading: false,

  ingestStatus: 'idle',
  ingestMessage: null,

  activeTab: 'dashboard', // Default to 'dashboard' so user immediately sees the great dashboard!
  timelineFilter: 'all',
  timelineSearch: ''
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action) => {
      state.query = action.payload;
    },
    clearSearch: (state) => {
      state.query = '';
      state.status = 'idle';
      state.response = null;
      state.error = null;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setTimelineFilter: (state, action) => {
      state.timelineFilter = action.payload;
    },
    setTimelineSearch: (state, action) => {
      state.timelineSearch = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Search lifecycle
    builder
      .addCase(executeSearch.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(executeSearch.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.response = action.payload;
        
        // Record in search history for the dashboard
        state.searchHistory.unshift({
          query: action.payload.query,
          tierUsed: action.payload.tierUsed,
          badge: action.payload.badge,
          personFilter: action.payload.personFilter,
          resultsCount: action.payload.results.length,
          durationMs: action.payload.durationMs || 5,
          timestamp: new Date().toISOString()
        });
        if (state.searchHistory.length > 20) {
          state.searchHistory.pop();
        }
      })
      .addCase(executeSearch.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'An error occurred during search';
      });

    // Status lifecycle
    builder
      .addCase(fetchStatus.pending, (state) => {
        state.systemStatusLoading = true;
      })
      .addCase(fetchStatus.fulfilled, (state, action) => {
        state.systemStatusLoading = false;
        state.systemStatus = action.payload;
      })
      .addCase(fetchStatus.rejected, (state) => {
        state.systemStatusLoading = false;
      });

    // All messages lifecycle
    builder
      .addCase(fetchAllMessages.pending, (state) => {
        state.allMessagesLoading = true;
      })
      .addCase(fetchAllMessages.fulfilled, (state, action) => {
        state.allMessagesLoading = false;
        state.allMessages = action.payload;
      })
      .addCase(fetchAllMessages.rejected, (state) => {
        state.allMessagesLoading = false;
      });

    // Ingest lifecycle
    builder
      .addCase(runIngest.pending, (state) => {
        state.ingestStatus = 'loading';
        state.ingestMessage = 'Ingesting and indexing messages...';
      })
      .addCase(runIngest.fulfilled, (state, action) => {
        state.ingestStatus = 'succeeded';
        state.ingestMessage = action.payload.message || 'Ingestion completed!';
      })
      .addCase(runIngest.rejected, (state, action) => {
        state.ingestStatus = 'failed';
        state.ingestMessage = action.payload || 'Ingestion failed';
      });
  }
});

export const {
  setQuery,
  clearSearch,
  setActiveTab,
  setTimelineFilter,
  setTimelineSearch
} = searchSlice.actions;

export default searchSlice.reducer;
