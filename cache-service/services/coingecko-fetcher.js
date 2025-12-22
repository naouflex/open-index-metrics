import axios from 'axios';

export class CoinGeckoFetcher {
  constructor() {
    this.apiKey = process.env.COINGECKO_API_KEY;
    this.baseUrl = 'https://pro-api.coingecko.com/api/v3';
    
    if (!this.apiKey) {
      throw new Error('COINGECKO_API_KEY environment variable is required');
    }
  }

  getHeaders() {
    return {
      'x-cg-pro-api-key': this.apiKey,
      'Accept': 'application/json'
    };
  }

  async fetchCoinData(coinId) {
    try {
      const url = `${this.baseUrl}/coins/${coinId}`;
      const params = {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      };

      console.log(`Fetching CoinGecko data for: ${coinId}`);
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params,
        timeout: 8000 // Reduced to 8s to prevent 504 errors
      });

      const data = response.data;
      const marketData = data.market_data;

      if (!marketData) {
        console.error('No market_data in CoinGecko response:', data);
        return this.getEmptyMarketData();
      }

      // Format the response similar to your existing service
      return {
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        market_cap: marketData.market_cap?.usd || null,
        fdv: marketData.fully_diluted_valuation?.usd || null,
        volume_24h: marketData.total_volume?.usd || null,
        price_change_24h: marketData.price_change_24h || null,
        price_change_percentage_24h: marketData.price_change_percentage_24h || null,
        current_price: marketData.current_price?.usd || null,
        max_supply: marketData.max_supply || null,
        total_supply: marketData.total_supply || null,
        circulating_supply: marketData.circulating_supply || null,
        tvl: marketData.total_value_locked?.usd || null, // Add TVL extraction
        ath: marketData.ath?.usd || null,
        ath_change_percentage: marketData.ath_change_percentage?.usd || null,
        atl: marketData.atl?.usd || null,
        atl_change_percentage: marketData.atl_change_percentage?.usd || null,
        last_updated: data.last_updated,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching CoinGecko data for ${coinId}:`, error.message);
      
      // Return empty data structure on error
      return this.getEmptyMarketData();
    }
  }

  async fetchTop100Coins() {
    try {
      const url = `${this.baseUrl}/coins/markets`;
      const params = {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 100,
        page: 1,
        sparkline: false,
        locale: 'en'
      };

      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params,
        timeout: 8000
      });

      return response.data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        current_price: coin.current_price,
        market_cap: coin.market_cap,
        market_cap_rank: coin.market_cap_rank,
        volume_24h: coin.total_volume,
        price_change_percentage_24h: coin.price_change_percentage_24h,
        fetched_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching top 100 coins:', error.message);
      return [];
    }
  }

  async fetchCoinPrices(coinIds) {
    try {
      const url = `${this.baseUrl}/simple/price`;
      const params = {
        ids: coinIds.join(','),
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_24hr_vol: true,
        include_market_cap: true
      };

      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params,
        timeout: 8000
      });

      return Object.keys(response.data).reduce((acc, coinId) => {
        const coinData = response.data[coinId];
        acc[coinId] = {
          price: coinData.usd,
          market_cap: coinData.usd_market_cap,
          volume_24h: coinData.usd_24h_vol,
          price_change_24h: coinData.usd_24h_change,
          fetched_at: new Date().toISOString()
        };
        return acc;
      }, {});
    } catch (error) {
      console.error('Error fetching coin prices:', error.message);
      return {};
    }
  }

  async fetchMarketChart(coinId, queryParams) {
    try {
      const url = `${this.baseUrl}/coins/${coinId}/market_chart/range`;
      
      console.log(`Fetching CoinGecko market chart for: ${coinId}`);
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params: queryParams
      });

      return {
        ...response.data,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching CoinGecko market chart for ${coinId}:`, error.message);
      return {
        prices: [],
        market_caps: [],
        total_volumes: [],
        error: 'Failed to fetch market chart data',
        fetched_at: new Date().toISOString()
      };
    }
  }

  async fetchTickers(coinId, queryParams) {
    try {
      const url = `${this.baseUrl}/coins/${coinId}/tickers`;
      
      console.log(`Fetching CoinGecko tickers for: ${coinId}`);
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params: queryParams
      });

      return {
        ...response.data,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching CoinGecko tickers for ${coinId}:`, error.message);
      return {
        name: coinId,
        tickers: [],
        error: 'Failed to fetch tickers data',
        fetched_at: new Date().toISOString()
      };
    }
  }

  async fetch30dVolume(coinId) {
    try {
      const url = `${this.baseUrl}/coins/${coinId}`;
      const params = {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      };

      console.log(`Fetching CoinGecko 30d volume for: ${coinId}`);
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params,
        timeout: 8000
      });

      const marketData = response.data.market_data;
      return {
        volume_30d: marketData?.total_volume?.usd || null,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching CoinGecko 30d volume for ${coinId}:`, error.message);
      // Return null instead of 0 to indicate unavailable data
      return {
        volume_30d: null,
        error: 'Failed to fetch 30d volume data',
        _unavailable: true,
        fetched_at: new Date().toISOString()
      };
    }
  }

  async fetch24hVolume(coinId) {
    try {
      const url = `${this.baseUrl}/coins/${coinId}`;
      const params = {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      };

      console.log(`Fetching CoinGecko 24h volume for: ${coinId}`);
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params,
        timeout: 8000
      });

      const marketData = response.data.market_data;
      return {
        volume_24h: marketData?.total_volume?.usd || null,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching CoinGecko 24h volume for ${coinId}:`, error.message);
      return {
        volume_24h: null,
        error: 'Failed to fetch 24h volume data',
        _unavailable: true,
        fetched_at: new Date().toISOString()
      };
    }
  }

  async fetchMarketCap(coinId) {
    try {
      const url = `${this.baseUrl}/coins/${coinId}`;
      const params = {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      };

      console.log(`Fetching CoinGecko market cap for: ${coinId}`);
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params,
        timeout: 8000
      });

      const marketData = response.data.market_data;
      return {
        market_cap: marketData?.market_cap?.usd || null,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching CoinGecko market cap for ${coinId}:`, error.message);
      return {
        market_cap: null,
        error: 'Failed to fetch market cap data',
        _unavailable: true,
        fetched_at: new Date().toISOString()
      };
    }
  }

  async fetchFDV(coinId) {
    try {
      const url = `${this.baseUrl}/coins/${coinId}`;
      const params = {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      };

      console.log(`Fetching CoinGecko FDV for: ${coinId}`);
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params,
        timeout: 8000
      });

      const marketData = response.data.market_data;
      return {
        fdv: marketData?.fully_diluted_valuation?.usd || null,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching CoinGecko FDV for ${coinId}:`, error.message);
      return {
        fdv: null,
        error: 'Failed to fetch FDV data',
        _unavailable: true,
        fetched_at: new Date().toISOString()
      };
    }
  }

  async fetchTopExchanges(coinId) {
    try {
      const url = `${this.baseUrl}/coins/${coinId}/tickers`;
      const params = {
        order: 'volume_desc',
        per_page: 10
      };

      console.log(`Fetching CoinGecko top exchanges for: ${coinId}`);
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params,
        timeout: 8000
      });

      // Transform tickers data to extract exchange info with volume
      const exchanges = (response.data.tickers || []).map(ticker => {
        const exchangeName = ticker.market?.name || 'Unknown';
        const volumeUsd = ticker.converted_volume?.usd || 0;

        return {
          name: exchangeName,
          volume_usd: volumeUsd,
          volume_display: this.formatVolume(volumeUsd),
          base: ticker.base,
          target: ticker.target,
          last_price: ticker.last
        };
      });

      return {
        exchanges,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching CoinGecko top exchanges for ${coinId}:`, error.message);
      return {
        exchanges: [],
        error: 'Failed to fetch top exchanges data',
        fetched_at: new Date().toISOString()
      };
    }
  }

  // Helper method to format volume for display
  formatVolume(volume) {
    // Handle null, undefined, or non-numeric values
    if (volume == null || typeof volume !== 'number' || isNaN(volume)) {
      return '0';
    }
    
    // Handle zero or negative values
    if (volume <= 0) {
      return '0';
    }
    
    if (volume >= 1e9) {
      return `${(volume / 1e9).toFixed(2)}B`;
    } else if (volume >= 1e6) {
      return `${(volume / 1e6).toFixed(2)}M`;
    } else if (volume >= 1e3) {
      return `${(volume / 1e3).toFixed(2)}K`;
    } else {
      return volume.toFixed(2);
    }
  }

  async fetchAllMetrics(coinId) {
    try {
      const data = await this.fetchCoinData(coinId);
      
      return {
        market_cap: data.market_cap,
        fdv: data.fdv,
        volume_24h: data.volume_24h,
        volume_30d: await this.fetch30dVolume(coinId),
        tvl: null, // Not available from CoinGecko
        max_supply: data.max_supply,
        total_supply: data.total_supply,
        circulating_supply: data.circulating_supply,
        current_price: data.current_price,
        price_change_24h: data.price_change_24h,
        price_change_percentage_24h: data.price_change_percentage_24h,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching CoinGecko all metrics for ${coinId}:`, error.message);
      return this.getEmptyMarketData();
    }
  }

  getEmptyMarketData() {
    return {
      market_cap: null,
      fdv: null,
      volume_24h: null,
      price_change_24h: null,
      price_change_percentage_24h: null,
      current_price: null,
      max_supply: null,
      total_supply: null,
      circulating_supply: null,
      ath: null,
      ath_change_percentage: null,
      atl: null,
      atl_change_percentage: null,
      error: 'Failed to fetch data',
      fetched_at: new Date().toISOString()
    };
  }
} 