import axios from 'axios';

interface User {
  token: string;
}

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

API.interceptors.request.use((req) => {
  const stored = localStorage.getItem('user');
  if (stored) {
    const user: User = JSON.parse(stored);
    if (user?.token) {
      req.headers.Authorization = `Bearer ${user.token}`;
    }
  }
  return req;
});

export default API;
