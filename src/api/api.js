import axios from 'axios';
import { NOCODB_API_TOKEN, NOCODB_BASE_URL } from '../constants/index.js';

const api = axios.create({
  baseURL: NOCODB_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'xc-token': NOCODB_API_TOKEN,
  },
});

export default api;
