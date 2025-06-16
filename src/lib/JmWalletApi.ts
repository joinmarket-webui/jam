import axios from "axios";
import type { AxiosInstance } from "axios";
import { apiConfig } from "./config";
import { getSession as getStoredSession } from "./session";

// Create axios instance with base configuration
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: apiConfig.baseUrl,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor to add auth token
  instance.interceptors.request.use(
    (config) => {
      const session = getStoredSession();
      if (session?.auth?.token) {
        config.headers.Authorization = `Bearer ${session.auth.token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Handle unauthorized - maybe clear session and redirect to login
        console.error("Unauthorized request - clearing session");
        // You might want to dispatch a logout action here
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

const api = createApiInstance();

// Types for API responses
export interface WalletListResponse {
  wallets: string[];
}

export interface UnlockWalletResponse {
  walletname: string;
  token: string;
}

export interface CreateWalletResponse {
  walletname: string;
  token: string;
  seedphrase: string;
}

export interface SessionResponse {
  session: boolean;
  wallet_name: string;
  maker_running: boolean;
  coinjoin_in_process: boolean;
  schedule_in_process: boolean;
}

export interface WalletDisplayResponse {
  walletinfo: {
    wallet_name: string;
    total_balance: string;
    available_balance: string;
    accounts: Array<{
      account: string;
      account_balance: string;
      available_balance: string;
    }>;
  };
}

export interface AddressResponse {
  address: string;
}

export interface LockWalletResponse {
  walletname: string;
  already_locked: boolean;
}

// API function to get all available wallets
export const getWalletAll = async (): Promise<WalletListResponse> => {
  try {
    const response = await api.get("/api/v1/wallet/all");
    return response.data;
  } catch (error) {
    console.error("Error fetching wallets:", error);
    throw error;
  }
};

// API function to unlock a wallet
export const unlockWallet = async (
  walletFileName: string,
  password: string
): Promise<UnlockWalletResponse> => {
  try {
    const response = await api.post(
      `/api/v1/wallet/${encodeURIComponent(walletFileName)}/unlock`,
      { password }
    );
    return response.data;
  } catch (error) {
    console.error("Error unlocking wallet:", error);
    throw error;
  }
};

// API function to create a new wallet
export const createWallet = async (
  walletName: string,
  password: string,
  walletType: string = "sw-fb"
): Promise<CreateWalletResponse> => {
  try {
    // Create a completely fresh axios instance without any interceptors
    const freshAxios = axios.create({
      baseURL: apiConfig.baseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await freshAxios.post("/api/v1/wallet/create", {
      walletname: walletName,
      password,
      wallettype: walletType,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating wallet:", error);
    throw error;
  }
};

// API function to lock a wallet
export const lockWallet = async (
  walletName: string
): Promise<LockWalletResponse> => {
  try {
    const response = await api.get(
      `/api/v1/wallet/${encodeURIComponent(walletName)}/lock`
    );
    return response.data;
  } catch (error) {
    console.error("Error locking wallet:", error);
    throw error;
  }
};

// API function to get session information
export const getJmSession = async (): Promise<SessionResponse> => {
  try {
    // Create a completely fresh axios instance without any interceptors
    const freshAxios = axios.create({
      baseURL: apiConfig.baseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await freshAxios.get("/api/v1/session");
    return response.data;
  } catch (error) {
    console.error("Error fetching session:", error);
    throw error;
  }
};

// API function to get wallet display information
export const getWalletDisplay = async (
  walletName: string
): Promise<WalletDisplayResponse> => {
  try {
    const response = await api.get(
      `/api/v1/wallet/${encodeURIComponent(walletName)}/display`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching wallet display:", error);
    throw error;
  }
};

// API function to get a new address
export const getNewAddress = async (
  walletName: string,
  mixdepth: number = 0
): Promise<AddressResponse> => {
  try {
    const response = await api.get(
      `/api/v1/wallet/${encodeURIComponent(walletName)}/address/new/${mixdepth}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching new address:", error);
    throw error;
  }
};

// API function to start maker service
export const startMaker = async (
  walletName: string,
  config: {
    txfee?: string;
    cjfee_a?: string;
    cjfee_r?: string;
    ordertype?: string;
    minsize?: string;
  } = {}
): Promise<Record<string, unknown>> => {
  try {
    const defaultConfig = {
      txfee: "0",
      cjfee_a: "250",
      cjfee_r: "0.0003",
      ordertype: "sw0absoffer",
      minsize: "1",
      ...config,
    };

    const response = await api.post(
      `/api/v1/wallet/${encodeURIComponent(walletName)}/maker/start`,
      defaultConfig
    );
    return response.data;
  } catch (error) {
    console.error("Error starting maker:", error);
    throw error;
  }
};

// API function to stop maker service
export const stopMaker = async (
  walletName: string
): Promise<Record<string, unknown>> => {
  try {
    const response = await api.get(
      `/api/v1/wallet/${encodeURIComponent(walletName)}/maker/stop`
    );
    return response.data;
  } catch (error) {
    console.error("Error stopping maker:", error);
    throw error;
  }
};

export default api;
