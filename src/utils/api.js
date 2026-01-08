import axios from "axios";

// Determine base URL dynamically based on environment
const isDevelopment = import.meta.env.MODE === 'development';
const baseURL = isDevelopment 
  ? import.meta.env.VITE_API_BASE_URL_LOCAL 
  : import.meta.env.VITE_API_BASE_URL_DEPLOY;

const api = axios.create({
  baseURL, // use dynamic URL now
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 errors by refreshing the token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refreshToken");

      if (refresh) {
        try {
          const res = await axios.post(`${baseURL}/auth/login/refresh`, {
            refresh,
          });
          const newAccess = res.data.access;
          localStorage.setItem("accessToken", newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch (err) {
          // Refresh failed → clear tokens and redirect to login
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export const AuthAPI = {
  login: async (username, password) => {
    const res = await api.post("/auth/login", { username, password });
    // Save both access and refresh tokens
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
        ...(search ? { search } : {}),
        ...(category ? { category: category.toLowerCase() } : {}), // force lowercase
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
