import { useQuery } from '@tanstack/react-query';
import {
  fetchUniswapTokenTVL,
  fetchUniswapV2TokenTVL,
  fetchUniswapTotalTVL,
  fetchUniswapV2TokenVolume24h,
  fetchUniswapV3TokenVolume24h,
  fetchUniswapTotalVolume24h
} from '../services/cache-client.js';

// ================= UNISWAP HOOKS =================

// ================= UNISWAP V3 HOOKS =================

/**
 * Hook to get Uniswap V3 TVL for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V3 TVL data
 */
export function useUniswapV3TVL(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['uniswap', 'v3', 'tvl', tokenAddress?.toLowerCase()],
    queryFn: () => fetchUniswapTokenTVL(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get Uniswap V3 24h volume for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V3 volume data
 */
export function useUniswapV3Volume24h(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['uniswap', 'v3', 'volume24h', tokenAddress?.toLowerCase()],
    queryFn: () => fetchUniswapV3TokenVolume24h(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get Uniswap V3 token information
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V3 token info
 */
export function useUniswapV3TokenInfo(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['uniswap', 'v3', 'tokenInfo', tokenAddress?.toLowerCase()],
    queryFn: () => getUniswapV3TokenInfo(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get Uniswap V3 pools for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V3 pools data
 */
export function useUniswapV3PoolsForToken(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['uniswap', 'v3', 'pools', tokenAddress?.toLowerCase()],
    queryFn: () => getUniswapV3PoolsForToken(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 10 * 60 * 1000, // 10 minutes (pools don't change often)
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

// ================= UNISWAP V2 HOOKS =================

/**
 * Hook to get Uniswap V2 TVL for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V2 TVL data
 */
export function useUniswapV2TVL(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['uniswap', 'v2', 'tvl', tokenAddress?.toLowerCase()],
    queryFn: () => fetchUniswapV2TokenTVL(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get Uniswap V2 24h volume for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V2 volume data
 */
export function useUniswapV2Volume24h(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['uniswap', 'v2', 'volume24h', tokenAddress?.toLowerCase()],
    queryFn: () => fetchUniswapV2TokenVolume24h(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get Uniswap V2 pairs for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with V2 pairs data
 */
export function useUniswapV2PairsForToken(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['uniswap', 'v2', 'pairs', tokenAddress?.toLowerCase()],
    queryFn: () => getUniswapV2PairsForToken(tokenAddress),
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
export function useUniswapV2TVLOptimized(tokenAddress, options = {}) {
  const pairsQuery = useUniswapV2PairsForToken(tokenAddress);
  
  return useQuery({
    queryKey: ['uniswap', 'v2', 'tvlOptimized', tokenAddress?.toLowerCase()],
    queryFn: () => calculateUniswapV2TVLFromPairs(tokenAddress, pairsQuery.data),
    enabled: !!tokenAddress && !!pairsQuery.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...options
  });
}

// ================= COMBINED UNISWAP HOOKS =================

/**
 * Hook to get total Uniswap TVL (V2 + V3) for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with combined TVL data
 */
export function useUniswapTotalTVL(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['uniswap', 'total', 'tvl', tokenAddress?.toLowerCase()],
    queryFn: () => fetchUniswapTotalTVL(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get total Uniswap 24h volume (V2 + V3) for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with combined volume data
 */
export function useUniswapTotalVolume24h(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['uniswap', 'total', 'volume24h', tokenAddress?.toLowerCase()],
    queryFn: () => fetchUniswapTotalVolume24h(tokenAddress),
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
 * Hook to get Uniswap V3 data (TVL + Volume) for a token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined V3 data for TVL and volume
 */
export function useUniswapV3TokenData(tokenAddress) {
  const tvlQuery = useUniswapV3TVL(tokenAddress);
  const volumeQuery = useUniswapV3Volume24h(tokenAddress);
  
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
 * Hook to get Uniswap V2 data (TVL + Volume) for a token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined V2 data for TVL and volume
 */
export function useUniswapV2TokenData(tokenAddress) {
  const tvlQuery = useUniswapV2TVL(tokenAddress);
  const volumeQuery = useUniswapV2Volume24h(tokenAddress);
  
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
 * Hook to get Uniswap V2 data using optimized queries
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined optimized V2 data for TVL and volume
 */
export function useUniswapV2TokenDataOptimized(tokenAddress) {
  const tvlQuery = useUniswapV2TVLOptimized(tokenAddress);
  const volumeQuery = useUniswapV2Volume24h(tokenAddress);
  
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
 * Hook to get complete Uniswap data (V2 + V3) for a token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined data for all Uniswap versions
 */
export function useUniswapTokenData(tokenAddress) {
  const totalTvlQuery = useUniswapTotalTVL(tokenAddress);
  const totalVolumeQuery = useUniswapTotalVolume24h(tokenAddress);
  
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
 * Comprehensive hook that fetches all Uniswap data for a token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Complete breakdown of V2, V3, and combined data
 */
export function useUniswapComplete(tokenAddress) {
  const v2Data = useUniswapV2TokenData(tokenAddress);
  const v3Data = useUniswapV3TokenData(tokenAddress);
  const totalData = useUniswapTokenData(tokenAddress);
  
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
export function useUniswapV2DetailedPairs(tokenAddress) {
  const pairsQuery = useUniswapV2PairsForToken(tokenAddress);
  
  return useQuery({
    queryKey: ['uniswap', 'v2', 'detailedPairs', tokenAddress?.toLowerCase()],
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

/**
 * Hook to get detailed V3 pool information for a token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Query result with detailed V3 pools information
 */
export function useUniswapV3DetailedPools(tokenAddress) {
  const poolsQuery = useUniswapV3PoolsForToken(tokenAddress);
  
  return useQuery({
    queryKey: ['uniswap', 'v3', 'detailedPools', tokenAddress?.toLowerCase()],
    queryFn: () => {
      if (!poolsQuery.data) return [];
      
      return poolsQuery.data.map(pool => ({
        id: pool.id,
        token0: pool.token0,
        token1: pool.token1,
        feeTier: pool.feeTier,
        totalValueLockedUSD: Number(pool.totalValueLockedUSD || 0),
        volumeUSD: Number(pool.volumeUSD || 0),
        createdAt: new Date(pool.createdAtTimestamp * 1000),
        poolName: `${pool.token0.symbol}/${pool.token1.symbol}`,
        feePercentage: pool.feeTier / 10000 // Convert to percentage (e.g., 3000 -> 0.3%)
      })).sort((a, b) => b.totalValueLockedUSD - a.totalValueLockedUSD); // Sort by TVL descending
    },
    enabled: !!tokenAddress && !!poolsQuery.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
} 