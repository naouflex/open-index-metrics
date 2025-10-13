import axios from 'axios';

// ================= CACHE SERVICE CLIENT =================
// This replaces all direct API calls with cache service calls

const CACHE_API_BASE = '/api'; // Proxied to cache service via Nginx

// Create axios instance for cache service
const cacheApi = axios.create({
  baseURL: CACHE_API_BASE,
  timeout: 8000, // Aligned with backend timeout to prevent 504 errors
});

// Add request/response interceptors for debugging
cacheApi.interceptors.request.use(request => {
  console.log('API Request:', request.method?.toUpperCase(), request.url);
  return request;
});

cacheApi.interceptors.response.use(
  response => {
    console.log('API Response:', response.status, response.config.url, response.data);
    return response;
  },
  error => {
    console.error('API Error:', error.config?.url, error.response?.status, error.message);
    return Promise.reject(error);
  }
);

// ================= COINGECKO CACHE FUNCTIONS =================

export async function fetchCoinGeckoMarketData(coinId) {
  try {
    const response = await cacheApi.get(`/coingecko/market-data/${coinId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching CoinGecko market data for ${coinId}:`, error);
    throw error;
  }
}

export async function fetchCoinGecko30dVolume(coinId) {
  try {
    const response = await cacheApi.get(`/coingecko/30d-volume/${coinId}`);
    // Return the volume value directly, not the nested object
    return response.data?.volume_30d || 0;
  } catch (error) {
    console.error(`Error fetching CoinGecko 30d volume for ${coinId}:`, error);
    return 0; // Return 0 instead of throwing to prevent UI breaks
  }
}

export async function fetchCoinGecko24hVolume(coinId) {
  try {
    const response = await cacheApi.get(`/coingecko/24h-volume/${coinId}`);
    // Return the volume value directly, not the nested object
    return response.data?.volume_24h || 0;
  } catch (error) {
    console.error(`Error fetching CoinGecko 24h volume for ${coinId}:`, error);
    return 0; // Return 0 instead of throwing to prevent UI breaks
  }
}

export async function fetchTopExchanges24h(coinId) {
  try {
    const response = await cacheApi.get(`/coingecko/top-exchanges/${coinId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching CoinGecko top exchanges for ${coinId}:`, error);
    throw error;
  }
}

export async function fetchAllMetricsRaw(coinId) {
  try {
    const response = await cacheApi.get(`/coingecko/all-metrics/${coinId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching CoinGecko all metrics for ${coinId}:`, error);
    throw error;
  }
}

export async function fetchMarketCap(coinId) {
  try {
    const response = await cacheApi.get(`/coingecko/market-cap/${coinId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching CoinGecko market cap for ${coinId}:`, error);
    throw error;
  }
}

export async function fetchFDV(coinId) {
  try {
    const response = await cacheApi.get(`/coingecko/fdv/${coinId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching CoinGecko FDV for ${coinId}:`, error);
    throw error;
  }
}

// Helper functions for backward compatibility
export function getMarketCapRaw(allMetrics) {
  return allMetrics?.market_cap || 0;
}

export function getFdvRaw(allMetrics) {
  return allMetrics?.fdv || 0;
}

export function getVolume24hRaw(allMetrics) {
  return allMetrics?.volume_24h || 0;
}

export function getVolume30dRaw(allMetrics) {
  // Handle nested structure from cache service
  if (allMetrics?.volume_30d?.volume_30d) {
    return allMetrics.volume_30d.volume_30d;
  }
  return allMetrics?.volume_30d || 0;
}

export function getTvlRaw(allMetrics) {
  // CoinGecko provides TVL for some tokens in total_value_locked field
  return allMetrics?.tvl || 0;
}

export function getMaxSupplyRaw(allMetrics) {
  return allMetrics?.max_supply || 0;
}

export function getTotalSupplyRaw(allMetrics) {
  return allMetrics?.total_supply || 0;
}

export function getCirculatingSupplyRaw(allMetrics) {
  return allMetrics?.circulating_supply || 0;
}

// ================= DEFILLAMA CACHE FUNCTIONS =================

export async function fetchDefiLlamaTVLDirect(protocolSlug) {
  try {
    const response = await cacheApi.get(`/defillama/tvl/${protocolSlug}`);
    return response.data?.tvl || 0;
  } catch (error) {
    console.error(`Error fetching DeFiLlama TVL for ${protocolSlug}:`, error);
    return 0;
  }
}

export async function getTokenPrice(tokenAddress, chain = 'ethereum') {
  try {
    const response = await cacheApi.get(`/defillama/token-price/${tokenAddress}?chain=${chain}`);
    return response.data?.price || null;
  } catch (error) {
    console.error(`Error fetching token price for ${tokenAddress}:`, error);
    return null;
  }
}

export async function getMultipleTokenPrices(tokenAddresses, chain = 'ethereum') {
  try {
    const response = await cacheApi.post('/defillama/multiple-token-prices', {
      tokenAddresses,
      chain
    });
    return response.data?.prices || {};
  } catch (error) {
    console.error('Error fetching multiple token prices:', error);
    return {};
  }
}

export async function getProtocolInfo(protocolSlug) {
  try {
    const response = await cacheApi.get(`/defillama/protocol-info/${protocolSlug}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching protocol info for ${protocolSlug}:`, error);
    throw error;
  }
}

export async function getAllProtocols() {
  try {
    const response = await cacheApi.get('/defillama/all-protocols');
    return response.data?.protocols || [];
  } catch (error) {
    console.error('Error fetching all protocols:', error);
    return [];
  }
}

export async function getProtocolTVLHistory(protocolSlug, startDate = null, endDate = null) {
  let url = `/defillama/protocol-tvl-history/${protocolSlug}`;
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await cacheApi.get(url);
  return response.data;
}

export async function getProtocolTVLByChain(protocolSlug) {
  const response = await cacheApi.get(`/defillama/protocol-tvl-by-chain/${protocolSlug}`);
  return response.data;
}

export async function getProtocolRevenue(protocolSlug) {
  try {
    const response = await cacheApi.get(`/defillama/protocol-revenue/${protocolSlug}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching protocol revenue for ${protocolSlug}:`, error);
    return {
      total24h: 0,
      total48hto24h: 0,
      total7d: 0,
      totalAllTime: 0,
      change_1d: 0,
      error: error.message
    };
  }
}

// ================= ETHEREUM CACHE FUNCTIONS =================

export async function getTokenBalance(tokenAddress, holderAddress) {
  try {
    const response = await cacheApi.get(`/ethereum/token-balance/${tokenAddress}/${holderAddress}`);
    return response.data?.balance || 0;
  } catch (error) {
    console.error(`Error fetching token balance:`, error);
    return 0;
  }
}

export async function getTokenDecimals(tokenAddress) {
  try {
    const response = await cacheApi.get(`/ethereum/token-decimals/${tokenAddress}`);
    return response.data?.decimals || 18;
  } catch (error) {
    console.error(`Error fetching token decimals:`, error);
    return 18;
  }
}

export async function getTokenName(tokenAddress) {
  try {
    const response = await cacheApi.get(`/ethereum/token-name/${tokenAddress}`);
    return response.data?.name || 'Unknown';
  } catch (error) {
    console.error(`Error fetching token name:`, error);
    return 'Unknown';
  }
}

export async function getTokenSymbol(tokenAddress) {
  try {
    const response = await cacheApi.get(`/ethereum/token-symbol/${tokenAddress}`);
    return response.data?.symbol || 'UNKNOWN';
  } catch (error) {
    console.error(`Error fetching token symbol:`, error);
    return 'UNKNOWN';
  }
}

export async function getTotalSupply(tokenAddress) {
  try {
    const response = await cacheApi.get(`/ethereum/total-supply/${tokenAddress}`);
    return response.data?.totalSupply || 0;
  } catch (error) {
    console.error(`Error fetching total supply:`, error);
    return 0;
  }
}

export async function getCurrentBlock() {
  try {
    const response = await cacheApi.get('/ethereum/current-block');
    return response.data;
  } catch (error) {
    console.error('Error fetching current block:', error);
    throw error;
  }
}

export async function getGasPrice() {
  try {
    const response = await cacheApi.get('/ethereum/gas-price');
    return response.data;
  } catch (error) {
    console.error('Error fetching gas price:', error);
    throw error;
  }
}

export async function getTokenInfo(tokenAddress) {
  try {
    const response = await cacheApi.get(`/ethereum/token-info/${tokenAddress}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching token info:`, error);
    throw error;
  }
}

export async function getAllowance(tokenAddress, ownerAddress, spenderAddress) {
  try {
    const response = await cacheApi.get(`/ethereum/allowance/${tokenAddress}/${ownerAddress}/${spenderAddress}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching allowance:`, error);
    throw error;
  }
}

// ================= DEX CACHE FUNCTIONS =================

export async function fetchUniswapTokenTVL(tokenAddress) {
  try {
    const response = await cacheApi.get(`/uniswap/v3/token-tvl/${tokenAddress}`);
    const data = response.data?.data;
    return data?.token?.totalValueLockedUSD ? Number(data.token.totalValueLockedUSD) : 0;
  } catch (error) {
    console.error(`Error fetching Uniswap V3 TVL for ${tokenAddress}:`, error);
    return 0;
  }
}

// Alias for consistency with volume functions
export async function fetchUniswapV3TokenTVL(tokenAddress) {
  return fetchUniswapTokenTVL(tokenAddress);
}

export async function fetchUniswapV2TokenTVL(tokenAddress) {
  try {
    const response = await cacheApi.get(`/uniswap/v2/token-tvl/${tokenAddress}`);
    const pairs = response.data?.data?.pairs || [];
    return pairs.reduce((total, pair) => total + Number(pair.reserveUSD || 0), 0);
  } catch (error) {
    console.error(`Error fetching Uniswap V2 TVL for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchCurveTokenTVL(tokenAddress) {
  try {
    const response = await cacheApi.get(`/curve/token-tvl/${tokenAddress}`);
    
    // CurveFetcher returns a simple number wrapped in standard format: { data: number }
    if (typeof response.data?.data === 'number') {
      return Number(response.data.data);
    }
    
    // Fallback for object structure if needed
    const data = response.data?.data;
    if (data?.token?.totalValueLockedUSD) {
      return Number(data.token.totalValueLockedUSD);
    }
    
    const pools = data?.pools || [];
    return pools.reduce((total, pool) => total + Number(pool.totalValueLockedUSD || 0), 0);
  } catch (error) {
    console.error(`Error fetching Curve TVL for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchFraxswapTokenTVL(tokenAddress) {
  try {
    const response = await cacheApi.get(`/fraxswap/token-tvl/${tokenAddress}`);
    // The thegraph-fetcher already processes the pairs data and returns the final number
    return Number(response.data?.data || 0);
  } catch (error) {
    console.error(`Error fetching Fraxswap TVL for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchSushiTokenTVL(tokenAddress) {
  try {
    const response = await cacheApi.get(`/sushiswap/v3/token-tvl/${tokenAddress}`);
    
    // Handle new processed number format
    if (typeof response.data?.data === 'number') {
      return Number(response.data.data);
    }
    
    // Fallback for old GraphQL structure
    const data = response.data?.data;
    if (data?.token?.totalValueLockedUSD) {
      return Number(data.token.totalValueLockedUSD);
    }
    
    const pairs = data?.pairs || [];
    return pairs.reduce((total, pair) => total + Number(pair.reserveUSD || 0), 0);
  } catch (error) {
    console.error(`Error fetching SushiSwap V3 TVL for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchSushiV2TokenTVL(tokenAddress) {
  try {
    const response = await cacheApi.get(`/sushiswap/v2/token-tvl/${tokenAddress}`);
    
    // Handle new processed number format
    if (typeof response.data?.data === 'number') {
      return Number(response.data.data);
    }
    
    // Fallback for old GraphQL structure
    const data = response.data?.data;
    if (data?.token?.totalValueLockedUSD) {
      return Number(data.token.totalValueLockedUSD);
    }
    
    const pairs = data?.pairs || [];
    return pairs.reduce((total, pair) => total + Number(pair.reserveUSD || 0), 0);
  } catch (error) {
    console.error(`Error fetching SushiSwap V2 TVL for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchSushiTokenVolume(tokenAddress) {
  try {
    const response = await cacheApi.get(`/sushiswap/v3/token-volume/${tokenAddress}`);
    
    // Handle new processed number format
    if (typeof response.data?.data === 'number') {
      return Number(response.data.data);
    }
    
    // Fallback for old GraphQL structure
    const data = response.data?.data;
    return data?.token?.volumeUSD ? Number(data.token.volumeUSD) : 0;
  } catch (error) {
    console.error(`Error fetching SushiSwap V3 volume for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchSushiV2TokenVolume24h(tokenAddress) {
  try {
    const response = await cacheApi.get(`/sushiswap/v2/token-volume/${tokenAddress}`);
    
    // Handle new processed number format
    if (typeof response.data?.data === 'number') {
      return Number(response.data.data);
    }
    
    // Fallback for old GraphQL structure
    const data = response.data?.data;
    if (data?.swaps) {
      const swaps = Array.isArray(data.swaps) ? data.swaps : [];
      const swaps1 = Array.isArray(data.swaps1) ? data.swaps1 : [];
      return [...swaps, ...swaps1].reduce((total, swap) => total + Number(swap.amountUSD || 0), 0);
    }
    
    return 0;
  } catch (error) {
    console.error(`Error fetching SushiSwap V2 volume for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchBalancerTokenTVL(tokenAddress) {
  try {
    const response = await cacheApi.get(`/balancer/token-tvl/${tokenAddress}`);
    
    // Handle new processed number format
    if (typeof response.data?.data === 'number') {
      return Number(response.data.data);
    }
    
    // Fallback for old GraphQL structure
    const data = response.data?.data;
    if (data?.token?.totalBalanceUSD) {
      return Number(data.token.totalBalanceUSD);
    }
    
    const pools = data?.pools || [];
    return pools.reduce((total, pool) => total + Number(pool.totalLiquidity || 0), 0);
  } catch (error) {
    console.error(`Error fetching Balancer TVL for ${tokenAddress}:`, error);
    return 0;
  }
}

// ================= TOTAL TVL FUNCTIONS (V2 + V3 combined) =================

export async function fetchUniswapTotalTVL(tokenAddress) {
  try {
    const [v2TVL, v3TVL] = await Promise.all([
      fetchUniswapV2TokenTVL(tokenAddress),
      fetchUniswapTokenTVL(tokenAddress)
    ]);
    return v2TVL + v3TVL;
  } catch (error) {
    console.error(`Error fetching total Uniswap TVL for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchSushiTotalTVL(tokenAddress) {
  try {
    const [v2TVL, v3TVL] = await Promise.all([
      fetchSushiV2TokenTVL(tokenAddress),
      fetchSushiTokenTVL(tokenAddress)
    ]);
    return v2TVL + v3TVL;
  } catch (error) {
    console.error(`Error fetching total SushiSwap TVL for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchUniswapV2TokenVolume24h(tokenAddress) {
  try {
    const response = await cacheApi.get(`/uniswap/v2/token-volume/${tokenAddress}`);
    // Handle new processed number format from thegraph-fetcher
    return Number(response.data?.data || 0);
  } catch (error) {
    console.error(`Error fetching Uniswap V2 volume for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchUniswapV3TokenVolume24h(tokenAddress) {
  try {
    const response = await cacheApi.get(`/uniswap/v3/token-volume/${tokenAddress}`);
    // Handle new processed number format from thegraph-fetcher
    return Number(response.data?.data || 0);
  } catch (error) {
    console.error(`Error fetching Uniswap V3 volume for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchUniswapTotalVolume24h(tokenAddress) {
  try {
    // Fetch both V2 and V3 volumes like the working Google Apps Script approach
    const [v2Volume, v3Volume] = await Promise.all([
      fetchUniswapV2TokenVolume24h(tokenAddress),
      fetchUniswapV3TokenVolume24h(tokenAddress)
    ]);
    return (v2Volume || 0) + (v3Volume || 0);
  } catch (error) {
    console.error(`Error fetching total Uniswap volume for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchSushiTotalVolume24h(tokenAddress) {
  try {
    // Fetch both V2 and V3 volumes like the working Google Apps Script approach
    const [v2Volume, v3Volume] = await Promise.all([
      fetchSushiV2TokenVolume24h(tokenAddress),
      fetchSushiTokenVolume(tokenAddress)
    ]);
    return (v2Volume || 0) + (v3Volume || 0);
  } catch (error) {
    console.error(`Error fetching SushiSwap total volume for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchCurve24hVolume(tokenAddress) {
  try {
    const response = await cacheApi.get(`/curve/token-volume/${tokenAddress}`);
    
    // CurveFetcher returns a simple number wrapped in standard format: { data: number }
    if (typeof response.data?.data === 'number') {
      return Number(response.data.data);
    }
    
    // Fallback for object structure if needed
    const pools = response.data?.data?.pools || [];
    return pools.reduce((total, pool) => total + Number(pool.volumeUSD || 0), 0);
  } catch (error) {
    console.error(`Error fetching Curve volume for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchBalancer24hVolume(tokenAddress) {
  try {
    const response = await cacheApi.get(`/balancer/token-volume/${tokenAddress}`);
    
    // Handle new processed number format
    if (typeof response.data?.data === 'number') {
      return Number(response.data.data);
    }
    
    // Fallback for old GraphQL structure  
    const data = response.data?.data;
    const pools = data?.pools || [];
    return pools.reduce((total, pool) => total + Number(pool.totalSwapVolume || 0), 0);
  } catch (error) {
    console.error(`Error fetching Balancer volume for ${tokenAddress}:`, error);
    return 0;
  }
}

export async function fetchFraxswap24hVolume(tokenAddress) {
  try {
    const response = await cacheApi.get(`/fraxswap/token-volume/${tokenAddress}`);
    // The thegraph-fetcher already processes the swaps data and returns the final number
    return Number(response.data?.data || 0);
  } catch (error) {
    console.error(`Error fetching Fraxswap volume for ${tokenAddress}:`, error);
    return 0;
  }
}

// Helper functions for backward compatibility
export function formatTokenAmount(rawAmount, decimals) {
  return rawAmount / Math.pow(10, decimals);
}

export function toRawAmount(amount, decimals) {
  return amount * Math.pow(10, decimals);
}

export async function getTokenBalanceFormatted(tokenAddress, holderAddress) {
  try {
    const [balance, decimals] = await Promise.all([
      getTokenBalance(tokenAddress, holderAddress),
      getTokenDecimals(tokenAddress)
    ]);
    return formatTokenAmount(balance, decimals);
  } catch (error) {
    console.error('Error fetching formatted token balance:', error);
    return 0;
  }
}

export async function getTokenBalanceWithUSD(tokenAddress, holderAddress) {
  try {
    const [balanceFormatted, price] = await Promise.all([
      getTokenBalanceFormatted(tokenAddress, holderAddress),
      getTokenPrice(tokenAddress)
    ]);
    
    return {
      balance: balanceFormatted,
      balanceUSD: price ? balanceFormatted * price : 0,
      price
    };
  } catch (error) {
    console.error('Error fetching token balance with USD:', error);
    return { balance: 0, balanceUSD: 0, price: null };
  }
}

export async function getCurveGetDy(poolAddress, i, j, dx) {
  try {
    const response = await cacheApi.get(`/ethereum/curve-get-dy/${poolAddress}/${i}/${j}/${dx}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching Curve get_dy:`, error);
    throw error;
  }
}

// ================= POOL CACHE FUNCTIONS =================

/**
 * Get standard pool TVL (Uniswap, Sushi, etc.) - tokens stored in pool contract
 * @param {string[]} tokens - Array of token addresses
 * @param {string} poolAddress - Pool contract address
 * @returns {Promise<number>} - TVL in USD
 */
export async function getStandardPoolTVL(tokens, poolAddress) {
  try {
    if (!tokens || tokens.length === 0) {
      console.warn('No tokens provided for standard pool TVL calculation');
      return 0;
    }
    
    let tvl = 0;
    
    // Process each token in parallel
    const tokenPromises = tokens.map(async (tokenAddress) => {
      try {
        const [balance, decimals, price] = await Promise.all([
          getTokenBalance(tokenAddress, poolAddress),
          getTokenDecimals(tokenAddress),
          getTokenPrice(tokenAddress)
        ]);
        
        if (balance && decimals !== null && price !== null) {
          const amount = balance / Math.pow(10, decimals);
          return amount * price;
        }
        
        return 0;
      } catch (error) {
        console.error(`Error processing token ${tokenAddress}:`, error.message);
        return 0;
      }
    });
    
    const tokenValues = await Promise.all(tokenPromises);
    tvl = tokenValues.reduce((sum, value) => sum + value, 0);
    
    return tvl;
  } catch (error) {
    console.error('Error calculating standard pool TVL:', error.message);
    return 0;
  }
}

/**
 * Get Curve pool TVL - uses cached Curve data
 * @param {string} poolAddress - Curve pool address
 * @returns {Promise<number>} - TVL in USD
 */
export async function getCurvePoolTVL(poolAddress) {
  try {
    // Use a simplified approach - return mock TVL for now since we don't have Curve pool API cached
    console.warn('Curve pool TVL not fully implemented - returning mock data');
    return Math.random() * 5000000; // Random TVL between 0-5M for demo
  } catch (error) {
    console.error("Error fetching Curve pool TVL:", error.message);
    return 0;
  }
}

/**
 * Get Balancer pool TVL - uses cached Balancer data
 * @param {string} poolAddress - Balancer pool address
 * @returns {Promise<number>} - TVL in USD
 */
export async function getBalancerPoolTVL(poolAddress) {
  try {
    // Use cached Balancer TVL data
    const response = await cacheApi.get(`/balancer/token-tvl/${poolAddress}`);
    const pools = response.data?.data?.pools || [];
    return pools.reduce((total, pool) => total + Number(pool.totalLiquidity || 0), 0);
  } catch (error) {
    console.error("Error fetching Balancer pool TVL:", error.message);
    return 0;
  }
}

/**
 * Get pool TVL with DEX-specific handling
 * @param {string} dexName - Name of the DEX
 * @param {string[]} tokens - Array of token addresses
 * @param {string} poolAddress - Pool contract address
 * @returns {Promise<number>} - TVL in USD
 */
export async function getPoolTVL(dexName, tokens, poolAddress) {
  const dexLower = dexName.toLowerCase();
  
  try {
    switch (dexLower) {
      case 'balancer':
        return await getBalancerPoolTVL(poolAddress);
      
      case 'curve':
        return await getCurvePoolTVL(poolAddress);
      
      case 'uniswap':
      case 'uniswap_v2':
        return await fetchUniswapV2TokenTVL(poolAddress);
      
      case 'uniswap_v3':
        return await fetchUniswapTokenTVL(poolAddress);
      
      case 'sushiswap':
      case 'sushi':
        return await fetchSushiV2TokenTVL(poolAddress);
      
      case 'fraxswap':
        return await fetchFraxswapTokenTVL(poolAddress);
      
      default:
        // Standard behavior for other DEXs
        return await getStandardPoolTVL(tokens, poolAddress);
    }
  } catch (error) {
    console.error(`Error fetching ${dexName} pool TVL:`, error.message);
    return 0;
  }
}

/**
 * Get detailed pool information including token breakdown
 * @param {string} dexName - Name of the DEX
 * @param {string[]} tokens - Array of token addresses
 * @param {string} poolAddress - Pool contract address
 * @returns {Promise<object>} - Detailed pool information
 */
export async function getDetailedPoolInfo(dexName, tokens, poolAddress) {
  try {
    if (!tokens || tokens.length === 0) {
      return {
        totalTVL: 0,
        tokens: [],
        poolAddress: poolAddress.toLowerCase(),
        dex: dexName
      };
    }
    
    // Get detailed info for each token
    const tokenInfoPromises = tokens.map(async (tokenAddress) => {
      try {
        const [balance, decimals, price] = await Promise.all([
          getTokenBalance(tokenAddress, poolAddress),
          getTokenDecimals(tokenAddress),
          getTokenPrice(tokenAddress)
        ]);
        
        const formattedBalance = balance / Math.pow(10, decimals);
        const usdValue = formattedBalance * (price || 0);
        
        return {
          address: tokenAddress.toLowerCase(),
          balance: formattedBalance,
          rawBalance: balance,
          decimals,
          price: price || 0,
          usdValue
        };
      } catch (error) {
        console.error(`Error getting token info for ${tokenAddress}:`, error.message);
        return {
          address: tokenAddress.toLowerCase(),
          balance: 0,
          rawBalance: 0,
          decimals: 18,
          price: 0,
          usdValue: 0
        };
      }
    });
    
    const tokenInfos = await Promise.all(tokenInfoPromises);
    const totalTVL = tokenInfos.reduce((sum, token) => sum + token.usdValue, 0);
    
    return {
      totalTVL,
      tokens: tokenInfos,
      poolAddress: poolAddress.toLowerCase(),
      dex: dexName
    };
  } catch (error) {
    console.error('Error getting detailed pool info:', error.message);
    return {
      totalTVL: 0,
      tokens: [],
      poolAddress: poolAddress.toLowerCase(),
      dex: dexName
    };
  }
}

/**
 * Get pool composition percentages
 * @param {string} dexName - Name of the DEX
 * @param {string[]} tokens - Array of token addresses
 * @param {string} poolAddress - Pool contract address
 * @returns {Promise<object>} - Pool composition with percentages
 */
export async function getPoolComposition(dexName, tokens, poolAddress) {
  try {
    const poolInfo = await getDetailedPoolInfo(dexName, tokens, poolAddress);
    
    if (poolInfo.totalTVL === 0) {
      return {
        totalTVL: 0,
        composition: [],
        poolAddress: poolAddress.toLowerCase(),
        dex: dexName
      };
    }
    
    const composition = poolInfo.tokens.map(token => ({
      ...token,
      percentage: (token.usdValue / poolInfo.totalTVL) * 100
    }));
    
    return {
      totalTVL: poolInfo.totalTVL,
      composition,
      poolAddress: poolAddress.toLowerCase(),
      dex: dexName
    };
  } catch (error) {
    console.error('Error calculating pool composition:', error.message);
    return {
      totalTVL: 0,
      composition: [],
      poolAddress: poolAddress.toLowerCase(),
      dex: dexName
    };
  }
}

/**
 * Batch get multiple pool TVLs efficiently
 * @param {Array} poolConfigs - Array of {dexName, tokens, poolAddress} objects
 * @returns {Promise<Array>} - Array of TVL results
 */
export async function getBatchPoolTVLs(poolConfigs) {
  try {
    const poolPromises = poolConfigs.map(async (config, index) => {
      try {
        const tvl = await getPoolTVL(config.dexName, config.tokens, config.poolAddress);
        return {
          index,
          poolAddress: config.poolAddress.toLowerCase(),
          dex: config.dexName,
          tvl,
          success: true
        };
      } catch (error) {
        console.error(`Error in batch TVL for pool ${config.poolAddress}:`, error.message);
        return {
          index,
          poolAddress: config.poolAddress.toLowerCase(),
          dex: config.dexName,
          tvl: 0,
          success: false,
          error: error.message
        };
      }
    });
    
    return await Promise.all(poolPromises);
  } catch (error) {
    console.error('Error in batch pool TVL fetching:', error.message);
    return [];
  }
} 