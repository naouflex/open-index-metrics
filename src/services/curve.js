import axios from 'axios';

// ================= CURVE SERVICE =================

/**
 * Fetch Curve TVL for a specific token by finding all pools containing that token
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<number>} - Total Value Locked in USD across all pools containing the token
 */
export async function fetchCurveTokenTVL(tokenAddress) {
  try {
    const url = "https://api.curve.finance/v1/getPools/all/ethereum";
    const response = await axios.get(url);
    
    let totalTVL = 0;
    
    if (response.data.success && response.data.data && response.data.data.poolData) {
      for (const pool of response.data.data.poolData) {
        // Check if this pool contains our token
        let hasToken = false;
        if (pool.coinsAddresses) {
          for (const coinAddress of pool.coinsAddresses) {
            if (coinAddress.toLowerCase() === tokenAddress.toLowerCase()) {
              hasToken = true;
              break;
            }
          }
        }
        
        if (hasToken && pool.coins) {
          // Calculate TVL using pool balances and USD prices
          let poolTVL = 0;
          for (const coin of pool.coins) {
            if (coin.poolBalance && coin.usdPrice) {
              const balance = Number(coin.poolBalance);
              const price = Number(coin.usdPrice);
              const decimals = Number(coin.decimals || 18);
              const coinValue = (balance * price) / Math.pow(10, decimals);
              poolTVL += coinValue;
            }
          }
          
          totalTVL += poolTVL;
          console.log(`Curve Pool: ${pool.name}, TVL: ${poolTVL}`);
        }
      }
    }
    
    return totalTVL;
  } catch (error) {
    console.error(`Error fetching Curve TVL for ${tokenAddress}:`, error.message);
    return 0;
  }
}

/**
 * Fetch Curve 24h volume for a specific token across all pools containing that token
 * @param {string} tokenAddress - The token contract address
 * @returns {Promise<number>} - 24h volume in USD
 */
export async function fetchCurveTokenVolume(tokenAddress) {
  try {
    // First get all pools to find which ones contain our token
    const poolUrl = "https://api.curve.finance/v1/getPools/all/ethereum";
    const poolResponse = await axios.get(poolUrl);
    
    const relevantPoolAddresses = [];
    if (poolResponse.data.success && poolResponse.data.data && poolResponse.data.data.poolData) {
      for (const poolInfo of poolResponse.data.data.poolData) {
        if (poolInfo.coinsAddresses) {
          for (const coinAddress of poolInfo.coinsAddresses) {
            if (coinAddress.toLowerCase() === tokenAddress.toLowerCase()) {
              relevantPoolAddresses.push(poolInfo.address.toLowerCase());
              break;
            }
          }
        }
      }
    }
    
    // Now get volumes for these specific pools
    const volumeUrl = "https://api.curve.finance/v1/getVolumes/ethereum";
    const volumeResponse = await axios.get(volumeUrl);
    
    let totalVolume = 0;
    if (volumeResponse.data.success && volumeResponse.data.data && volumeResponse.data.data.pools) {
      for (const pool of volumeResponse.data.data.pools) {
        if (relevantPoolAddresses.includes(pool.address.toLowerCase())) {
          totalVolume += Number(pool.volumeUSD || 0);
          console.log(`Curve Pool address: ${pool.address}, Volume: ${pool.volumeUSD}`);
        }
      }
    }
    
    return totalVolume;
  } catch (error) {
    console.error(`Error fetching Curve volume for ${tokenAddress}:`, error.message);
    return 0;
  }
}

/**
 * Fetch all Curve pools data (useful for caching and efficiency)
 * @returns {Promise<object>} - All pools data from Curve API
 */
export async function fetchAllCurvePools() {
  try {
    const url = "https://api.curve.finance/v1/getPools/all/ethereum";
    const response = await axios.get(url);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching all Curve pools:', error.message);
    return null;
  }
}

/**
 * Fetch all Curve volumes data (useful for caching and efficiency)
 * @returns {Promise<object>} - All volumes data from Curve API
 */
export async function fetchAllCurveVolumes() {
  try {
    const url = "https://api.curve.finance/v1/getVolumes/ethereum";
    const response = await axios.get(url);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching all Curve volumes:', error.message);
    return null;
  }
}

/**
 * More efficient version that uses cached pools data to calculate TVL
 * @param {string} tokenAddress - The token contract address
 * @param {object} poolsData - Pre-fetched pools data
 * @returns {number} - Total Value Locked in USD
 */
export function calculateTVLFromPoolsData(tokenAddress, poolsData) {
  if (!poolsData || !poolsData.poolData) return 0;
  
  let totalTVL = 0;
  
  for (const pool of poolsData.poolData) {
    // Check if this pool contains our token
    let hasToken = false;
    if (pool.coinsAddresses) {
      for (const coinAddress of pool.coinsAddresses) {
        if (coinAddress.toLowerCase() === tokenAddress.toLowerCase()) {
          hasToken = true;
          break;
        }
      }
    }
    
    if (hasToken && pool.coins) {
      // Calculate TVL using pool balances and USD prices
      let poolTVL = 0;
      for (const coin of pool.coins) {
        if (coin.poolBalance && coin.usdPrice) {
          const balance = Number(coin.poolBalance);
          const price = Number(coin.usdPrice);
          const decimals = Number(coin.decimals || 18);
          const coinValue = (balance * price) / Math.pow(10, decimals);
          poolTVL += coinValue;
        }
      }
      
      totalTVL += poolTVL;
    }
  }
  
  return totalTVL;
}

/**
 * More efficient version that uses cached data to calculate volume
 * @param {string} tokenAddress - The token contract address
 * @param {object} poolsData - Pre-fetched pools data
 * @param {object} volumesData - Pre-fetched volumes data
 * @returns {number} - 24h volume in USD
 */
export function calculateVolumeFromCachedData(tokenAddress, poolsData, volumesData) {
  if (!poolsData || !poolsData.poolData || !volumesData || !volumesData.pools) return 0;
  
  // Find relevant pool addresses
  const relevantPoolAddresses = [];
  for (const poolInfo of poolsData.poolData) {
    if (poolInfo.coinsAddresses) {
      for (const coinAddress of poolInfo.coinsAddresses) {
        if (coinAddress.toLowerCase() === tokenAddress.toLowerCase()) {
          relevantPoolAddresses.push(poolInfo.address.toLowerCase());
          break;
        }
      }
    }
  }
  
  // Calculate total volume for relevant pools
  let totalVolume = 0;
  for (const pool of volumesData.pools) {
    if (relevantPoolAddresses.includes(pool.address.toLowerCase())) {
      totalVolume += Number(pool.volumeUSD || 0);
    }
  }
  
  return totalVolume;
} 