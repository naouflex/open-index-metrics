import { useQuery } from '@tanstack/react-query';
import {
  fetchSushiTokenTVL,
  fetchSushiTokenVolume,
  fetchSushiV2TokenTVL,
  fetchSushiV2TokenVolume24h,
  fetchSushiTotalTVL,
  fetchSushiTotalVolume24h
} from '../services/cache-client.js';

// ================= SUSHISWAP HOOKS =================

// ================= SUSHISWAP V3 HOOKS =================

/**
 * Hook to get SushiSwap V3 TVL for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V3 TVL data
 */
export function useSushiV3TVL(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['sushiswap', 'v3', 'tvl', tokenAddress?.toLowerCase()],
    queryFn: () => fetchSushiTokenTVL(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get SushiSwap V3 volume for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V3 volume data
 */
export function useSushiV3Volume(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['sushiswap', 'v3', 'volume', tokenAddress?.toLowerCase()],
    queryFn: () => fetchSushiTokenVolume(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get SushiSwap V3 token information
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V3 token info
 */
export function useSushiV3TokenInfo(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['sushiswap', 'v3', 'tokenInfo', tokenAddress?.toLowerCase()],
    queryFn: () => getSushiV3TokenInfo(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

// ================= SUSHISWAP V2 HOOKS =================

/**
 * Hook to get SushiSwap V2 TVL for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V2 TVL data
 */
export function useSushiV2TVL(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['sushiswap', 'v2', 'tvl', tokenAddress?.toLowerCase()],
    queryFn: () => fetchSushiV2TokenTVL(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get SushiSwap V2 24h volume for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V2 volume data
 */
export function useSushiV2Volume24h(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['sushiswap', 'v2', 'volume24h', tokenAddress?.toLowerCase()],
    queryFn: () => fetchSushiV2TokenVolume24h(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get SushiSwap V2 pairs for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V2 pairs data
 */
export function useSushiV2PairsForToken(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['sushiswap', 'v2', 'pairs', tokenAddress?.toLowerCase()],
    queryFn: () => getSushiV2PairsForToken(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 10 * 60 * 1000, // 10 minutes (pairs don't change often)
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * More efficient hook that uses cached V2 pairs data to calculate TVL
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V2 TVL calculated from cached pairs
 */
export function useSushiV2TVLOptimized(tokenAddress, options = {}) {
  const pairsQuery = useSushiV2PairsForToken(tokenAddress);
  
  return useQuery({
    queryKey: ['sushiswap', 'v2', 'tvlOptimized', tokenAddress?.toLowerCase()],
    queryFn: () => calculateSushiV2TVLFromPairs(tokenAddress, pairsQuery.data),
    enabled: !!tokenAddress && !!pairsQuery.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...options
  });
}

// ================= COMBINED SUSHISWAP HOOKS =================

/**
 * Hook to get total SushiSwap TVL (V2 + V3) for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with combined TVL data
 */
export function useSushiTotalTVL(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['sushiswap', 'total', 'tvl', tokenAddress?.toLowerCase()],
    queryFn: () => fetchSushiTotalTVL(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get total SushiSwap 24h volume (V2 + V3) for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with combined volume data
 */
export function useSushiTotalVolume24h(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['sushiswap', 'total', 'volume24h', tokenAddress?.toLowerCase()],
    queryFn: () => fetchSushiTotalVolume24h(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

// ================= CONVENIENCE HOOKS =================

/**
 * Hook to get SushiSwap V3 data (TVL + Volume) for a token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined V3 data for TVL and volume
 */
export function useSushiV3TokenData(tokenAddress) {
  const tvlQuery = useSushiV3TVL(tokenAddress);
  const volumeQuery = useSushiV3Volume(tokenAddress);
  
  return {
    tvl: {
      data: tvlQuery.data || 0,
      isLoading: tvlQuery.isLoading,
      error: tvlQuery.error,
      isError: tvlQuery.isError
    },
    volume: {
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
 * Hook to get SushiSwap V2 data (TVL + Volume) for a token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined V2 data for TVL and volume
 */
export function useSushiV2TokenData(tokenAddress) {
  const tvlQuery = useSushiV2TVL(tokenAddress);
  const volumeQuery = useSushiV2Volume24h(tokenAddress);
  
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
 * Hook to get SushiSwap V2 data using optimized queries
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined optimized V2 data for TVL and volume
 */
export function useSushiV2TokenDataOptimized(tokenAddress) {
  const tvlQuery = useSushiV2TVLOptimized(tokenAddress);
  const volumeQuery = useSushiV2Volume24h(tokenAddress);
  
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
 * Hook to get complete SushiSwap data (V2 + V3) for a token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined data for all SushiSwap versions
 */
export function useSushiTokenData(tokenAddress) {
  const totalTvlQuery = useSushiTotalTVL(tokenAddress);
  const totalVolumeQuery = useSushiTotalVolume24h(tokenAddress);
  
  return {
    totalTvl: {
      data: totalTvlQuery.data || 0,
      isLoading: totalTvlQuery.isLoading,
      error: totalTvlQuery.error,
      isError: totalTvlQuery.isError
    },
    totalVolume24h: {
      data: totalVolumeQuery.data || 0,
      isLoading: totalVolumeQuery.isLoading,
      error: totalVolumeQuery.error,
      isError: totalVolumeQuery.isError
    },
    isLoading: totalTvlQuery.isLoading || totalVolumeQuery.isLoading,
    hasError: totalTvlQuery.isError || totalVolumeQuery.isError
  };
}

/**
 * Comprehensive hook that fetches all SushiSwap data for a token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Complete breakdown of V2, V3, and combined data
 */
export function useSushiComplete(tokenAddress) {
  const v2Data = useSushiV2TokenData(tokenAddress);
  const v3Data = useSushiV3TokenData(tokenAddress);
  const totalData = useSushiTokenData(tokenAddress);
  
  return {
    v2: v2Data,
    v3: v3Data,
    total: totalData,
    isLoading: v2Data.isLoading || v3Data.isLoading || totalData.isLoading,
    hasError: v2Data.hasError || v3Data.hasError || totalData.hasError
  };
}

/**
 * Hook to get detailed V2 pair information for a token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Query result with detailed V2 pairs information
 */
export function useSushiV2DetailedPairs(tokenAddress) {
  const pairsQuery = useSushiV2PairsForToken(tokenAddress);
  
  return useQuery({
    queryKey: ['sushiswap', 'v2', 'detailedPairs', tokenAddress?.toLowerCase()],
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