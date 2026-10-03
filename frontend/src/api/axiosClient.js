import axios from "axios";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const axiosClient = axios.create({ baseURL: baseUrl });
const refreshClient = axios.create({ baseURL: baseUrl });

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("lms_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retried || original.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }
    original._retried = true;

    const refreshToken = localStorage.getItem("lms_refresh_token");
    if (!refreshToken) {
      localStorage.removeItem("lms_access_token");
      localStorage.removeItem("lms_refresh_token");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    try {
      refreshPromise = refreshPromise || refreshClient.post("/auth/refresh", { refreshToken }).finally(() => { refreshPromise = null; });
      const { data } = await refreshPromise;
      localStorage.setItem("lms_access_token", data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return axiosClient(original);
    } catch (refreshError) {
      localStorage.removeItem("lms_access_token");
      localStorage.removeItem("lms_refresh_token");
      window.location.href = "/login";
      return Promise.reject(refreshError);
    }
  }
);

export default axiosClient;
