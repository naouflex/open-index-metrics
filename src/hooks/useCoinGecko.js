import { useQuery } from '@tanstack/react-query';
import {
  fetchCoinGeckoMarketData,
  fetchCoinGecko30dVolume,
  fetchCoinGecko24hVolume,
  fetchTopExchanges24h,
  fetchAllMetricsRaw,
  getMarketCapRaw,
  getFdvRaw,
  getVolume24hRaw,
  getVolume30dRaw,
  getTvlRaw,
  getMaxSupplyRaw,
  getTotalSupplyRaw,
  getCirculatingSupplyRaw
} from '../services/cache-client.js';

// ================= COINGECKO HOOKS =================

/**
 * Hook to fetch basic market data from CoinGecko
 * @param {string} coinId - CoinGecko coin ID
 * @param {object} options - Query options
 * @returns {object} Query result with market data
 */
export function useCoinGeckoMarketData(coinId, options = {}) {
  // Use shorter intervals for OPEN Index to ensure frequent updates
  const staleTime = coinId === 'open-stablecoin-index' 
    ? 3 * 60 * 1000  // 3 minutes for OPEN Index
    : 5 * 60 * 1000; // 5 minutes for other coins
  
  const refetchInterval = coinId === 'open-stablecoin-index'
    ? 3 * 60 * 1000  // Auto-refetch every 3 minutes for OPEN Index
    : false;         // No auto-refetch for other coins
  
  return useQuery({
    queryKey: ['coingecko', 'marketData', coinId],
    queryFn: () => fetchCoinGeckoMarketData(coinId),
    enabled: !!coinId,
    staleTime: staleTime,
    refetchInterval: refetchInterval,
    refetchOnWindowFocus: coinId === 'open-stablecoin-index', // Refetch OPEN Index on window focus
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook to fetch 30-day volume data from CoinGecko
 * @param {string} coinId - CoinGecko coin ID
 * @param {object} options - Query options
 * @returns {object} Query result with 30d volume
 */
export function useCoinGecko30dVolume(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', '30dVolume', coinId],
    queryFn: () => fetchCoinGecko30dVolume(coinId),
    enabled: !!coinId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 2,
    ...options
  });
}

/**
 * Hook to fetch top exchanges data from CoinGecko
 * @param {string} coinId - CoinGecko coin ID
 * @param {object} options - Query options
 * @returns {object} Query result with top exchanges
 */
export function useTopExchanges24h(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'topExchanges', coinId],
    queryFn: () => fetchTopExchanges24h(coinId),
    enabled: !!coinId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    ...options
  });
}

/**
 * Hook to fetch all raw metrics from CoinGecko
 * @param {string} coinId - CoinGecko coin ID
 * @param {object} options - Query options
 * @returns {object} Query result with all metrics array
 */
export function useAllMetricsRaw(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', 'allMetrics', coinId],
    queryFn: () => fetchAllMetricsRaw(coinId),
    enabled: !!coinId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    ...options
  });
}

// Individual metric hooks using the all metrics data
export function useMarketCap(coinId, options = {}) {
  const allMetrics = useAllMetricsRaw(coinId, options);
  
  return useQuery({
    queryKey: ['coingecko', 'marketCap', coinId],
    queryFn: () => getMarketCapRaw(allMetrics.data),
    enabled: !!allMetrics.data,
    ...options
  });
}

export function useFdv(coinId, options = {}) {
  const allMetrics = useAllMetricsRaw(coinId, options);
  
  return useQuery({
    queryKey: ['coingecko', 'fdv', coinId],
    queryFn: () => getFdvRaw(allMetrics.data),
    enabled: !!allMetrics.data,
    ...options
  });
}

export function useVolume24h(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', '24h-volume', coinId?.toLowerCase()],
    queryFn: () => fetchCoinGecko24hVolume(coinId),
    enabled: !!coinId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    ...options
  });
}

export function useVolume30d(coinId, options = {}) {
  return useQuery({
    queryKey: ['coingecko', '30d-volume', coinId?.toLowerCase()],
    queryFn: () => fetchCoinGecko30dVolume(coinId),
    enabled: !!coinId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    ...options
  });
}

export function useTvl(coinId, options = {}) {
  const allMetrics = useAllMetricsRaw(coinId, options);
  
  return useQuery({
    queryKey: ['coingecko', 'tvl', coinId],
    queryFn: () => getTvlRaw(allMetrics.data),
    enabled: !!allMetrics.data,
    ...options
  });
}

export function useMaxSupply(coinId, options = {}) {
  const allMetrics = useAllMetricsRaw(coinId, options);
  
  return useQuery({
    queryKey: ['coingecko', 'maxSupply', coinId],
    queryFn: () => getMaxSupplyRaw(allMetrics.data),
    enabled: !!allMetrics.data,
    ...options
  });
}

export function useTotalSupply(coinId, options = {}) {
  const allMetrics = useAllMetricsRaw(coinId, options);
  
  return useQuery({
    queryKey: ['coingecko', 'totalSupply', coinId],
    queryFn: () => getTotalSupplyRaw(allMetrics.data),
    enabled: !!allMetrics.data,
    ...options
  });
}

export function useCirculatingSupply(coinId, options = {}) {
  const allMetrics = useAllMetricsRaw(coinId, options);
  
  return useQuery({
    queryKey: ['coingecko', 'circulatingSupply', coinId],
    queryFn: () => getCirculatingSupplyRaw(allMetrics.data),
    enabled: !!allMetrics.data,
    ...options
  });
}

/**
 * Comprehensive hook that fetches all CoinGecko data for a coin
 * @param {string} coinId - CoinGecko coin ID
 * @param {object} options - Query options
 * @returns {object} Combined data for all CoinGecko metrics
 */
export function useCoinGeckoComplete(coinId, options = {}) {
  const marketData = useCoinGeckoMarketData(coinId, options);
  const volume30d = useCoinGecko30dVolume(coinId, options);
  const topExchanges = useTopExchanges24h(coinId, options);
  const allMetrics = useAllMetricsRaw(coinId, options);
  
  return {
    marketData: {
      data: marketData.data,
      isLoading: marketData.isLoading,
      error: marketData.error,
      isError: marketData.isError
    },
    volume30d: {
      data: volume30d.data,
      isLoading: volume30d.isLoading,
      error: volume30d.error,
      isError: volume30d.isError
    },
    topExchanges: {
      data: topExchanges.data,
      isLoading: topExchanges.isLoading,
      error: topExchanges.error,
      isError: topExchanges.isError
    },
    allMetrics: {
      data: allMetrics.data,
      isLoading: allMetrics.isLoading,
      error: allMetrics.error,
      isError: allMetrics.isError
    },
    isLoading: marketData.isLoading || volume30d.isLoading || topExchanges.isLoading || allMetrics.isLoading,
    hasError: marketData.isError || volume30d.isError || topExchanges.isError || allMetrics.isError
  };
} 