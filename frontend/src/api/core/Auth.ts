// src/api/core/auth.ts
import axios from 'axios';
import { OpenAPI } from './OpenAPI';

export const ACCESS_KEY = 'access_token';

// central single place to set/clear tokens:
export function setAccessToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(ACCESS_KEY, token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      OpenAPI.TOKEN = token;
    } else {
      localStorage.removeItem(ACCESS_KEY);
      delete axios.defaults.headers.common['Authorization'];
      // @ts-ignore
      OpenAPI.TOKEN = undefined;
    }
  } catch (e) {
    // ignore storage errors
    console.error('setAccessToken error', e);
  }
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}
