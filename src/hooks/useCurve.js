import { useQuery } from '@tanstack/react-query';
import {
  fetchCurveTokenTVL,
  fetchCurve24hVolume
} from '../services/cache-client.js';

// ================= CURVE HOOKS =================

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
    queryFn: () => fetchCurve24hVolume(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook to get both TVL and 24h volume for a token
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