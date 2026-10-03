import axiosClient from "./axiosClient";

/**
 * Adapts our axios instance (with its auth header + refresh interceptors) to
 * RTK Query's baseQuery interface, so every endpoint gets caching,
 * invalidation, and loading states for free without giving up the
 * interceptor logic already built into axiosClient.
 */
const axiosBaseQuery =
  () =>
  async ({ url, method = "GET", data, params }) => {
    try {
      const result = await axiosClient({ url, method, data, params });
      return { data: result.data };
    } catch (axiosError) {
      return {
        error: {
          status: axiosError.response?.status,
          data: axiosError.response?.data?.error || { message: axiosError.message },
        },
      };
    }
  };

export default axiosBaseQuery;
