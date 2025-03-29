import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1', // Fallback if env var is missing
});

// Interceptor to add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle 401 Unauthorized (e.g., redirect to login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      console.error('Unauthorized request. Logging out or redirecting...');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('currentUser');
      // Redirect to login page, possibly preserving the intended destination
      // Use window.location.replace to prevent back button issues
      if (!window.location.pathname.includes('/login')) {
         window.location.replace(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
    }
    return Promise.reject(error);
  }
);


export default api;

// Specific API call functions (examples)
export const loginUser = (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // FastAPI OAuth2PasswordRequestForm expects 'username'
    formData.append('password', password);
    return api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
};

export const googleLogin = (redirectUri = window.location.origin, clientScope = '') => {
    // Construct the backend Google login URL with necessary params
    const params = new URLSearchParams();
    if (redirectUri) params.append('redirect_uri', redirectUri);
    if (clientScope) params.append('client_scope', clientScope);
    const queryString = params.toString();
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/login/google${queryString ? '?' + queryString : ''}`;
};


export const fetchCurrentUser = () => api.get('/auth/me');

export const fetchUsers = (skip = 0, limit = 100) => api.get(`/users?skip=${skip}&limit=${limit}`);
export const createUser = (userData) => api.post('/users', userData);
export const updateUser = (userId, userData) => api.put(`/users/${userId}`, userData);
export const deleteUser = (userId) => api.delete(`/users/${userId}`);

export const saveFrontendData = (data) => api.post('/cookies', { data });
export const loadFrontendData = () => api.get('/cookies');