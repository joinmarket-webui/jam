// Configuration for Joinmarket API endpoints
interface ApiConfig {
  baseUrl: string;
  websocketUrl: string;
}

const getApiConfig = (): ApiConfig => {
  const isDevelopment = import.meta.env.DEV;

  if (isDevelopment) {
    // In development, use proxy through Vite dev server
    return {
      baseUrl: "", // Empty string means relative to current origin (proxy will handle)
      websocketUrl:
        import.meta.env.VITE_JM_WEBSOCKET_URL || "wss://localhost:28283",
    };
  }

  // In production, you might want to configure these differently
  return {
    baseUrl: import.meta.env.VITE_JM_API_BASE_URL || "https://localhost:28183",
    websocketUrl:
      import.meta.env.VITE_JM_WEBSOCKET_URL || "wss://localhost:28283",
  };
};

export const apiConfig = getApiConfig();
