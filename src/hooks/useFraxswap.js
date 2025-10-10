import { useQuery } from '@tanstack/react-query';
import {
  fetchFraxswapTokenTVL,
  fetchFraxswap24hVolume
} from '../services/cache-client.js';

// ================= FRAXSWAP HOOKS =================

/**
 * Hook to get Fraxswap TVL for a specific token (direct API calls)
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with TVL data
 */
export function useFraxswapTVL(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['fraxswap', 'tvl', tokenAddress?.toLowerCase()],
    queryFn: () => fetchFraxswapTokenTVL(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook to get Fraxswap 24hr volume for a specific token (direct API calls)
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with volume data
 */
export function useFraxswap24hVolume(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['fraxswap', 'volume24h', tokenAddress?.toLowerCase()],
    queryFn: () => fetchFraxswap24hVolume(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook to get all Fraxswap pairs for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with pairs data
 */
export function useFraxswapPairsForToken(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['fraxswap', 'pairs', tokenAddress?.toLowerCase()],
    queryFn: () => getFraxswapPairsForToken(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 10 * 60 * 1000, // 10 minutes (pairs don't change often)
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    ...options
  });
}

/**
 * More efficient hook that uses cached pairs data to calculate TVL
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with TVL calculated from cached pairs
 */
export function useFraxswapTVLOptimized(tokenAddress, options = {}) {
  const pairsQuery = useFraxswapPairsForToken(tokenAddress);
  
  return useQuery({
    queryKey: ['fraxswap', 'tvlOptimized', tokenAddress?.toLowerCase()],
    queryFn: () => calculateTVLFromFraxswapPairs(tokenAddress, pairsQuery.data),
    enabled: !!tokenAddress && !!pairsQuery.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...options
  });
}

/**
 * More efficient hook that uses cached pairs data to calculate volume
 * @param {string} tokenAddress - The token contract address
 * @param {number} timeframeHours - Hours to look back (defaults to 24)
 * @param {object} options - Query options
 * @returns {object} Query result with volume calculated from cached pairs
 */
export function useFraxswapVolumeOptimized(tokenAddress, timeframeHours = 24, options = {}) {
  const pairsQuery = useFraxswapPairsForToken(tokenAddress);
  
  return useQuery({
    queryKey: ['fraxswap', 'volumeOptimized', tokenAddress?.toLowerCase(), timeframeHours],
    queryFn: () => {
      if (!pairsQuery.data) return 0;
      const pairIds = pairsQuery.data.map(pair => pair.id);
      return getFraxswapPairsVolume(pairIds, timeframeHours);
    },
    enabled: !!tokenAddress && !!pairsQuery.data && pairsQuery.data.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook to get both TVL and 24h volume for a token (standard version)
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined data for TVL and volume
 */
export function useFraxswapTokenData(tokenAddress) {
  const tvlQuery = useFraxswapTVL(tokenAddress);
  const volumeQuery = useFraxswap24hVolume(tokenAddress);
  
  return {
    tvl: {
      data: tvlQuery.data || 0,
      isLoading: tvlQuery.isLoading,
      error: tvlQuery.error,
      isError: tvlQuery.isError
    },
    volume24h: {
      data: volumeQuery.data || 0,
      isLoading: volumeQuery.isLoading,
      error: volumeQuery.error,
      isError: volumeQuery.isError
    },
    isLoading: tvlQuery.isLoading || volumeQuery.isLoading,
    hasError: tvlQuery.isError || volumeQuery.isError
  };
}

/**
 * Hook to get both TVL and 24h volume for a token (optimized version using cached pairs)
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined data for TVL and volume using optimized queries
 */
export function useFraxswapTokenDataOptimized(tokenAddress) {
  const tvlQuery = useFraxswapTVLOptimized(tokenAddress);
  const volumeQuery = useFraxswapVolumeOptimized(tokenAddress, 24);
  
  return {
    tvl: {
      data: tvlQuery.data || 0,
      isLoading: tvlQuery.isLoading,
      error: tvlQuery.error,
      isError: tvlQuery.isError
    },
    volume24h: {
      data: volumeQuery.data || 0,
      isLoading: volumeQuery.isLoading,
      error: volumeQuery.error,
      isError: volumeQuery.isError
    },
    isLoading: tvlQuery.isLoading || volumeQuery.isLoading,
    hasError: tvlQuery.isError || volumeQuery.isError
  };
}

/**
 * Hook to get volume for different timeframes
 * @param {string} tokenAddress - The token contract address
 * @param {Array} timeframes - Array of timeframe hours [1, 24, 168] for 1h, 24h, 7d
 * @returns {object} Volume data for multiple timeframes
 */
export function useFraxswapMultiTimeframeVolume(tokenAddress, timeframes = [1, 24, 168]) {
  const pairsQuery = useFraxswapPairsForToken(tokenAddress);
  
  const volumeQueries = timeframes.map(hours => 
    useQuery({
      queryKey: ['fraxswap', 'volumeTimeframe', tokenAddress?.toLowerCase(), hours],
      queryFn: () => {
        if (!pairsQuery.data) return 0;
        const pairIds = pairsQuery.data.map(pair => pair.id);
        return getFraxswapPairsVolume(pairIds, hours);
      },
      enabled: !!tokenAddress && !!pairsQuery.data && pairsQuery.data.length > 0,
      staleTime: hours <= 1 ? 1 * 60 * 1000 : hours <= 24 ? 2 * 60 * 1000 : 5 * 60 * 1000,
      cacheTime: hours <= 1 ? 3 * 60 * 1000 : hours <= 24 ? 5 * 60 * 1000 : 10 * 60 * 1000,
      retry: 2,
    })
  );
  
  return {
    volumes: timeframes.reduce((acc, hours, index) => {
      acc[`${hours}h`] = {
        data: volumeQueries[index].data || 0,
        isLoading: volumeQueries[index].isLoading,
        error: volumeQueries[index].error,
        isError: volumeQueries[index].isError
      };
      return acc;
    }, {}),
    isLoading: volumeQueries.some(query => query.isLoading),
    hasError: volumeQueries.some(query => query.isError)
  };
}

/**
 * Hook to get detailed pair information for a token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Query result with detailed pairs information
 */
export function useFraxswapDetailedPairs(tokenAddress) {
  const pairsQuery = useFraxswapPairsForToken(tokenAddress);
  
  return useQuery({
    queryKey: ['fraxswap', 'detailedPairs', tokenAddress?.toLowerCase()],
    queryFn: () => {
      if (!pairsQuery.data) return [];
      
      return pairsQuery.data.map(pair => ({
        id: pair.id,
        token0: pair.token0,
        token1: pair.token1,
        reserveUSD: Number(pair.reserveUSD || 0),
        volumeUSD: Number(pair.volumeUSD || 0),
        createdAt: new Date(pair.createdAtTimestamp * 1000),
        pairName: `${pair.token0.symbol}/${pair.token1.symbol}`
      })).sort((a, b) => b.reserveUSD - a.reserveUSD); // Sort by TVL descending
    },
    enabled: !!tokenAddress && !!pairsQuery.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
} 