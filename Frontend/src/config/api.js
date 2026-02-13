const normalizeBaseUrl = (value) => (value || "").trim().replace(/\/+$/, "");

const DEFAULT_PROD_API_BASE_URL = "https://green-campus-tracker.onrender.com";

const API_BASE_URL =
  normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL) ||
  (import.meta.env.PROD ? DEFAULT_PROD_API_BASE_URL : "http://127.0.0.1:8000");

export const USERS_API_BASE = `${API_BASE_URL}/api/users`;
export const TREES_API_BASE = `${API_BASE_URL}/api/trees`;
