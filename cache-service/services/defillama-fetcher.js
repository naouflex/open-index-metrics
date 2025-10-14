import axios from 'axios';
import { RequestQueue, generateCacheKey } from './request-queue.js';

export class DefiLlamaFetcher {
  constructor() {
    // Get API key from environment (check both uppercase and lowercase for compatibility)
    this.apiKey = process.env.DEFILLAMA_API_KEY ;
    
    if (!this.apiKey) {
      console.warn('Warning: DEFILLAMA_API_KEY not found in environment. Using free API endpoints.');
      this.baseUrl = 'https://api.llama.fi';
      this.priceUrl = 'https://coins.llama.fi';
    } else {
      // Use Pro API endpoints with API key
      // Pro API format: https://pro-api.llama.fi/{apiKey}/api/... for protocols
      // Pro API format: https://pro-api.llama.fi/{apiKey}/coins/... for prices
      this.baseUrl = `https://pro-api.llama.fi/${this.apiKey}/api`;
      this.priceUrl = `https://pro-api.llama.fi/${this.apiKey}/coins`;
      console.log('DefiLlamaFetcher initialized with Pro API');
    }
    
    // Initialize request queue with conservative rate limits for DefiLlama
    this.requestQueue = new RequestQueue({
      concurrency: 2, // Max 2 concurrent requests
      requestsPerSecond: 3, // Conservative rate limit (3 requests per second)
      retryAttempts: 3,
      baseDelay: 2000, // Start with 2s delay
      maxDelay: 60000, // Max 1 minute delay
      circuitThreshold: 3, // Open circuit after 3 failures
      circuitTimeout: 120000 // 2 minutes timeout
    });
    
    // Batch processing for token prices
    this.tokenPriceBatch = new Map();
    this.batchProcessTimer = null;
    this.batchDelay = 500; // 500ms delay before processing batch
    
    console.log('DefiLlamaFetcher initialized with rate limiting');
  }

  async fetchProtocolTVL(protocolSlug) {
    const requestKey = generateCacheKey('defillama', 'protocol-tvl', { slug: protocolSlug });
    
    return this.requestQueue.enqueue(requestKey, async () => {
      const url = `${this.baseUrl}/protocol/${protocolSlug}`;
      console.log(`Fetching DeFiLlama TVL for: ${protocolSlug}`);
      
      const response = await axios.get(url, { 
        timeout: 10000, // Increased timeout for better reliability
        headers: {
          'User-Agent': 'OpenDashboard/1.0',
          'Accept': 'application/json'
        }
      });
      
      const tvlData = response.data;
      
      // Get the current TVL from the latest entry in the historical data
      let currentTvl = 0;
      
      if (tvlData.tvl && Array.isArray(tvlData.tvl) && tvlData.tvl.length > 0) {
        // Get the latest TVL entry
        const latestTvl = tvlData.tvl[tvlData.tvl.length - 1];
        currentTvl = latestTvl.totalLiquidityUSD || 0;
      } else if (typeof tvlData.tvl === 'number') {
        // Fallback to the current TVL if available (some protocols return a number directly)
        currentTvl = tvlData.tvl;
      } else if (tvlData.currentChainTvls && tvlData.currentChainTvls.Ethereum) {
        // Final fallback to currentChainTvls if available
        currentTvl = tvlData.currentChainTvls.Ethereum;
      }

      const result = {
        protocol: protocolSlug,
        name: tvlData.name || protocolSlug,
        symbol: tvlData.symbol || '',
        logo: tvlData.logo || '',
        tvl: currentTvl,
        chainTvls: tvlData.currentChainTvls || {},
        change_1h: tvlData.change_1h || null,
        change_1d: tvlData.change_1d || null,
        change_7d: tvlData.change_7d || null,
        mcap: tvlData.mcap || null,
        fetched_at: new Date().toISOString()
      };
      
      console.log(`Successfully fetched TVL for ${protocolSlug}: $${currentTvl.toLocaleString()}`);
      return result;
    }).catch(error => {
      console.error(`Error fetching DeFiLlama TVL for ${protocolSlug}:`, error.message);
      return {
        protocol: protocolSlug,
        tvl: null,
        error: error.message,
        _unavailable: true,
        fetched_at: new Date().toISOString()
      };
    });
  }

  async fetchTokenPrice(tokenAddress, chain = 'ethereum') {
    const requestKey = generateCacheKey('defillama', 'token-price', { 
      address: tokenAddress.toLowerCase(), 
      chain 
    });
    
    return this.requestQueue.enqueue(requestKey, async () => {
      // Construct the coin identifier (chain:address format)
      const coinId = `${chain}:${tokenAddress.toLowerCase()}`;
      // DON'T encode the coin ID - DeFiLlama expects unencoded chain:address format
      const url = `${this.priceUrl}/prices/current/${coinId}`;
      console.log(`Fetching token price for: ${coinId}`);
      console.log(`Full URL: ${url}`); // Debug log to see the exact URL
      
      const response = await axios.get(url, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'OpenDashboard/1.0',
          'Accept': 'application/json'
        }
      });
      
      const priceData = response.data;
      const tokenKey = `${chain}:${tokenAddress.toLowerCase()}`;
      
      if (priceData.coins && priceData.coins[tokenKey]) {
        const coinData = priceData.coins[tokenKey];
        const result = {
          address: tokenAddress,
          chain: chain,
          price: coinData.price,
          symbol: coinData.symbol || '',
          decimals: coinData.decimals || 18,
          timestamp: coinData.timestamp,
          fetched_at: new Date().toISOString()
        };
        
        console.log(`Price fetched for ${tokenKey}: $${coinData.price}`);
        return result;
      }

      return {
        address: tokenAddress,
        chain: chain,
        price: null,
        error: 'Price not found',
        fetched_at: new Date().toISOString()
      };
    }).catch(error => {
      // Enhanced error logging for 503 and rate limit errors
      if (error.response?.status === 503) {
        console.error(`DeFiLlama API unavailable (503) for ${chain}:${tokenAddress}. Consider using Pro API key to avoid rate limits.`);
      } else if (error.response?.status === 429) {
        console.error(`DeFiLlama rate limit exceeded for ${chain}:${tokenAddress}. Pro API key recommended.`);
      } else {
        console.error(`Error fetching token price for ${chain}:${tokenAddress}:`, error.message);
      }
      
      return {
        address: tokenAddress,
        chain: chain,
        price: null,
        error: error.response?.status === 503 ? 'Service temporarily unavailable' : error.message,
        fetched_at: new Date().toISOString()
      };
    });
  }

  /**
   * Batch fetch multiple token prices in a single request (more efficient)
   */
  async fetchMultipleTokenPrices(tokenRequests) {
    if (!Array.isArray(tokenRequests) || tokenRequests.length === 0) {
      return {};
    }

    // Group by chain for batch requests
    const chainGroups = tokenRequests.reduce((groups, { tokenAddress, chain = 'ethereum' }) => {
      if (!groups[chain]) groups[chain] = [];
      groups[chain].push(tokenAddress.toLowerCase());
      return groups;
    }, {});

    const results = {};
    
    // Process each chain group
    for (const [chain, addresses] of Object.entries(chainGroups)) {
      const batchKey = generateCacheKey('defillama', 'batch-prices', { 
        chain, 
        addresses: addresses.sort() 
      });
      
      try {
        const batchResult = await this.requestQueue.enqueue(batchKey, async () => {
          // Create comma-separated list of coin IDs (DON'T encode - DeFiLlama expects raw format)
          const addressString = addresses.map(addr => `${chain}:${addr}`).join(',');
          const url = `${this.priceUrl}/prices/current/${addressString}`;
          
          console.log(`Batch fetching ${addresses.length} token prices for ${chain}`);
          console.log(`Batch URL: ${url}`);
          
          const response = await axios.get(url, { 
            timeout: 15000, // Longer timeout for batch requests
            headers: {
              'User-Agent': 'OpenDashboard/1.0',
              'Accept': 'application/json'
            }
          });
          
          return response.data;
        });

        // Process batch results
        if (batchResult.coins) {
          for (const address of addresses) {
            const tokenKey = `${chain}:${address}`;
            const coinData = batchResult.coins[tokenKey];
            
            if (coinData && coinData.price !== null && coinData.price !== undefined) {
              results[tokenKey] = {
                address: address,
                chain: chain,
                price: coinData.price,
                symbol: coinData.symbol || '',
                decimals: coinData.decimals || 18,
                timestamp: coinData.timestamp,
                fetched_at: new Date().toISOString()
              };
            } else {
              // Price not found in response - mark as unavailable
              results[tokenKey] = {
                address: address,
                chain: chain,
                price: null,
                error: 'Price not found in DefiLlama response',
                _unavailable: true,
                fetched_at: new Date().toISOString()
              };
              console.warn(`DefiLlama: Price not found for ${tokenKey}`);
            }
          }
        } else {
          // No coins object in response
          console.warn(`DefiLlama: No coins object in batch response for ${chain}`);
          for (const address of addresses) {
            const tokenKey = `${chain}:${address}`;
            results[tokenKey] = {
              address: address,
              chain: chain,
              price: null,
              error: 'Invalid response structure',
              _unavailable: true,
              fetched_at: new Date().toISOString()
            };
          }
        }
      } catch (error) {
        console.error(`Error batch fetching prices for ${chain}:`, error.message);
        // Add error results for this chain with _unavailable flag
        for (const address of addresses) {
          const tokenKey = `${chain}:${address}`;
          results[tokenKey] = {
            address: address,
            chain: chain,
            price: null,
            error: error.message,
            _unavailable: true,
            fetched_at: new Date().toISOString()
          };
        }
      }
    }

    return results;
  }



  async fetchProtocolInfo(protocolSlug) {
    const requestKey = generateCacheKey('defillama', 'protocol-info', { slug: protocolSlug });
    
    return this.requestQueue.enqueue(requestKey, async () => {
      const url = `${this.baseUrl}/protocol/${protocolSlug}`;
      console.log(`Fetching DeFiLlama protocol info for: ${protocolSlug}`);
      
      const response = await axios.get(url, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'OpenDashboard/1.0',
          'Accept': 'application/json'
        }
      });
      
      const data = response.data;
      
      return {
        id: data.id,
        name: data.name,
        symbol: data.symbol || '',
        logo: data.logo || '',
        url: data.url || '',
        description: data.description || '',
        category: data.category || '',
        chains: data.chains || [],
        tvl: data.tvl || 0,
        chainTvls: data.currentChainTvls || {},
        change_1h: data.change_1h || null,
        change_1d: data.change_1d || null,
        change_7d: data.change_7d || null,
        mcap: data.mcap || null,
        fetched_at: new Date().toISOString()
      };
    }).catch(error => {
      console.error(`Error fetching DeFiLlama protocol info for ${protocolSlug}:`, error.message);
      return {
        id: protocolSlug,
        error: error.message,
        fetched_at: new Date().toISOString()
      };
    });
  }

  async fetchAllProtocols() {
    const requestKey = generateCacheKey('defillama', 'all-protocols', {});
    
    return this.requestQueue.enqueue(requestKey, async () => {
      const url = `${this.baseUrl}/protocols`;
      console.log('Fetching all DeFiLlama protocols');
      
      const response = await axios.get(url, { 
        timeout: 15000, // Longer timeout for large data set
        headers: {
          'User-Agent': 'OpenDashboard/1.0',
          'Accept': 'application/json'
        }
      });
      
      return {
        protocols: response.data.map(protocol => ({
          id: protocol.id,
          name: protocol.name,
          symbol: protocol.symbol,
          category: protocol.category,
          tvl: protocol.tvl,
          chains: protocol.chains || [],
          change_1h: protocol.change_1h,
          change_1d: protocol.change_1d,
          change_7d: protocol.change_7d
        })),
        fetched_at: new Date().toISOString()
      };
    }).catch(error => {
      console.error('Error fetching all protocols:', error.message);
      return {
        protocols: [],
        error: error.message,
        fetched_at: new Date().toISOString()
      };
    });
  }

  /**
   * Get request queue status for monitoring
   */
  getQueueStatus() {
    return this.requestQueue.getStatus();
  }

  /**
   * Clear pending requests (useful for cleanup)
   */
  clearQueue() {
    this.requestQueue.clear();
  }

  /**
   * Health check method
   */
  async healthCheck() {
    try {
      const status = this.getQueueStatus();
      const isHealthy = status.circuitState === 'CLOSED' && status.failureCount < 3;
      
      return {
        healthy: isHealthy,
        status: status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async fetchProtocolTVLHistory(protocolSlug, startDate = null, endDate = null) {
    try {
      let url = `${this.baseUrl}/protocol/${protocolSlug}`;
      
      // Add date parameters if provided
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('Fetching DeFiLlama protocol TVL history:', url);
      const response = await axios.get(url, { timeout: 8000 });
      return response.data.tvl || response.data.chainTvls || [];
    } catch (error) {
      console.error('Error fetching protocol TVL history:', error.message);
      return [];
    }
  }

  async fetchProtocolTVLByChain(protocolSlug) {
    try {
      const url = `${this.baseUrl}/protocol/${protocolSlug}`;
      console.log('Fetching DeFiLlama protocol TVL by chain:', url);
      const response = await axios.get(url, { timeout: 8000 });
      return response.data.chainTvls || {};
    } catch (error) {
      console.error('Error fetching protocol TVL by chain:', error.message);
      return {};
    }
  }

  async fetchProtocolRevenue(protocolSlug) {
    const requestKey = generateCacheKey('defillama', 'protocol-revenue', { slug: protocolSlug });
    
    return this.requestQueue.enqueue(requestKey, async () => {
      const url = `${this.baseUrl}/summary/fees/${protocolSlug}`;
      console.log(`Fetching DeFiLlama revenue for: ${protocolSlug}`);
      
      const response = await axios.get(url, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'OpenDashboard/1.0',
          'Accept': 'application/json'
        }
      });
      
      const data = response.data;
      
      const result = {
        protocol: protocolSlug,
        name: data.name || protocolSlug,
        total24h: data.total24h || 0,
        total48hto24h: data.total48hto24h || 0,
        total7d: data.total7d || 0,
        totalAllTime: data.totalAllTime || 0,
        change_1d: data.change_1d || 0,
        fetched_at: new Date().toISOString()
      };
      
      console.log(`Revenue fetched for ${protocolSlug}: 24h=$${result.total24h.toLocaleString()}`);
      return result;
    }).catch(error => {
      console.error(`Error fetching DeFiLlama revenue for ${protocolSlug}:`, error.message);
      return {
        protocol: protocolSlug,
        total24h: null,
        total48hto24h: null,
        total7d: null,
        totalAllTime: null,
        change_1d: null,
        error: error.message,
        _unavailable: true,
        fetched_at: new Date().toISOString()
      };
    });
  }
} 