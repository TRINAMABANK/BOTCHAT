import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Global fetch interceptor to transparently attach Admin Token for authenticated API calls
const originalFetch = window.fetch;
window.fetch = async function(input, init = {}) {
  const token = sessionStorage.getItem('triai_admin_token');
  if (token) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      init = init || {};
      init.headers = init.headers || {};
      if (init.headers instanceof Headers) {
        if (!init.headers.has('Authorization')) {
          init.headers.set('Authorization', `Bearer ${token}`);
        }
      } else if (Array.isArray(init.headers)) {
        if (!init.headers.some(([k]) => k.toLowerCase() === 'authorization')) {
          init.headers.push(['Authorization', `Bearer ${token}`]);
        }
      } else {
        if (!init.headers['Authorization'] && !init.headers['authorization']) {
          init.headers['Authorization'] = `Bearer ${token}`;
        }
      }
    } else if (input instanceof Request && input.url && input.url.includes('/api/')) {
      if (!input.headers.has('Authorization')) {
        input.headers.set('Authorization', `Bearer ${token}`);
      }
    }
  }
  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
