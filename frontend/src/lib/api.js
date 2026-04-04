import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = axios.create({ baseURL: `${BACKEND_URL}/api` });

export const api = {
  // Settings
  getSettings: () => API.get('/settings').then(r => r.data),
  updateSettings: (data) => API.put('/settings', data).then(r => r.data),

  // Watchlist
  getWatchlist: () => API.get('/watchlist').then(r => r.data),
  addWatchlistItem: (data) => API.post('/watchlist', data).then(r => r.data),
  updateWatchlistItem: (id, data) => API.put(`/watchlist/${id}`, data).then(r => r.data),
  deleteWatchlistItem: (id) => API.delete(`/watchlist/${id}`).then(r => r.data),
  refreshWatchlist: () => API.post('/watchlist/refresh').then(r => r.data),
  refreshTicker: (id) => API.post(`/watchlist/refresh/${id}`).then(r => r.data),
  searchTicker: (q) => API.get(`/watchlist/search?q=${q}`).then(r => r.data),

  // Trades
  getTrades: (status) => API.get('/trades', { params: status ? { status } : {} }).then(r => r.data),
  createTrade: (data) => API.post('/trades', data).then(r => r.data),
  updateTrade: (id, data) => API.put(`/trades/${id}`, data).then(r => r.data),
  deleteTrade: (id) => API.delete(`/trades/${id}`).then(r => r.data),
  closeTrade: (id, data) => API.post(`/trades/${id}/close`, data).then(r => r.data),

  // Analytics
  getAnalytics: () => API.get('/analytics').then(r => r.data),
};
