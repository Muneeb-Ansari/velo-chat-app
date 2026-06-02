import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
};

// Rooms
export const roomsApi = {
  list: () => api.get('/api/rooms'),
  create: (data: { name: string; description?: string; type: 'group' | 'direct'; memberIds: string[] }) =>
    api.post('/api/rooms', data),
  messages: (roomId: string, params?: { limit?: number; before?: string }) =>
    api.get(`/api/rooms/${roomId}/messages`, { params }),
  join: (roomId: string) => api.post(`/api/rooms/${roomId}/join`),
  delete: (roomId: string) => api.delete(`/api/rooms/${roomId}`),
};

// Users
export const usersApi = {
  search: (q: string) => api.get('/api/users/search', { params: { q } }),
  list: () => api.get('/api/users'),
  update: (userId: string, data: FormData) =>
    api.put(`/api/users/${userId}`, data),
};
  