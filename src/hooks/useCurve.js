import { useQuery } from '@tanstack/react-query';
import {
  fetchCurveTokenTVL,
  fetchCurveTokenVolume,
  fetchAllCurvePools,
  fetchAllCurveVolumes,
  calculateTVLFromPoolsData,
  calculateVolumeFromCachedData
} from '../services/curve.js';

// ================= CURVE HOOKS =================

/**
 * Hook to get all Curve pools data (useful for caching)
 * @param {object} options - Query options
 * @returns {object} Query result with all pools data
 */
export function useCurvePools(options = {}) {
  return useQuery({
    queryKey: ['curve', 'allPools'],
    queryFn: fetchAllCurvePools,
    staleTime: 10 * 60 * 1000, // 10 minutes (pool data changes infrequently)
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get all Curve volumes data (useful for caching)
 * @param {object} options - Query options
 * @returns {object} Query result with all volumes data
 */
export function useCurveVolumes(options = {}) {
  return useQuery({
    queryKey: ['curve', 'allVolumes'],
    queryFn: fetchAllCurveVolumes,
    staleTime: 2 * 60 * 1000, // 2 minutes (volume changes more frequently)
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get Curve TVL for a specific token (direct API call)
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with TVL data
 */
export function useCurveTVL(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['curve', 'tvl', tokenAddress?.toLowerCase()],
    queryFn: () => fetchCurveTokenTVL(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get Curve 24hr volume for a specific token (direct API call)
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with volume data
 */
export function useCurve24hVolume(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['curve', 'volume24h', tokenAddress?.toLowerCase()],
    queryFn: () => fetchCurveTokenVolume(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * More efficient hook that uses cached pools data to calculate TVL
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with TVL calculated from cached data
 */
export function useCurveTVLOptimized(tokenAddress, options = {}) {
  const poolsQuery = useCurvePools();
  
  return useQuery({
    queryKey: ['curve', 'tvlOptimized', tokenAddress?.toLowerCase()],
    queryFn: () => calculateTVLFromPoolsData(tokenAddress, poolsQuery.data),
    enabled: !!tokenAddress && !!poolsQuery.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...options
  });
}

/**
 * More efficient hook that uses cached data to calculate volume
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with volume calculated from cached data
 */
export function useCurve24hVolumeOptimized(tokenAddress, options = {}) {
  const poolsQuery = useCurvePools();
  const volumesQuery = useCurveVolumes();
  
  return useQuery({
    queryKey: ['curve', 'volume24hOptimized', tokenAddress?.toLowerCase()],
    queryFn: () => calculateVolumeFromCachedData(tokenAddress, poolsQuery.data, volumesQuery.data),
    enabled: !!tokenAddress && !!poolsQuery.data && !!volumesQuery.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    ...options
  });
}

/**
 * Hook to get both TVL and 24h volume for a token (standard version)
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined data for TVL and volume
 */
export function useCurveTokenData(tokenAddress) {
  const tvlQuery = useCurveTVL(tokenAddress);
  const volumeQuery = useCurve24hVolume(tokenAddress);
  
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
 * Hook to get both TVL and 24h volume for a token (optimized version using cached data)
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined data for TVL and volume using optimized queries
 */
export function useCurveTokenDataOptimized(tokenAddress) {
  const tvlQuery = useCurveTVLOptimized(tokenAddress);
  const volumeQuery = useCurve24hVolumeOptimized(tokenAddress);
  
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
 * Hook to find all Curve pools that contain a specific token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Query result with filtered pools
 */
export function useCurvePoolsForToken(tokenAddress) {
  const poolsQuery = useCurvePools();
  
  return useQuery({
    queryKey: ['curve', 'poolsForToken', tokenAddress?.toLowerCase()],
    queryFn: () => {
      if (!poolsQuery.data || !poolsQuery.data.poolData) return [];
      
      return poolsQuery.data.poolData.filter(pool => {
        if (!pool.coinsAddresses) return false;
        return pool.coinsAddresses.some(
          coinAddress => coinAddress.toLowerCase() === tokenAddress.toLowerCase()
        );
      });
    },
    enabled: !!tokenAddress && !!poolsQuery.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
} 