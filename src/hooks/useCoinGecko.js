import { useQuery } from '@tanstack/react-query';
import {
  fetchCoinGeckoMarketData,
  fetchCoinGecko30dVolume,
  fetchTopExchanges24h,
  fetchAllMetricsRaw,
  getMarketCapRaw,
  getFdvRaw,
  getVolume24hRaw,
  getVolume30dRaw,
  getTvlRaw,
  getMaxSupplyRaw,
  getTotalSupplyRaw,
  getCircSupplyRaw
} from '../services/coingecko.js';

// ================= COINGECKO HOOKS =================

/**
 * Hook to get basic market data for a coin
 * @param {string} coinId - CoinGecko ID for the coin
 * @param {object} options - Query options
 * @returns {object} Query result with market data
 */
export function useCoinGeckoMarketData(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'marketData', coinId?.toLowerCase()],
    queryFn: () => fetchCoinGeckoMarketData(coinId),
    enabled: !!coinId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get 30-day average volume for a coin
 * @param {string} coinId - CoinGecko ID for the coin
 * @param {object} options - Query options
 * @returns {object} Query result with 30d volume
 */
export function useCoinGecko30dVolume(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'volume30d', coinId?.toLowerCase()],
    queryFn: () => fetchCoinGecko30dVolume(coinId),
    enabled: !!coinId,
    staleTime: 10 * 60 * 1000, // 10 minutes (historical data changes less frequently)
    cacheTime: 20 * 60 * 1000, // 20 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get top exchanges by 24h volume for a coin
 * @param {string} coinId - CoinGecko ID for the coin
 * @param {object} options - Query options
 * @returns {object} Query result with top exchanges
 */
export function useTopExchanges24h(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'topExchanges', coinId?.toLowerCase()],
    queryFn: () => fetchTopExchanges24h(coinId),
    enabled: !!coinId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get all key metrics for a coin
 * @param {string} coinId - CoinGecko ID for the coin
 * @param {object} options - Query options
 * @returns {object} Query result with all metrics array
 */
export function useAllMetricsRaw(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'allMetrics', coinId?.toLowerCase()],
    queryFn: () => fetchAllMetricsRaw(coinId),
    enabled: !!coinId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 6 * 60 * 1000, // 6 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

// Individual metric hooks
export function useMarketCap(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'marketCap', coinId?.toLowerCase()],
    queryFn: () => getMarketCapRaw(coinId),
    enabled: !!coinId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

export function useFdv(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'fdv', coinId?.toLowerCase()],
    queryFn: () => getFdvRaw(coinId),
    enabled: !!coinId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

export function useVolume24h(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'volume24h', coinId?.toLowerCase()],
    queryFn: () => getVolume24hRaw(coinId),
    enabled: !!coinId,
    staleTime: 1 * 60 * 1000, // 1 minute (volume changes frequently)
    cacheTime: 3 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

export function useVolume30d(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'volume30d', coinId?.toLowerCase()],
    queryFn: () => getVolume30dRaw(coinId),
    enabled: !!coinId,
    staleTime: 10 * 60 * 1000,
    cacheTime: 20 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

export function useTvl(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'tvl', coinId?.toLowerCase()],
    queryFn: () => getTvlRaw(coinId),
    enabled: !!coinId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

export function useMaxSupply(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'maxSupply', coinId?.toLowerCase()],
    queryFn: () => getMaxSupplyRaw(coinId),
    enabled: !!coinId,
    staleTime: 60 * 60 * 1000, // 1 hour (supply data changes rarely)
    cacheTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

export function useTotalSupply(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'totalSupply', coinId?.toLowerCase()],
    queryFn: () => getTotalSupplyRaw(coinId),
    enabled: !!coinId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

export function useCirculatingSupply(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'circulatingSupply', coinId?.toLowerCase()],
    queryFn: () => getCircSupplyRaw(coinId),
    enabled: !!coinId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Comprehensive hook that fetches all CoinGecko data for a coin
 * @param {string} coinId - CoinGecko ID for the coin
 * @returns {object} Combined data for all metrics
 */
export function useCoinGeckoComplete(coinId) {
  const marketDataQuery = useCoinGeckoMarketData(coinId);
  const volume30dQuery = useCoinGecko30dVolume(coinId);
  const topExchangesQuery = useTopExchanges24h(coinId);
  
  return {
    marketData: {
      data: marketDataQuery.data || {},
      isLoading: marketDataQuery.isLoading,
      error: marketDataQuery.error,
      isError: marketDataQuery.isError
    },
    volume30d: {
      data: volume30dQuery.data || 0,
      isLoading: volume30dQuery.isLoading,
      error: volume30dQuery.error,
      isError: volume30dQuery.isError
    },
    topExchanges: {
      data: topExchangesQuery.data || [],
      isLoading: topExchangesQuery.isLoading,
      error: topExchangesQuery.error,
      isError: topExchangesQuery.isError
    },
    isLoading: marketDataQuery.isLoading || volume30dQuery.isLoading || topExchangesQuery.isLoading,
    hasError: marketDataQuery.isError || volume30dQuery.isError || topExchangesQuery.isError
  };
} 