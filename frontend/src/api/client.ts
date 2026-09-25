import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data?.error) {
      if (typeof data.error === "string") return data.error;
      if (data.error.formErrors?.length) return data.error.formErrors.join(", ");
      if (data.error.fieldErrors) {
        const first = Object.values(data.error.fieldErrors).flat()[0];
        if (first) return String(first);
      }
    }
    if (err.code === "ERR_NETWORK") return "Cannot reach the server. Is the backend running?";
    return `Request failed (${err.response?.status ?? "unknown"})`;
  }
  return "Something went wrong";
}

export default api;