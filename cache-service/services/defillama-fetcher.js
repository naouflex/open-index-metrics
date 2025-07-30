import axios from 'axios';

export class DefiLlamaFetcher {
  constructor() {
    this.baseUrl = 'https://api.llama.fi';
    this.priceUrl = 'https://coins.llama.fi'; // Separate URL for price endpoints
  }

  async fetchProtocolTVL(protocolSlug) {
    try {
      const url = `${this.baseUrl}/protocol/${protocolSlug}`;
      console.log(`Fetching DeFiLlama TVL for: ${protocolSlug}`);
      
      const response = await axios.get(url);
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

      return {
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
    } catch (error) {
      console.error(`Error fetching DeFiLlama TVL for ${protocolSlug}:`, error.message);
      return {
        protocol: protocolSlug,
        tvl: 0,
        error: 'Failed to fetch data',
        fetched_at: new Date().toISOString()
      };
    }
  }

  async fetchTokenPrice(tokenAddress, chain = 'ethereum') {
    try {
      const url = `${this.priceUrl}/prices/current/${chain}:${tokenAddress.toLowerCase()}`;
      console.log(`Fetching token price for: ${chain}:${tokenAddress} from ${url}`);
      
      const response = await axios.get(url);
      const priceData = response.data;
      
      const tokenKey = `${chain}:${tokenAddress.toLowerCase()}`;
      if (priceData.coins && priceData.coins[tokenKey]) {
        const coinData = priceData.coins[tokenKey];
        return {
          address: tokenAddress,
          chain: chain,
          price: coinData.price,
          symbol: coinData.symbol || '',
          decimals: coinData.decimals || 18,
          timestamp: coinData.timestamp,
          fetched_at: new Date().toISOString()
        };
      }

      return {
        address: tokenAddress,
        chain: chain,
        price: null,
        error: 'Price not found',
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching token price for ${chain}:${tokenAddress}:`, error.message);
      return {
        address: tokenAddress,
        chain: chain,
        price: null,
        error: 'Failed to fetch price',
        fetched_at: new Date().toISOString()
      };
    }
  }



  async fetchProtocolInfo(protocolSlug) {
    try {
      const url = `${this.baseUrl}/protocol/${protocolSlug}`;
      console.log(`Fetching DeFiLlama protocol info for: ${protocolSlug}`);
      
      const response = await axios.get(url);
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
    } catch (error) {
      console.error(`Error fetching DeFiLlama protocol info for ${protocolSlug}:`, error.message);
      return {
        id: protocolSlug,
        error: 'Failed to fetch protocol info',
        fetched_at: new Date().toISOString()
      };
    }
  }

  async fetchAllProtocols() {
    try {
      const url = `${this.baseUrl}/protocols`;
      console.log('Fetching all DeFiLlama protocols');
      
      const response = await axios.get(url);
      
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
    } catch (error) {
      console.error('Error fetching all protocols:', error.message);
      return {
        protocols: [],
        error: 'Failed to fetch protocols',
        fetched_at: new Date().toISOString()
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
      const response = await axios.get(url);
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
      const response = await axios.get(url);
      return response.data.chainTvls || {};
    } catch (error) {
      console.error('Error fetching protocol TVL by chain:', error.message);
      return {};
    }
  }
} 