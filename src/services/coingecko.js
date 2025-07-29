import axios from 'axios';
import { config } from '../config/env.js';

// ================= COINGECKO SERVICE =================

/**
 * Get the appropriate CoinGecko API base URL based on API key availability
 * @returns {string} Base URL for CoinGecko API
 */
function getCoinGeckoBaseUrl() {
  return config.COINGECKO_API_KEY && config.COINGECKO_API_KEY.length > 0
    ? "https://pro-api.coingecko.com/api/v3"
    : "https://api.coingecko.com/api/v3";
}

/**
 * Get headers for CoinGecko API requests
 * @returns {object} Headers object
 */
function getCoinGeckoHeaders() {
  const headers = {};
  if (config.COINGECKO_API_KEY && config.COINGECKO_API_KEY.length > 0) {
    headers["x-cg-pro-api-key"] = config.COINGECKO_API_KEY;
  }
  return headers;
}

/**
 * Format number for display (utility function)
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
}

/**
 * Fetch basic market data for a coin from CoinGecko
 * @param {string} coinId - CoinGecko ID for the coin
 * @returns {Promise<object>} Market data object
 */
export async function fetchCoinGeckoMarketData(coinId) {
  try {
    const baseUrl = getCoinGeckoBaseUrl();
    const url = `${baseUrl}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    
    const response = await axios.get(url, {
      headers: getCoinGeckoHeaders()
    });
    
    const md = response.data.market_data;
    
    return {
      market_cap: md.market_cap ? md.market_cap.usd : null,
      fdv: md.fully_diluted_valuation ? md.fully_diluted_valuation.usd : null,
      volume_24h: md.total_volume ? md.total_volume.usd : null,
      max_supply: md.max_supply,
      total_supply: md.total_supply,
      circulating_supply: md.circulating_supply,
      tvl: md.total_value_locked ? md.total_value_locked.usd : null,
    };
  } catch (error) {
    console.error(`Error fetching CoinGecko market data for ${coinId}:`, error.message);
    return {
      market_cap: null,
      fdv: null,
      volume_24h: null,
      max_supply: null,
      total_supply: null,
      circulating_supply: null,
      tvl: null
    };
  }
}

/**
 * Fetch 30-day average volume for a coin
 * @param {string} coinId - CoinGecko ID for the coin
 * @returns {Promise<number|null>} 30-day average volume
 */
export async function fetchCoinGecko30dVolume(coinId) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const baseUrl = getCoinGeckoBaseUrl();
    const url = `${baseUrl}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${Math.floor(startDate.getTime()/1000)}&to=${Math.floor(endDate.getTime()/1000)}`;
    
    const response = await axios.get(url, {
      headers: getCoinGeckoHeaders()
    });
    
    if (response.data.total_volumes && response.data.total_volumes.length > 0) {
      const total = response.data.total_volumes.reduce((sum, volume) => sum + volume[1], 0);
      return total / response.data.total_volumes.length;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching 30d volume for ${coinId}:`, error.message);
    return null;
  }
}

/**
 * Fetch top 3 exchanges by 24h volume for a coin
 * @param {string} coinId - CoinGecko ID for the coin
 * @returns {Promise<Array>} Array of [exchange, volume] pairs
 */
export async function fetchTopExchanges24h(coinId) {
  try {
    const baseUrl = getCoinGeckoBaseUrl();
    const url = `${baseUrl}/coins/${coinId}/tickers?order=volume_desc`;
    
    const response = await axios.get(url, {
      headers: getCoinGeckoHeaders()
    });
    
    if (!response.data.tickers || response.data.tickers.length === 0) {
      return [["N/A", "N/A"]];
    }
    
    // Aggregate by exchange name
    const exchangeVolumes = {};
    response.data.tickers.forEach(ticker => {
      const exchange = ticker.market && ticker.market.name ? ticker.market.name : "Unknown";
      const volume = Number(ticker.volume) || 0;
      if (!exchangeVolumes[exchange]) exchangeVolumes[exchange] = 0;
      exchangeVolumes[exchange] += volume;
    });
    
    // Convert to array and sort
    const sorted = Object.keys(exchangeVolumes)
      .map(exchange => ({
        exchange,
        volume: exchangeVolumes[exchange]
      }))
      .sort((a, b) => b.volume - a.volume);
    
    // Take top 3
    return sorted.slice(0, 3).map(item => [
      item.exchange,
      formatNumber(item.volume)
    ]);
  } catch (error) {
    console.error(`Error fetching top exchanges for ${coinId}:`, error.message);
    return [["N/A", "N/A"]];
  }
}

/**
 * Fetch all key metrics for a coin (equivalent to GET_ALL_METRICS_RAW)
 * @param {string} coinId - CoinGecko ID for the coin
 * @returns {Promise<Array>} Array of [market_cap, fdv, volume_24h, volume_30d, tvl, max_supply, total_supply, circulating_supply]
 */
export async function fetchAllMetricsRaw(coinId) {
  try {
    const [marketData, volume30d] = await Promise.all([
      fetchCoinGeckoMarketData(coinId),
      fetchCoinGecko30dVolume(coinId)
    ]);
    
    return [
      Number(marketData.market_cap) || 0,
      Number(marketData.fdv) || 0,
      Number(marketData.volume_24h) || 0,
      Number(volume30d) || 0,
      Number(marketData.tvl) || 0,
      Number(marketData.max_supply) || 0,
      Number(marketData.total_supply) || 0,
      Number(marketData.circulating_supply) || 0
    ];
  } catch (error) {
    console.error(`Error fetching all metrics for ${coinId}:`, error.message);
    return [0, 0, 0, 0, 0, 0, 0, 0];
  }
}

// Individual metric extractors
export async function getMarketCapRaw(coinId) {
  const data = await fetchCoinGeckoMarketData(coinId);
  return Number(data.market_cap) || 0;
}

export async function getFdvRaw(coinId) {
  const data = await fetchCoinGeckoMarketData(coinId);
  return Number(data.fdv) || 0;
}

export async function getVolume24hRaw(coinId) {
  const data = await fetchCoinGeckoMarketData(coinId);
  return Number(data.volume_24h) || 0;
}

export async function getVolume30dRaw(coinId) {
  return Number(await fetchCoinGecko30dVolume(coinId)) || 0;
}

export async function getTvlRaw(coinId) {
  const data = await fetchCoinGeckoMarketData(coinId);
  return Number(data.tvl) || 0;
}

export async function getMaxSupplyRaw(coinId) {
  const data = await fetchCoinGeckoMarketData(coinId);
  return Number(data.max_supply) || 0;
}

export async function getTotalSupplyRaw(coinId) {
  const data = await fetchCoinGeckoMarketData(coinId);
  return Number(data.total_supply) || 0;
}

export async function getCircSupplyRaw(coinId) {
  const data = await fetchCoinGeckoMarketData(coinId);
  return Number(data.circulating_supply) || 0;
} 