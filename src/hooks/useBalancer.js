import { useQuery } from '@tanstack/react-query';
import { fetchBalancerTokenTVL, fetchBalancer24hVolume } from '../services/cache-client.js';

// ================= BALANCER HOOKS =================

/**
 * Hook to get Balancer TVL for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with data, loading, error states
 */
export function useBalancerTVL(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['balancer', 'tvl', tokenAddress?.toLowerCase()],
    queryFn: () => fetchBalancerTokenTVL(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get Balancer 24hr volume for a specific token
 * @param {string} tokenAddress - The token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with data, loading, error states
 */
export function useBalancer24hVolume(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['balancer', 'volume24h', tokenAddress?.toLowerCase()],
    queryFn: () => fetchBalancer24hVolume(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes (volume changes more frequently)
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get both TVL and 24h volume for a token
 * @param {string} tokenAddress - The token contract address
 * @returns {object} Combined data for TVL and volume
 */
export function useBalancerTokenData(tokenAddress) {
  const tvlQuery = useBalancerTVL(tokenAddress);
  const volumeQuery = useBalancer24hVolume(tokenAddress);
  
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