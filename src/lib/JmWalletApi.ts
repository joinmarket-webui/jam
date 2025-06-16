import { createClient } from "./jm-api";
import { getSession } from "./session";
import { apiConfig } from "./config";

// Create client with base configuration
const clientOptions = {
  baseUrl: apiConfig.baseUrl || "/api/v1/",
};

// Initialize client
const client = createClient(clientOptions);

// Helper function to add auth header to requests
const getAuthHeaders = () => {
  const session = getSession();
  if (session?.auth?.token) {
    return {
      Authorization: `Bearer ${session.auth.token}`,
    };
  }
  return {};
};

// Export the client and individual API functions with proper typing
export default client;

// Re-export types from the generated client for easier access
export type {
  TokenResponse,
  ListWalletsResponse,
  GetAddressResponse,
  ConfigGetResponse,
} from "./jm-api/generated/client/types.gen";

// Re-export SDK functions
export {
  token,
  createwallet,
  recoverwallet,
  unlockwallet,
  lockwallet,
  displaywallet,
  session,
  version,
  listwallets,
  getaddress,
  startmaker,
  stopmaker,
  docoinjoin,
  getschedule,
  runschedule,
  stopcoinjoin,
} from "./jm-api/generated/client/sdk.gen";

/**
 * Helper function to get all wallets
 */
export const getWalletAll = async () => {
  const { data, error } = await client.get({
    url: "/wallet/all",
  });

  if (error) {
    console.error("Error fetching wallets:", error);
    throw error;
  }

  return data as { wallets: string[] };
};

/**
 * Helper function to unlock a wallet
 */
export const unlockWallet = async (
  walletFileName: string,
  password: string
) => {
  const { data, error } = await client.post({
    url: `/wallet/${encodeURIComponent(walletFileName)}/unlock`,
    body: { password },
  });

  if (error) {
    console.error("Error unlocking wallet:", error);
    throw error;
  }

  return data as { walletname: string; token: string };
};

/**
 * Helper function to create a new wallet
 */
export const createWallet = async (
  walletName: string,
  password: string,
  walletType: string = "sw-fb"
) => {
  // Create a fresh client instance for this call to avoid auth middleware
  const freshClient = createClient(clientOptions);

  const { data, error } = await freshClient.post({
    url: "/wallet/create",
    body: {
      walletname: walletName,
      password,
      wallettype: walletType,
    },
  });

  if (error) {
    console.error("Error creating wallet:", error);
    throw error;
  }

  const responseData = data as CreateWalletResponse;
  return {
    walletname: responseData?.walletname || "",
    token: responseData?.token || "",
    seedphrase: responseData?.seedphrase || "",
  };
};

/**
 * Helper function to lock a wallet
 */
export const lockWallet = async (walletName: string) => {
  const { data, error } = await client.get({
    url: `/wallet/${encodeURIComponent(walletName)}/lock`,
    headers: getAuthHeaders(),
  });

  if (error) {
    console.error("Error locking wallet:", error);
    throw error;
  }

  const responseData = data as LockWalletResponse;
  return {
    walletname: responseData?.walletname || "",
    already_locked: responseData?.already_locked || false,
  };
};

/**
 * Helper function to get session information
 */
export const getJmSession = async () => {
  // Create a fresh client instance for this call to avoid auth middleware
  const freshClient = createClient(clientOptions);

  const { data, error } = await freshClient.get({
    url: "/session",
  });

  if (error) {
    console.error("Error fetching session:", error);
    throw error;
  }

  const responseData = data as SessionResponse;
  return {
    session: responseData?.session || false,
    wallet_name: responseData?.wallet_name || "",
    maker_running: responseData?.maker_running || false,
    coinjoin_in_process: responseData?.coinjoin_in_process || false,
    schedule_in_process: !!responseData?.schedule,
  };
};

/**
 * Helper function to get wallet display information
 */
export const getWalletDisplay = async (walletName: string) => {
  const { data, error } = await client.get({
    url: `/wallet/${encodeURIComponent(walletName)}/display`,
    headers: getAuthHeaders(),
  });

  if (error) {
    console.error("Error fetching wallet display:", error);
    throw error;
  }

  const responseData = data as WalletDisplayResponse;
  return {
    walletinfo: responseData?.walletinfo || {},
  };
};

/**
 * Helper function to get a new address
 */
export const getNewAddress = async (
  walletName: string,
  mixdepth: number = 0
) => {
  const { data, error } = await client.get({
    url: `/wallet/${encodeURIComponent(walletName)}/address/new/${mixdepth}`,
    headers: getAuthHeaders(),
  });

  if (error) {
    console.error("Error fetching new address:", error);
    throw error;
  }

  return { address: data as string };
};

/**
 * Helper function to start maker service
 */
export const startMaker = async (
  walletName: string,
  config: {
    txfee?: string;
    cjfee_a?: string;
    cjfee_r?: string;
    ordertype?: string;
    minsize?: string;
  } = {}
) => {
  const defaultConfig = {
    txfee: "0",
    cjfee_a: "250",
    cjfee_r: "0.0003",
    ordertype: "sw0absoffer",
    minsize: "1",
    ...config,
  };

  const { data, error } = await client.post({
    url: `/wallet/${encodeURIComponent(walletName)}/maker/start`,
    body: defaultConfig,
    headers: getAuthHeaders(),
  });

  if (error) {
    console.error("Error starting maker:", error);
    throw error;
  }

  return data as Record<string, unknown>;
};

/**
 * Helper function to stop maker service
 */
export const stopMaker = async (walletName: string) => {
  const { data, error } = await client.get({
    url: `/wallet/${encodeURIComponent(walletName)}/maker/stop`,
    headers: getAuthHeaders(),
  });

  if (error) {
    console.error("Error stopping maker:", error);
    throw error;
  }

  return data as Record<string, unknown>;
};

// Export all the same types from the old API to maintain compatibility
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
  schedule?: unknown;
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
