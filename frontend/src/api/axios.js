import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors
// NOTE: We do NOT aggressively redirect on 401 here.
// The useAuth hook handles token invalidation properly.
// Force-redirecting here was causing race conditions and infinite login loops
// when the /users/me call failed during initial auth check.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Redirect to login if we get a 401 or 403 AND we're not already on the login page
    // AND the request was NOT the initial /users/me auth check (handled by useAuth)
    const status = error.response?.status;
    const errorCode = error.response?.data?.errorCode;

    if (status === 401 || (status === 403 && errorCode !== 'PROFILE_INCOMPLETE')) {
      const isAuthCheck = error.config?.url?.includes('users/me');
      const isAlreadyOnLogin = window.location.pathname === '/login';

      if (!isAlreadyOnLogin && !isAuthCheck) {
        localStorage.removeItem('token');
        // Use location.href for a clean reload/redirect
        window.location.href = '/login?reason=session_expired';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
