// src/utils/image.js

export function getImageUrl(path) {
  if (!path) return "";

  const base =
    import.meta.env.MODE === "development"
      ? "http://localhost:8000" // your Django local server
      : import.meta.env.VITE_API_BASE_URL_DEPLOY; // Render backend, NO /api here

  return `${base}${path}`;
}
