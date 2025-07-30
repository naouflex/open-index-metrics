import axios from 'axios';

export class CurveFetcher {
  constructor() {
    this.baseUrl = 'https://api.curve.finance/v1';
    console.log('CurveFetcher initialized');
  }

  /**
   * Fetch data based on queryType and params
   * @param {string} queryType - Type of query (token_tvl, token_volume, all_pools)
   * @param {object} params - Parameters including tokenAddress
   * @returns {Promise<object>} - Formatted response data
   */
  async fetchData(queryType, params = {}) {
    try {
      console.log(`Fetching Curve ${queryType} data`);
      
      let result;
      switch (queryType) {
        case 'token_tvl':
          result = await this.fetchTokenTVL(params.tokenAddress);
          break;
        case 'token_volume':
          result = await this.fetchTokenVolume(params.tokenAddress);
          break;
        case 'all_pools':
          result = await this.fetchAllPools();
          break;
        default:
          throw new Error(`Unknown query type: ${queryType}`);
      }

      return {
        protocol: 'curve',
        queryType,
        data: result,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching Curve ${queryType} data:`, error.message);
      throw error;
    }
  }

  /**
   * Get Curve TVL for a specific token by finding all pools containing that token
   * @param {string} tokenAddress - The token contract address
   * @returns {Promise<number>} - Total Value Locked in USD across all pools containing the token
   */
  async fetchTokenTVL(tokenAddress) {
    try {
      const url = `${this.baseUrl}/getPools/all/ethereum`;
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
   * Get Curve 24h volume for a specific token across all pools containing that token
   * @param {string} tokenAddress - The token contract address
   * @returns {Promise<number>} - 24h volume in USD
   */
  async fetchTokenVolume(tokenAddress) {
    try {
      // First get all pools to find which ones contain our token
      const poolUrl = `${this.baseUrl}/getPools/all/ethereum`;
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
      const volumeUrl = `${this.baseUrl}/getVolumes/ethereum`;
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
  async fetchAllPools() {
    try {
      const url = `${this.baseUrl}/getPools/all/ethereum`;
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
  async fetchAllVolumes() {
    try {
      const url = `${this.baseUrl}/getVolumes/ethereum`;
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
} 