import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/tips';

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAllTips = () => api.get(BASE_URL);
export const getTipOfTheDay = () => api.get(`${BASE_URL}/tip-of-the-day`);
export const searchTips = (query) => api.get(`${BASE_URL}/search?title=${query}`);
export const addTip = async (tip) => {
  try {
    const response = await api.post(BASE_URL, tip, { headers: getAuthHeaders() });
    return response;
  } catch (error) {
    console.error('API Error:', error.response || error);
    throw error;
  }
};
export const updateTip = (id, tip) => api.put(`${BASE_URL}/${id}`, tip, { headers: getAuthHeaders() });
export const deleteTip = (id) => api.delete(`${BASE_URL}/${id}`, { headers: getAuthHeaders() });
export const rateTip = (id, rating, userId) => api.put(`${BASE_URL}/${id}/rate?rating=${rating}&userId=${userId}`, null, { headers: getAuthHeaders() });
export const getFeaturedTips = () => api.get(`${BASE_URL}/featured`);
export const getTipsByCategory = (category) => api.get(`${BASE_URL}/category?category=${category}`);
export const getUserRating = (tipId, userId) => api.get(`${BASE_URL}/${tipId}/user-rating?userId=${userId}`);

// New: Get tips for current user
export const getMyTips = () => api.get(`${BASE_URL}/my`, { headers: getAuthHeaders() });

// Tip Comments API
export const getTipComments = (tipId) => api.get(`${BASE_URL}/${tipId}/comments`);
export const addTipComment = (tipId, comment) =>
  api.post(`${BASE_URL}/${tipId}/comments`, comment, { headers: getAuthHeaders() });
export const updateTipComment = (tipId, commentId, comment) =>
  api.put(`${BASE_URL}/${tipId}/comments/${commentId}`, comment, { headers: getAuthHeaders() });
export const deleteTipComment = (tipId, commentId) =>
  api.delete(`${BASE_URL}/${tipId}/comments/${commentId}`, { headers: getAuthHeaders() });
