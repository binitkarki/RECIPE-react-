import axios from "axios";

const isDevelopment = import.meta.env.MODE === "development";
const API_URL = isDevelopment
  ? import.meta.env.VITE_API_BASE_URL_LOCAL
  : import.meta.env.VITE_API_BASE_URL_DEPLOY;

// Signup user
export async function signup(username, password) {
  // Correct URL with trailing slash
  return axios.post(`${API_URL}/auth/register/`, { username, password });
}

// Login user
export async function login(username, password) {
  // SimpleJWT login endpoint
  const res = await axios.post(`${API_URL}/token/`, { username, password });
  localStorage.setItem("accessToken", res.data.access);
  localStorage.setItem("refreshToken", res.data.refresh);
  return res.data;
}

// Get Authorization header
export function getAuthHeader() {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
