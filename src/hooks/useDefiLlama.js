import { useQuery } from '@tanstack/react-query';
import {
  fetchDefiLlamaTVLDirect,
  getTokenPrice,
  getMultipleTokenPrices,
  getProtocolInfo,
  getAllProtocols,
  getProtocolRevenue
} from '../services/cache-client.js';

// ================= DEFILLAMA HOOKS =================

/**
 * Hook to get DeFiLlama TVL for a specific protocol
 * @param {string} protocolSlug - The DeFiLlama protocol slug
 * @param {object} options - Query options
 * @returns {object} Query result with TVL data
 */
export function useDefiLlamaTVL(protocolSlug, options = {}) {
  return useQuery({
    queryKey: ['defillama', 'tvl', protocolSlug?.toLowerCase()],
    queryFn: () => fetchDefiLlamaTVLDirect(protocolSlug),
    enabled: !!protocolSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get token price from DeFiLlama
 * @param {string} tokenAddress - Token contract address
 * @param {string} chain - Blockchain (defaults to 'ethereum')
 * @param {object} options - Query options
 * @returns {object} Query result with price data
 */
export function useTokenPrice(tokenAddress, chain = 'ethereum', options = {}) {
  return useQuery({
    queryKey: ['defillama', 'tokenPrice', chain, tokenAddress?.toLowerCase()],
    queryFn: () => getTokenPrice(tokenAddress, chain),
    enabled: !!tokenAddress,
    staleTime: 1 * 60 * 1000, // 1 minute (prices change frequently)
    cacheTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get multiple token prices efficiently
 * @param {string[]} tokenAddresses - Array of token contract addresses
 * @param {string} chain - Blockchain (defaults to 'ethereum')
 * @param {object} options - Query options
 * @returns {object} Query result with price mapping
 */
export function useMultipleTokenPrices(tokenAddresses, chain = 'ethereum', options = {}) {
  return useQuery({
    queryKey: ['defillama', 'multipleTokenPrices', chain, tokenAddresses?.sort()?.join(',')],
    queryFn: () => getMultipleTokenPrices(tokenAddresses, chain),
    enabled: !!tokenAddresses && tokenAddresses.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get comprehensive protocol information
 * @param {string} protocolSlug - The DeFiLlama protocol slug
 * @param {object} options - Query options
 * @returns {object} Query result with protocol info
 */
export function useProtocolInfo(protocolSlug, options = {}) {
  return useQuery({
    queryKey: ['defillama', 'protocolInfo', protocolSlug?.toLowerCase()],
    queryFn: () => getProtocolInfo(protocolSlug),
    enabled: !!protocolSlug,
    staleTime: 30 * 60 * 1000, // 30 minutes (protocol info changes rarely)
    cacheTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get all protocols from DeFiLlama
 * @param {object} options - Query options
 * @returns {object} Query result with all protocols
 */
export function useAllProtocols(options = {}) {
  return useQuery({
    queryKey: ['defillama', 'allProtocols'],
    queryFn: getAllProtocols,
    staleTime: 60 * 60 * 1000, // 1 hour (list changes rarely)
    cacheTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get historical TVL data for a protocol
 * @param {string} protocolSlug - The DeFiLlama protocol slug
 * @param {object} options - Query options
 * @returns {object} Query result with historical TVL data
 */
export function useProtocolTVLHistory(protocolSlug, options = {}) {
  return useQuery({
    queryKey: ['defillama', 'tvlHistory', protocolSlug?.toLowerCase()],
    queryFn: () => getProtocolTVLHistory(protocolSlug),
    enabled: !!protocolSlug,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Hook to get TVL by chain for a protocol
 * @param {string} protocolSlug - The DeFiLlama protocol slug
 * @param {object} options - Query options
 * @returns {object} Query result with TVL by chain
 */
export function useProtocolTVLByChain(protocolSlug, options = {}) {
  return useQuery({
    queryKey: ['defillama', 'tvlByChain', protocolSlug?.toLowerCase()],
    queryFn: () => getProtocolTVLByChain(protocolSlug),
    enabled: !!protocolSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
}

/**
 * Comprehensive hook that fetches all DeFiLlama data for a protocol
 * @param {string} protocolSlug - The DeFiLlama protocol slug
 * @returns {object} Combined data for all protocol information
 */
export function useDefiLlamaComplete(protocolSlug) {
  const tvlQuery = useDefiLlamaTVL(protocolSlug);
  const infoQuery = useProtocolInfo(protocolSlug);
  const historyQuery = useProtocolTVLHistory(protocolSlug);
  const chainTvlQuery = useProtocolTVLByChain(protocolSlug);
  
  return {
    tvl: {
      data: tvlQuery.data || 0,
      isLoading: tvlQuery.isLoading,
      error: tvlQuery.error,
      isError: tvlQuery.isError
    },
    info: {
      data: infoQuery.data || {},
      isLoading: infoQuery.isLoading,
      error: infoQuery.error,
      isError: infoQuery.isError
    },
    history: {
      data: historyQuery.data || [],
      isLoading: historyQuery.isLoading,
      error: historyQuery.error,
      isError: historyQuery.isError
    },
    chainTvl: {
      data: chainTvlQuery.data || {},
      isLoading: chainTvlQuery.isLoading,
      error: chainTvlQuery.error,
      isError: chainTvlQuery.isError
    },
    isLoading: tvlQuery.isLoading || infoQuery.isLoading || historyQuery.isLoading || chainTvlQuery.isLoading,
    hasError: tvlQuery.isError || infoQuery.isError || historyQuery.isError || chainTvlQuery.isError
  };
}

/**
 * Hook to search protocols by name or slug
 * @param {string} searchTerm - Search term
 * @returns {object} Query result with filtered protocols
 */
export function useProtocolSearch(searchTerm) {
  const allProtocolsQuery = useAllProtocols();
  
  return useQuery({
    queryKey: ['defillama', 'protocolSearch', searchTerm?.toLowerCase()],
    queryFn: () => {
      if (!allProtocolsQuery.data || !searchTerm) return [];
      
      const term = searchTerm.toLowerCase();
      return allProtocolsQuery.data.filter(protocol => 
        protocol.name.toLowerCase().includes(term) ||
        protocol.slug.toLowerCase().includes(term) ||
        (protocol.symbol && protocol.symbol.toLowerCase().includes(term))
      );
    },
    enabled: !!searchTerm && !!allProtocolsQuery.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get protocol revenue/fees data from DeFiLlama
 * @param {string} protocolSlug - The DeFiLlama protocol slug
 * @param {object} options - Query options
 * @returns {object} Query result with revenue data
 */
export function useProtocolRevenue(protocolSlug, options = {}) {
  return useQuery({
    queryKey: ['defillama', 'revenue', protocolSlug?.toLowerCase()],
    queryFn: () => getProtocolRevenue(protocolSlug),
    enabled: !!protocolSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
    ...options
  });
} 