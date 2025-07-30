import axios from 'axios';

export class CoinGeckoFetcher {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.apiKey = process.env.COINGECKO_API_KEY;
  }

  async makeRequest(endpoint, params = {}) {
    try {
      const config = {
        method: 'GET',
        url: `${this.baseURL}${endpoint}`,
        params,
      };

      // Add API key if available
      if (this.apiKey) {
        config.headers = {
          'x-cg-demo-api-key': this.apiKey
        };
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`CoinGecko API error for ${endpoint}:`, error.message);
      throw error;
    }
  }

  async fetchCoinData(coinId) {
    return await this.makeRequest(`/coins/${coinId}`, {
      localization: false,
      tickers: false,
      market_data: true,
      community_data: false,
      developer_data: false,
      sparkline: false
    });
  }

  async fetch30dVolume(coinId) {
    const data = await this.fetchCoinData(coinId);
    return data.market_data?.total_volume?.usd || 0;
  }

  async fetch24hVolume(coinId) {
    const data = await this.fetchCoinData(coinId);
    return data.market_data?.total_volume?.usd || 0;
  }

  async fetchMarketCap(coinId) {
    const data = await this.fetchCoinData(coinId);
    return data.market_data?.market_cap?.usd || 0;
  }

  async fetchFDV(coinId) {
    const data = await this.fetchCoinData(coinId);
    return data.market_data?.fully_diluted_valuation?.usd || 0;
  }
} 