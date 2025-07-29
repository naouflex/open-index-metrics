import axios from 'axios';
import { config, getTheGraphUrl } from '../config/env.js';

// ================= BALANCER SERVICE =================

/**
 * Fetch Balancer TVL for a specific token
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<number>} - Total Value Locked in USD
 */
export async function fetchBalancerTokenTVL(tokenAddress) {
  try {
    const url = getTheGraphUrl(config.BALANCER_V2_SUBGRAPH_ID);
    const query = `{
      token(id: "${tokenAddress.toLowerCase()}") {
        totalBalanceUSD
      }
    }`;
    
    const response = await axios.post(url, {
      query: query
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Balancer TVL response:', response.data);
    
    if (response.data.errors) {
      console.error('GraphQL error:', response.data.errors);
      return 0;
    }
    
    if (response.data.data && response.data.data.token) {
      return Number(response.data.data.token.totalBalanceUSD || 0);
    }
    
    return 0;
  } catch (error) {
    console.error(`Error fetching Balancer TVL for ${tokenAddress}:`, error.message);
    return 0;
  }
}

/**
 * Fetch Balancer 24h volume for a specific token
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<number>} - 24h volume in USD
 */
export async function fetchBalancerTokenVolume(tokenAddress) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 24 * 60 * 60;
    const url = getTheGraphUrl(config.BALANCER_V2_SUBGRAPH_ID);
    
    const query = `{
      swaps(
        where: {
          tokenIn: "${tokenAddress.toLowerCase()}"
          timestamp_gte: ${dayAgo}
        }
        first: 1000
      ) {
        valueUSD
      }
      swaps1: swaps(
        where: {
          tokenOut: "${tokenAddress.toLowerCase()}"
          timestamp_gte: ${dayAgo}
        }
        first: 1000
      ) {
        valueUSD
      }
    }`;
    
    const response = await axios.post(url, {
      query: query
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Balancer 24h Volume response:', response.data);
    
    if (response.data.errors) {
      console.error('GraphQL error:', response.data.errors);
      return 0;
    }
    
    let totalVolume = 0;
    if (response.data.data) {
      // Sum up swaps where token is tokenIn
      if (response.data.data.swaps) {
        response.data.data.swaps.forEach(swap => {
          totalVolume += Number(swap.valueUSD || 0);
        });
      }
      
      // Sum up swaps where token is tokenOut
      if (response.data.data.swaps1) {
        response.data.data.swaps1.forEach(swap => {
          totalVolume += Number(swap.valueUSD || 0);
        });
      }
    }
    
    return totalVolume;
  } catch (error) {
    console.error(`Error fetching Balancer 24h volume for ${tokenAddress}:`, error.message);
    return 0;
  }
} 