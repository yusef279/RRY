import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000",
  withCredentials: true, // send/receive cookies
});

// If there's a token in localStorage, use it on initial load
if (typeof window !== "undefined") {
  const token = localStorage.getItem("access_token");
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }
}

export { api };
export default api;
