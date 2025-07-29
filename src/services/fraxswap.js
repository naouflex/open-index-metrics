import axios from 'axios';
import { config, getTheGraphUrl } from '../config/env.js';

// ================= FRAXSWAP SERVICE =================

/**
 * Fetch Fraxswap TVL for a specific token by finding all pairs containing that token
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<number>} - Total Value Locked in USD across all pairs containing the token
 */
export async function fetchFraxswapTokenTVL(tokenAddress) {
  try {
    const url = getTheGraphUrl(config.FRAXSWAP_SUBGRAPH_ID);
    let totalTVL = 0;
    let pairCount = 0;
    
    // Query for pairs where token is token0
    const query1 = `{
      pairs(where: {token0: "${tokenAddress.toLowerCase()}"}) {
        id
        reserveUSD
      }
    }`;
    
    const response1 = await axios.post(url, {
      query: query1
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Fraxswap TVL query 1 response length: ${JSON.stringify(response1.data).length}`);
    
    if (response1.data.errors) {
      console.error('GraphQL error:', response1.data.errors);
    } else if (response1.data.data && response1.data.data.pairs) {
      for (const pair of response1.data.data.pairs) {
        const tvl = Number(pair.reserveUSD || 0);
        totalTVL += tvl;
        pairCount++;
        console.log(`Token0 pair ${pairCount}: ${pair.id}, TVL: ${tvl}, Running total: ${totalTVL}`);
      }
    }
    
    // Query for pairs where token is token1
    const query2 = `{
      pairs(where: {token1: "${tokenAddress.toLowerCase()}"}) {
        id
        reserveUSD
      }
    }`;
    
    const response2 = await axios.post(url, {
      query: query2
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Fraxswap TVL query 2 response length: ${JSON.stringify(response2.data).length}`);
    
    if (response2.data.errors) {
      console.error('GraphQL error 2:', response2.data.errors);
    } else if (response2.data.data && response2.data.data.pairs) {
      for (const pair of response2.data.data.pairs) {
        const tvl = Number(pair.reserveUSD || 0);
        totalTVL += tvl;
        pairCount++;
        console.log(`Token1 pair ${pairCount}: ${pair.id}, TVL: ${tvl}, Running total: ${totalTVL}`);
      }
    }
    
    console.log(`Final result - Total pairs: ${pairCount}, Total TVL: ${totalTVL}`);
    return totalTVL;
  } catch (error) {
    console.error(`Error fetching Fraxswap TVL for ${tokenAddress}:`, error.message);
    return 0;
  }
}

/**
 * Fetch Fraxswap 24h volume for a specific token across all pairs containing that token
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<number>} - 24h volume in USD
 */
export async function fetchFraxswapTokenVolume(tokenAddress) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 24 * 60 * 60;
    const url = getTheGraphUrl(config.FRAXSWAP_SUBGRAPH_ID);
    
    // First get all pairs that contain the token
    const pairsQuery = `{
      pairsAsToken0: pairs(where: {token0: "${tokenAddress.toLowerCase()}"}) {
        id
      }
      pairsAsToken1: pairs(where: {token1: "${tokenAddress.toLowerCase()}"}) {
        id
      }
    }`;
    
    const pairsResponse = await axios.post(url, {
      query: pairsQuery
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Fraxswap pairs response:', JSON.stringify(pairsResponse.data));
    
    if (pairsResponse.data.errors) {
      console.error('GraphQL error:', pairsResponse.data.errors);
      return 0;
    }
    
    let totalVolume = 0;
    const processedPairs = []; // Array to track processed pairs
    
    // Collect all unique pair IDs
    if (pairsResponse.data.data) {
      if (pairsResponse.data.data.pairsAsToken0) {
        pairsResponse.data.data.pairsAsToken0.forEach(pair => {
          if (!processedPairs.includes(pair.id)) {
            processedPairs.push(pair.id);
          }
        });
      }
      if (pairsResponse.data.data.pairsAsToken1) {
        pairsResponse.data.data.pairsAsToken1.forEach(pair => {
          if (!processedPairs.includes(pair.id)) {
            processedPairs.push(pair.id);
          }
        });
      }
    }
    
    // Get volume for each unique pair
    for (const pairId of processedPairs) {
      const swapsQuery = `{
        swaps(
          where: {
            pair: "${pairId}"
            timestamp_gte: ${dayAgo}
          }
          first: 1000
        ) {
          amountUSD
        }
      }`;
      
      const swapsResponse = await axios.post(url, {
        query: swapsQuery
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (swapsResponse.data.data && swapsResponse.data.data.swaps) {
        swapsResponse.data.data.swaps.forEach(swap => {
          totalVolume += Number(swap.amountUSD || 0);
        });
      }
    }
    
    return totalVolume;
  } catch (error) {
    console.error(`Error fetching Fraxswap 24h volume for ${tokenAddress}:`, error.message);
    return 0;
  }
}

/**
 * Get all pairs containing a specific token (useful for caching and optimization)
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<Array>} - Array of pair objects
 */
export async function getFraxswapPairsForToken(tokenAddress) {
  try {
    const url = getTheGraphUrl(config.FRAXSWAP_SUBGRAPH_ID);
    
    const pairsQuery = `{
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
      query: pairsQuery
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
    console.error(`Error fetching Fraxswap pairs for ${tokenAddress}:`, error.message);
    return [];
  }
}

/**
 * More efficient TVL calculation using cached pairs data
 * @param {string} tokenAddress - The token contract address
 * @param {Array} pairsData - Pre-fetched pairs data
 * @returns {number} - Total Value Locked in USD
 */
export function calculateTVLFromFraxswapPairs(tokenAddress, pairsData) {
  if (!pairsData || !Array.isArray(pairsData)) return 0;
  
  return pairsData.reduce((total, pair) => {
    return total + Number(pair.reserveUSD || 0);
  }, 0);
}

/**
 * Get volume for specific pairs over a time period
 * @param {Array} pairIds - Array of pair IDs
 * @param {number} timeframeHours - Hours to look back (defaults to 24)
 * @returns {Promise<number>} - Total volume in USD
 */
export async function getFraxswapPairsVolume(pairIds, timeframeHours = 24) {
  try {
    if (!pairIds || pairIds.length === 0) return 0;
    
    const now = Math.floor(Date.now() / 1000);
    const timeAgo = now - timeframeHours * 60 * 60;
    const url = getTheGraphUrl(config.FRAXSWAP_SUBGRAPH_ID);
    
    let totalVolume = 0;
    
    // Process pairs in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < pairIds.length; i += batchSize) {
      const batch = pairIds.slice(i, i + batchSize);
      
      // Create parallel requests for this batch
      const promises = batch.map(async (pairId) => {
        const swapsQuery = `{
          swaps(
            where: {
              pair: "${pairId}"
              timestamp_gte: ${timeAgo}
            }
            first: 1000
          ) {
            amountUSD
          }
        }`;
        
        const response = await axios.post(url, {
          query: swapsQuery
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.data && response.data.data.swaps) {
          return response.data.data.swaps.reduce((sum, swap) => {
            return sum + Number(swap.amountUSD || 0);
          }, 0);
        }
        
        return 0;
      });
      
      const batchResults = await Promise.all(promises);
      totalVolume += batchResults.reduce((sum, volume) => sum + volume, 0);
    }
    
    return totalVolume;
  } catch (error) {
    console.error('Error fetching Fraxswap pairs volume:', error.message);
    return 0;
  }
} 