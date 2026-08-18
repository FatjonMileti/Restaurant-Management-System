import axios, { AxiosError } from 'axios';

interface User {
  token: string;
}

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api' });

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

API.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (!error.response) {
      return Promise.reject(new Error('Unable to reach the server. Please try again later.'));
    }
    return Promise.reject(error);
  }
);

export default API;
