import { useQuery } from '@tanstack/react-query';
import {
  getTokenBalance,
  getTokenDecimals,
  getTokenName,
  getTokenSymbol,
  getTotalSupply,
  getTokenInfo,
  getCurrentBlock,
  getGasPrice,
  getAllowance,
  getTokenBalanceFormatted,
  getTokenBalanceWithUSD,
  formatTokenAmount,
  toRawAmount
} from '../services/cache-client.js';

// ================= ETHEREUM HOOKS =================

/**
 * Hook to get token balance for a specific address
 * @param {string} tokenAddress - Token contract address
 * @param {string} holderAddress - Address to check balance for
 * @param {object} options - Query options
 * @returns {object} Query result with balance data
 */
export function useTokenBalance(tokenAddress, holderAddress, options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'tokenBalance', tokenAddress?.toLowerCase(), holderAddress?.toLowerCase()],
    queryFn: () => getTokenBalance(tokenAddress, holderAddress),
    enabled: !!tokenAddress && !!holderAddress,
    staleTime: 30 * 1000, // 30 seconds (balances change frequently)
    cacheTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook to get formatted token balance (human readable)
 * @param {string} tokenAddress - Token contract address
 * @param {string} holderAddress - Address to check balance for
 * @param {object} options - Query options
 * @returns {object} Query result with formatted balance
 */
export function useTokenBalanceFormatted(tokenAddress, holderAddress, options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'tokenBalanceFormatted', tokenAddress?.toLowerCase(), holderAddress?.toLowerCase()],
    queryFn: () => getTokenBalanceFormatted(tokenAddress, holderAddress),
    enabled: !!tokenAddress && !!holderAddress,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook to get token balance with USD value
 * @param {string} tokenAddress - Token contract address
 * @param {string} holderAddress - Address to check balance for
 * @param {object} options - Query options
 * @returns {object} Query result with balance and USD value
 */
export function useTokenBalanceWithUSD(tokenAddress, holderAddress, options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'tokenBalanceUSD', tokenAddress?.toLowerCase(), holderAddress?.toLowerCase()],
    queryFn: () => getTokenBalanceWithUSD(tokenAddress, holderAddress),
    enabled: !!tokenAddress && !!holderAddress,
    staleTime: 1 * 60 * 1000, // 1 minute (prices change)
    cacheTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook to get token decimals
 * @param {string} tokenAddress - Token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with decimals
 */
export function useTokenDecimals(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'tokenDecimals', tokenAddress?.toLowerCase()],
    queryFn: () => getTokenDecimals(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 60 * 60 * 1000, // 1 hour (decimals don't change)
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 2,
    ...options
  });
}

/**
 * Hook to get token name
 * @param {string} tokenAddress - Token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with token name
 */
export function useTokenName(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'tokenName', tokenAddress?.toLowerCase()],
    queryFn: () => getTokenName(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 2,
    ...options
  });
}

/**
 * Hook to get token symbol
 * @param {string} tokenAddress - Token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with token symbol
 */
export function useTokenSymbol(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'tokenSymbol', tokenAddress?.toLowerCase()],
    queryFn: () => getTokenSymbol(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 2,
    ...options
  });
}

/**
 * Hook to get token total supply (on-chain)
 * @param {string} tokenAddress - Token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with total supply
 */
export function useTokenTotalSupply(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'tokenTotalSupply', tokenAddress?.toLowerCase()],
    queryFn: () => getTotalSupply(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook to get token allowance
 * @param {string} tokenAddress - Token contract address
 * @param {string} ownerAddress - Owner address
 * @param {string} spenderAddress - Spender address
 * @param {object} options - Query options
 * @returns {object} Query result with allowance
 */
export function useAllowance(tokenAddress, ownerAddress, spenderAddress, options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'allowance', tokenAddress?.toLowerCase(), ownerAddress?.toLowerCase(), spenderAddress?.toLowerCase()],
    queryFn: () => getAllowance(tokenAddress, ownerAddress, spenderAddress),
    enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook to get complete token information
 * @param {string} tokenAddress - Token contract address
 * @param {object} options - Query options
 * @returns {object} Query result with complete token info
 */
export function useTokenInfo(tokenAddress, options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'tokenInfo', tokenAddress?.toLowerCase()],
    queryFn: () => getTokenInfo(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    ...options
  });
}

/**
 * Hook to get current block number
 * @param {object} options - Query options
 * @returns {object} Query result with current block number
 */
export function useCurrentBlock(options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'currentBlock'],
    queryFn: getCurrentBlock,
    staleTime: 10 * 1000, // 10 seconds
    cacheTime: 30 * 1000, // 30 seconds
    retry: 2,
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
    ...options
  });
}

/**
 * Hook to get current gas price
 * @param {object} options - Query options
 * @returns {object} Query result with gas price
 */
export function useGasPrice(options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'gasPrice'],
    queryFn: getGasPrice,
    staleTime: 10 * 1000, // 10 seconds
    cacheTime: 30 * 1000, // 30 seconds
    retry: 2,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    ...options
  });
}

/**
 * Hook to get multiple token balances for a single address
 * @param {string[]} tokenAddresses - Array of token addresses
 * @param {string} holderAddress - Address to check balances for
 * @param {object} options - Query options
 * @returns {object} Query result with multiple balances
 */
export function useMultipleTokenBalances(tokenAddresses, holderAddress, options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'multipleTokenBalances', tokenAddresses?.sort()?.join(','), holderAddress?.toLowerCase()],
    queryFn: async () => {
      if (!tokenAddresses || !holderAddress) return {};
      
      const promises = tokenAddresses.map(async (tokenAddress) => {
        try {
          const balance = await getTokenBalanceFormatted(tokenAddress, holderAddress);
          return { [tokenAddress.toLowerCase()]: balance };
        } catch (error) {
          console.error(`Error fetching balance for ${tokenAddress}:`, error);
          return { [tokenAddress.toLowerCase()]: 0 };
        }
      });
      
      const results = await Promise.all(promises);
      return results.reduce((acc, result) => ({ ...acc, ...result }), {});
    },
    enabled: !!tokenAddresses && !!holderAddress && tokenAddresses.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook to get multiple token balances with USD values
 * @param {string[]} tokenAddresses - Array of token addresses
 * @param {string} holderAddress - Address to check balances for
 * @param {object} options - Query options
 * @returns {object} Query result with multiple balances and USD values
 */
export function useMultipleTokenBalancesWithUSD(tokenAddresses, holderAddress, options = {}) {
  return useQuery({
    queryKey: ['ethereum', 'multipleTokenBalancesUSD', tokenAddresses?.sort()?.join(','), holderAddress?.toLowerCase()],
    queryFn: async () => {
      if (!tokenAddresses || !holderAddress) return {};
      
      const promises = tokenAddresses.map(async (tokenAddress) => {
        try {
          const balanceInfo = await getTokenBalanceWithUSD(tokenAddress, holderAddress);
          return { [tokenAddress.toLowerCase()]: balanceInfo };
        } catch (error) {
          console.error(`Error fetching balance with USD for ${tokenAddress}:`, error);
          return { 
            [tokenAddress.toLowerCase()]: {
              raw: 0,
              formatted: 0,
              usdValue: 0,
              decimals: 18,
              price: 0
            }
          };
        }
      });
      
      const results = await Promise.all(promises);
      return results.reduce((acc, result) => ({ ...acc, ...result }), {});
    },
    enabled: !!tokenAddresses && !!holderAddress && tokenAddresses.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook to get portfolio value for an address across multiple tokens
 * @param {string[]} tokenAddresses - Array of token addresses
 * @param {string} holderAddress - Address to check portfolio for
 * @param {object} options - Query options
 * @returns {object} Query result with portfolio breakdown and total value
 */
export function usePortfolioValue(tokenAddresses, holderAddress, options = {}) {
  const balancesQuery = useMultipleTokenBalancesWithUSD(tokenAddresses, holderAddress, options);
  
  return useQuery({
    queryKey: ['ethereum', 'portfolioValue', tokenAddresses?.sort()?.join(','), holderAddress?.toLowerCase()],
    queryFn: () => {
      if (!balancesQuery.data) return { tokens: [], totalValue: 0 };
      
      const tokens = Object.entries(balancesQuery.data).map(([address, balanceInfo]) => ({
        address,
        ...balanceInfo
      }));
      
      const totalValue = tokens.reduce((sum, token) => sum + token.usdValue, 0);
      
      return {
        tokens: tokens.sort((a, b) => b.usdValue - a.usdValue), // Sort by USD value descending
        totalValue
      };
    },
    enabled: !!balancesQuery.data,
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes
  });
}

/**
 * Utility hook that provides formatting functions
 * @returns {object} Formatting utility functions
 */
export function useEthereumUtils() {
  return {
    formatTokenAmount,
    toRawAmount,
    // Helper to format balance with symbol
    formatBalanceWithSymbol: (balance, decimals, symbol) => {
      const formatted = formatTokenAmount(balance, decimals);
      return `${formatted.toLocaleString()} ${symbol}`;
    },
    // Helper to format USD value
    formatUSDValue: (usdValue) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(usdValue);
    },
    // Helper to format gas price in gwei
    formatGasPrice: (gasPriceWei) => {
      return (gasPriceWei / 1e9).toFixed(2) + ' gwei';
    }
  };
} 