import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWalletAll,
  unlockWallet,
  createWallet,
  getJmSession,
  getWalletDisplay,
  getNewAddress,
  startMaker,
  stopMaker,
  lockWallet,
} from "./JmWalletApi";
import type {
  WalletListResponse,
  UnlockWalletResponse,
  CreateWalletResponse,
  SessionResponse,
  WalletDisplayResponse,
  AddressResponse,
  LockWalletResponse,
} from "./JmWalletApi";

// Query Keys - centralized for better cache management
export const queryKeys = {
  // Wallet related
  wallets: ["wallets"] as const,
  wallet: (name: string) => ["wallet", name] as const,
  walletDisplay: (name: string) => ["wallet", name, "display"] as const,
  walletAddress: (name: string, mixdepth: number) =>
    ["wallet", name, "address", mixdepth] as const,

  // Session related
  session: ["session"] as const,

  // Maker related
  maker: (name: string) => ["wallet", name, "maker"] as const,
} as const;

// ============ QUERIES ============

/**
 * Hook to fetch all available wallets
 */
export function useWallets() {
  return useQuery<WalletListResponse, Error>({
    queryKey: queryKeys.wallets,
    queryFn: getWalletAll,
    staleTime: 1000 * 60 * 2, // 2 minutes - wallets don't change often
  });
}

/**
 * Hook to fetch current session information
 */
export function useSession() {
  return useQuery<SessionResponse, Error>({
    queryKey: queryKeys.session,
    queryFn: getJmSession,
    staleTime: 1000 * 30, // 30 seconds - session info needs to be fairly fresh
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

/**
 * Hook to fetch wallet display information
 */
export function useWalletDisplay(walletName: string, enabled = true) {
  return useQuery<WalletDisplayResponse, Error>({
    queryKey: queryKeys.walletDisplay(walletName),
    queryFn: () => getWalletDisplay(walletName),
    enabled: enabled && !!walletName,
    staleTime: 1000 * 30, // 30 seconds - balance info should be fairly fresh
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

/**
 * Hook to get a new address for a wallet
 */
export function useNewAddress(
  walletName: string,
  mixdepth = 0,
  enabled = true
) {
  return useQuery<AddressResponse, Error>({
    queryKey: queryKeys.walletAddress(walletName, mixdepth),
    queryFn: () => getNewAddress(walletName, mixdepth),
    enabled: enabled && !!walletName,
    staleTime: Infinity, // Addresses don't change once generated
  });
}

// ============ MUTATIONS ============

/**
 * Hook to unlock a wallet
 */
export function useUnlockWallet() {
  const queryClient = useQueryClient();

  return useMutation<
    UnlockWalletResponse,
    Error,
    { walletFileName: string; password: string }
  >({
    mutationFn: ({ walletFileName, password }) =>
      unlockWallet(walletFileName, password),
    onSuccess: () => {
      // Invalidate session data when a wallet is unlocked
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
    },
  });
}

/**
 * Hook to create a new wallet
 */
export function useCreateWallet() {
  const queryClient = useQueryClient();

  return useMutation<
    CreateWalletResponse,
    Error,
    { walletName: string; password: string; walletType?: string }
  >({
    mutationFn: ({ walletName, password, walletType = "sw-fb" }) =>
      createWallet(walletName, password, walletType),
    onSuccess: () => {
      // Invalidate wallets list when a new wallet is created
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
    },
  });
}

/**
 * Hook to lock a wallet
 */
export function useLockWallet() {
  const queryClient = useQueryClient();

  return useMutation<LockWalletResponse, Error, string>({
    mutationFn: (walletName: string) => lockWallet(walletName),
    onSuccess: () => {
      // Invalidate session data when a wallet is locked
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
    },
  });
}

/**
 * Hook to start maker service
 */
export function useStartMaker() {
  const queryClient = useQueryClient();

  return useMutation<
    Record<string, unknown>,
    Error,
    {
      walletName: string;
      config?: {
        txfee?: string;
        cjfee_a?: string;
        cjfee_r?: string;
        ordertype?: string;
        minsize?: string;
      };
    }
  >({
    mutationFn: ({ walletName, config }) => startMaker(walletName, config),
    onSuccess: () => {
      // Invalidate session data when maker is started
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
    },
  });
}

/**
 * Hook to stop maker service
 */
export function useStopMaker() {
  const queryClient = useQueryClient();

  return useMutation<Record<string, unknown>, Error, string>({
    mutationFn: (walletName: string) => stopMaker(walletName),
    onSuccess: () => {
      // Invalidate session data when maker is stopped
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
    },
  });
}

/**
 * Combined hook for toggling maker service
 */
export function useToggleMaker() {
  const startMaker = useStartMaker();
  const stopMaker = useStopMaker();

  return {
    toggleMaker: async (
      walletName: string,
      isRunning: boolean,
      config?: {
        txfee?: string;
        cjfee_a?: string;
        cjfee_r?: string;
        ordertype?: string;
        minsize?: string;
      }
    ) => {
      if (isRunning) {
        return stopMaker.mutateAsync(walletName);
      } else {
        return startMaker.mutateAsync({ walletName, config });
      }
    },
    isLoading: startMaker.isPending || stopMaker.isPending,
    error: startMaker.error || stopMaker.error,
  };
}

/**
 * Hook to get fresh address - forces a new address request
 */
export function useGetNewAddress() {
  const queryClient = useQueryClient();

  return useMutation<
    AddressResponse,
    Error,
    { walletName: string; mixdepth?: number }
  >({
    mutationFn: ({ walletName, mixdepth = 0 }) =>
      getNewAddress(walletName, mixdepth),
    onSuccess: (data, variables) => {
      // Update the cached address for this wallet/mixdepth
      queryClient.setQueryData(
        queryKeys.walletAddress(variables.walletName, variables.mixdepth || 0),
        data
      );
    },
  });
}
