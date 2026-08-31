import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api' });

API.interceptors.request.use((req) => {
  const token = useAuthStore.getState().user?.token;
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});



export default API;
