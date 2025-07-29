import axios from 'axios';
import { config, getTheGraphUrl } from '../config/env.js';

// ================= SUSHISWAP SERVICE =================

// ================= SUSHISWAP V3 FUNCTIONS =================

/**
 * Fetch SushiSwap V3 TVL for a specific token
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<number>} - Total Value Locked in USD
 */
export async function fetchSushiTokenTVL(tokenAddress) {
  try {
    const url = getTheGraphUrl(config.SUSHI_SUBGRAPH_ID);
    const query = `{
      token(id: "${tokenAddress.toLowerCase()}") {
        totalValueLockedUSD
      }
    }`;
    
    const response = await axios.post(url, {
      query: query
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Sushi V3 TVL response:', JSON.stringify(response.data));
    
    if (response.data.errors) {
      console.error('GraphQL error:', response.data.errors);
      return 0;
    }
    
    if (response.data.data && response.data.data.token) {
      return Number(response.data.data.token.totalValueLockedUSD || 0);
    }
    
    return 0;
  } catch (error) {
    console.error(`Error fetching Sushi V3 TVL for ${tokenAddress}:`, error.message);
    return 0;
  }
}

/**
 * Fetch SushiSwap V3 volume for a specific token
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<number>} - Volume in USD
 */
export async function fetchSushiTokenVolume(tokenAddress) {
  try {
    const url = getTheGraphUrl(config.SUSHI_SUBGRAPH_ID);
    const query = `{
      token(id: "${tokenAddress.toLowerCase()}") {
        volumeUSD
      }
    }`;
    
    const response = await axios.post(url, {
      query: query
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Sushi V3 Volume response:', JSON.stringify(response.data));
    
    if (response.data.errors) {
      console.error('GraphQL error:', response.data.errors);
      return 0;
    }
    
    if (response.data.data && response.data.data.token) {
      return Number(response.data.data.token.volumeUSD || 0);
    }
    
    return 0;
  } catch (error) {
    console.error(`Error fetching Sushi V3 volume for ${tokenAddress}:`, error.message);
    return 0;
  }
}

// ================= SUSHISWAP V2 FUNCTIONS =================

/**
 * Fetch SushiSwap V2 TVL for a specific token by finding all pairs containing that token
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<number>} - Total Value Locked in USD across all pairs containing the token
 */
export async function fetchSushiV2TokenTVL(tokenAddress) {
  try {
    const url = getTheGraphUrl(config.SUSHI_V2_SUBGRAPH_ID);
    const query = `{
      pairs(where: {token0: "${tokenAddress.toLowerCase()}"}) {
        reserveUSD
      }
      pairs1: pairs(where: {token1: "${tokenAddress.toLowerCase()}"}) {
        reserveUSD
      }
    }`;
    
    const response = await axios.post(url, {
      query: query
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Sushi V2 TVL response:', JSON.stringify(response.data));
    
    if (response.data.errors) {
      console.error('GraphQL error:', response.data.errors);
      return 0;
    }
    
    let totalTVL = 0;
    if (response.data.data) {
      // Sum TVL from pairs where token is token0
      if (response.data.data.pairs) {
        response.data.data.pairs.forEach(pair => {
          totalTVL += Number(pair.reserveUSD || 0);
        });
      }
      
      // Sum TVL from pairs where token is token1
      if (response.data.data.pairs1) {
        response.data.data.pairs1.forEach(pair => {
          totalTVL += Number(pair.reserveUSD || 0);
        });
      }
    }
    
    return totalTVL;
  } catch (error) {
    console.error(`Error fetching Sushi V2 TVL for ${tokenAddress}:`, error.message);
    return 0;
  }
}

/**
 * Fetch SushiSwap V2 24h volume for a specific token
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<number>} - 24h volume in USD
 */
export async function fetchSushiV2TokenVolume24h(tokenAddress) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 24 * 60 * 60;
    const url = getTheGraphUrl(config.SUSHI_V2_SUBGRAPH_ID);
    
    const query = `{
      swaps(
        where: {
          pair_: { token0: "${tokenAddress.toLowerCase()}" }
          timestamp_gte: ${dayAgo}
        }
        first: 1000
      ) {
        amountUSD
      }
      swaps1: swaps(
        where: {
          pair_: { token1: "${tokenAddress.toLowerCase()}" }
          timestamp_gte: ${dayAgo}
        }
        first: 1000
      ) {
        amountUSD
      }
    }`;
    
    const response = await axios.post(url, {
      query: query
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Sushi V2 24h Volume response:', JSON.stringify(response.data));
    
    if (response.data.errors) {
      console.error('GraphQL error:', response.data.errors);
      return 0;
    }
    
    let totalVolume = 0;
    if (response.data.data) {
      // Sum volume from swaps where token is token0
      if (response.data.data.swaps) {
        response.data.data.swaps.forEach(swap => {
          totalVolume += Number(swap.amountUSD || 0);
        });
      }
      
      // Sum volume from swaps where token is token1
      if (response.data.data.swaps1) {
        response.data.data.swaps1.forEach(swap => {
          totalVolume += Number(swap.amountUSD || 0);
        });
      }
    }
    
    return totalVolume;
  } catch (error) {
    console.error(`Error fetching Sushi V2 24h volume for ${tokenAddress}:`, error.message);
    return 0;
  }
}

// ================= COMBINED SUSHISWAP FUNCTIONS =================

/**
 * Fetch total SushiSwap TVL (V2 + V3) for a specific token
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<number>} - Combined TVL in USD
 */
export async function fetchSushiTotalTVL(tokenAddress) {
  try {
    const [v2TVL, v3TVL] = await Promise.all([
      fetchSushiV2TokenTVL(tokenAddress),
      fetchSushiTokenTVL(tokenAddress)
    ]);
    
    return (v2TVL || 0) + (v3TVL || 0);
  } catch (error) {
    console.error(`Error fetching Sushi total TVL for ${tokenAddress}:`, error.message);
    return 0;
  }
}

/**
 * Fetch total SushiSwap 24h volume (V2 + V3) for a specific token
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<number>} - Combined 24h volume in USD
 */
export async function fetchSushiTotalVolume24h(tokenAddress) {
  try {
    const [v2Volume, v3Volume] = await Promise.all([
      fetchSushiV2TokenVolume24h(tokenAddress),
      fetchSushiTokenVolume(tokenAddress)
    ]);
    
    return (v2Volume || 0) + (v3Volume || 0);
  } catch (error) {
    console.error(`Error fetching Sushi total 24h volume for ${tokenAddress}:`, error.message);
    return 0;
  }
}

// ================= HELPER FUNCTIONS =================

/**
 * Get SushiSwap V2 pairs for a specific token (useful for caching and optimization)
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<Array>} - Array of pair objects
 */
export async function getSushiV2PairsForToken(tokenAddress) {
  try {
    const url = getTheGraphUrl(config.SUSHI_V2_SUBGRAPH_ID);
    
    const query = `{
      pairsAsToken0: pairs(where: {token0: "${tokenAddress.toLowerCase()}"}) {
        id
        token0 {
          id
          symbol
          name
        }
        token1 {
          id
          symbol
          name
        }
        reserveUSD
        volumeUSD
        createdAtTimestamp
      }
      pairsAsToken1: pairs(where: {token1: "${tokenAddress.toLowerCase()}"}) {
        id
        token0 {
          id
          symbol
          name
        }
        token1 {
          id
          symbol
          name
        }
        reserveUSD
        volumeUSD
        createdAtTimestamp
      }
    }`;
    
    const response = await axios.post(url, {
      query: query
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.errors) {
      console.error('GraphQL error:', response.data.errors);
      return [];
    }
    
    const allPairs = [];
    const seenPairIds = new Set();
    
    // Combine and deduplicate pairs
    if (response.data.data) {
      if (response.data.data.pairsAsToken0) {
        response.data.data.pairsAsToken0.forEach(pair => {
          if (!seenPairIds.has(pair.id)) {
            allPairs.push(pair);
            seenPairIds.add(pair.id);
          }
        });
      }
      if (response.data.data.pairsAsToken1) {
        response.data.data.pairsAsToken1.forEach(pair => {
          if (!seenPairIds.has(pair.id)) {
            allPairs.push(pair);
            seenPairIds.add(pair.id);
          }
        });
      }
    }
    
    return allPairs;
  } catch (error) {
    console.error(`Error fetching Sushi V2 pairs for ${tokenAddress}:`, error.message);
    return [];
  }
}

/**
 * More efficient V2 TVL calculation using cached pairs data
 * @param {string} tokenAddress - The token contract address
 * @param {Array} pairsData - Pre-fetched pairs data
 * @returns {number} - Total Value Locked in USD
 */
export function calculateSushiV2TVLFromPairs(tokenAddress, pairsData) {
  if (!pairsData || !Array.isArray(pairsData)) return 0;
  
  return pairsData.reduce((total, pair) => {
    return total + Number(pair.reserveUSD || 0);
  }, 0);
}

/**
 * Get SushiSwap V3 token info (if available)
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<object|null>} - Token information object or null
 */
export async function getSushiV3TokenInfo(tokenAddress) {
  try {
    const url = getTheGraphUrl(config.SUSHI_SUBGRAPH_ID);
    const query = `{
      token(id: "${tokenAddress.toLowerCase()}") {
        id
        symbol
        name
        decimals
        totalValueLockedUSD
        volumeUSD
        txCount
        poolCount
      }
    }`;
    
    const response = await axios.post(url, {
      query: query
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.errors) {
      console.error('GraphQL error:', response.data.errors);
      return null;
    }
    
    return response.data.data?.token || null;
  } catch (error) {
    console.error(`Error fetching Sushi V3 token info for ${tokenAddress}:`, error.message);
    return null;
  }
} 