import axios from "axios";

// -----------------------------------------------------
// BASE URL HANDLING (DEV / DEPLOY)
// -----------------------------------------------------
const isDevelopment = import.meta.env.MODE === "development";

const API_BASE_URL = isDevelopment
  ? import.meta.env.VITE_API_BASE_URL_LOCAL
  : import.meta.env.VITE_API_BASE_URL_DEPLOY;

// MEDIA FIX: The Django backend returns something like "/media/recipes/.."
// Frontend needs full URL.
export function getMediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}

// -----------------------------------------------------
// AXIOS INSTANCE
// -----------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
});

// -----------------------------------------------------
// AUTH: Attach access token
// -----------------------------------------------------
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// -----------------------------------------------------
// AUTH: Auto refresh on 401
// -----------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refresh = localStorage.getItem("refreshToken");
      if (!refresh) {
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        // Correct Django SimpleJWT refresh URL
        const r = await axios.post(`${API_BASE_URL}/token/refresh/`, {
          refresh,
        });

        const newAccess = r.data.access;
        localStorage.setItem("accessToken", newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;

        return api(original);
      } catch (err) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// -----------------------------------------------------
// API WRAPPERS
// -----------------------------------------------------
export const AuthAPI = {
  login: async (username, password) => {
    const res = await api.post("/token/", { username, password });
    localStorage.setItem("accessToken", res.data.access);
    localStorage.setItem("refreshToken", res.data.refresh);
    return res;
  },
  register: (username, password) =>
    api.post("/auth/register", { username, password }),
};

export const RecipesAPI = {
  list: (search = "", category = "") =>
    api.get("/recipes/", {
      params: {
        ...(search && { search }),
        ...(category && { category: category.toLowerCase() }),
      },
    }),

  detail: (id) => api.get(`/recipes/${id}/`),

  create: (data) =>
    api.post("/recipes/", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (id, data) =>
    api.put(`/recipes/${id}/`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  remove: (id) => api.delete(`/recipes/${id}/`),
  mine: () => api.get("/recipes/mine/"),

  like: (id) => api.post(`/recipes/${id}/like/`),
  view: (id) => api.post(`/recipes/${id}/increment_view/`),
};

export const BookmarksAPI = {
  list: () => api.get("/bookmarks/"),
  add: (recipeId) => api.post("/bookmarks/", { recipe_id: recipeId }),
  remove: (bookmarkId) => api.delete(`/bookmarks/${bookmarkId}/`),
};

export const CommentsAPI = {
  list: (recipeId) => api.get(`/recipes/${recipeId}/comments`),
  add: (recipeId, text) => api.post(`/recipes/${recipeId}/comments`, { text }),
};

export default api;
