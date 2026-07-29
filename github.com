import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// Interface definitions
interface JarDetail {
  id: string;
  name: string;
  balance: number;
  currency: string;
  updatedAt: string;
}

interface DisplayData {
  jars: JarDetail[];
  totalBalance: number;
}

// Simulated API call for `/display`
const fetchDisplayData = async (): Promise<DisplayData> => {
  const res = await fetch('/api/display');
  if (!res.ok) throw new Error('Failed to fetch display data');
  return res.json();
};

export const DisplayDashboard: React.FC = () => {
  const [selectedJar, setSelectedJar] = useState<JarDetail | null>(null);

  // Differentiate initial load vs refetch using react-query hooks
  const {
    data,
    isLoading, // true only on initial hard load (no cached data)
    isFetching, // true whenever any request (initial or refetch) is in flight
    refetch,
    error,
  } = useQuery<DisplayData>({
    queryKey: ['displayData'],
    queryFn: fetchDisplayData,
    staleTime: 1000 * 30, // Data considered fresh for 30s
  });

  const isRefetching = isFetching && !isLoading;

  // 1. Initial Loading State (No cached data available)
  if (isLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="spinner-large" aria-label="Loading initial data..." />
      </div>
    );
  }

  // Error State
  if (error && !data) {
    return (
      <div className="p-4 text-red-500">
        Failed to load display data.{' '}
        <button onClick={() => refetch()} className="underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative p-6">
      {/* Header & Refetching Indicator */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Jar Dashboard</h1>

        {/* Non-blocking background refetch indicator */}
        {isRefetching && (
          <div
            className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 animate-fade-in"
            role="status"
            aria-live="polite"
          >
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
            Updating display data...
          </div>
        )}
      </div>

      {/* Jar List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.jars.map((jar) => (
          <div
            key={jar.id}
            onClick={() => setSelectedJar(jar)}
            className="cursor-pointer rounded-lg border p-4 shadow-sm hover:border-blue-500 transition-all"
          >
            <h3 className="font-semibold">{jar.name}</h3>
            <p className="text-lg font-bold">${jar.balance}</p>
            <button className="mt-2 text-xs text-blue-600 hover:underline">
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Jar Details Overlay (Accessible even during refetch) */}
      {selectedJar && (
        <JarDetailsOverlay
          jar={selectedJar}
          isRefetching={isRefetching}
          onClose={() => setSelectedJar(null)}
        />
      )}
    </div>
  );
};

interface JarDetailsOverlayProps {
  jar: JarDetail;
  isRefetching: boolean;
  onClose: () => void;
}

/**
 * Jar Details Overlay Component
 * Stays visible and interactive even when /display endpoint is refetching in background.
 */
export const JarDetailsOverlay: React.FC<JarDetailsOverlayProps> = ({
  jar,
  isRefetching,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {/* Subtle refetch indicator inside overlay header if data updates */}
        {isRefetching && (
          <div className="absolute top-3 right-12 text-[10px] text-gray-400 flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Syncing...
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Close overlay"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">{jar.name} Details</h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Jar ID</span>
            <span className="font-mono">{jar.id}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Balance</span>
            <span className="font-semibold text-green-600">${jar.balance}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Currency</span>
            <span>{jar.currency}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};