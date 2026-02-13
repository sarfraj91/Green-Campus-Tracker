const normalizeBaseUrl = (value) => (value || "").trim().replace(/\/+$/, "");

const API_BASE_URL =
  normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL) || "http://127.0.0.1:8000";

export const USERS_API_BASE = `${API_BASE_URL}/api/users`;
export const TREES_API_BASE = `${API_BASE_URL}/api/trees`;
