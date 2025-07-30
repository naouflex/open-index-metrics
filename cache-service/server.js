import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cron from 'node-cron';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from the parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

import { createLogger, format, transports } from 'winston';

// Import data fetchers
import { CoinGeckoFetcher } from './services/coingecko-fetcher.js';
import { DefiLlamaFetcher } from './services/defillama-fetcher.js';
import { TheGraphFetcher } from './services/thegraph-fetcher.js';
import { EthereumFetcher } from './services/ethereum-fetcher.js';
import { CurveFetcher } from './services/curve-fetcher.js';

// Initialize logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: './data/error.log', level: 'error' }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Initialize Redis connection
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => logger.error('Redis Client Error', err));
redis.on('connect', () => logger.info('Connected to Redis'));

// Using Redis as the primary cache - no SQLite needed for this demo

// Initialize data fetchers
const coinGeckoFetcher = new CoinGeckoFetcher();
const defiLlamaFetcher = new DefiLlamaFetcher();
const theGraphFetcher = new TheGraphFetcher();
const ethereumFetcher = new EthereumFetcher();
const curveFetcher = new CurveFetcher();

// Cache utilities - Redis only for simplicity
class CacheManager {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async get(key) {
    try {
      const redisData = await this.redis.get(key);
      if (redisData) {
        logger.info(`Cache hit: ${key}`);
        return JSON.parse(redisData);
      } else {
        logger.info(`Cache miss: ${key}`);
        return null;
      }
    } catch (error) {
      logger.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  async set(key, data, ttlSeconds = 3600) {
    const serialized = JSON.stringify(data);

    try {
      await this.redis.setEx(key, ttlSeconds, serialized);
      logger.info(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      logger.error(`Cache set error for ${key}:`, error);
    }
  }

  async cleanup() {
    // Redis handles expiration automatically
    logger.info(`Cache cleanup not needed - Redis handles TTL automatically`);
    return 0;
  }
}

let cacheManager;

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ================= COINGECKO ENDPOINTS =================
// Mirror src/services/coingecko.js functions

// fetchCoinGeckoMarketData -> /api/coingecko/market-data/:coinId
app.get('/api/coingecko/market-data/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:market-data:${coinId}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await coinGeckoFetcher.fetchCoinData(coinId);
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko market data error:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// Legacy endpoint for direct coin data access
app.get('/api/coingecko/coins/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:coin:${coinId}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await coinGeckoFetcher.fetchCoinData(coinId);
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko API error:', error);
    res.status(500).json({ error: 'Failed to fetch coin data' });
  }
});

// fetchCoinGecko30dVolume -> /api/coingecko/30d-volume/:coinId
app.get('/api/coingecko/30d-volume/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:30d-volume:${coinId}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await coinGeckoFetcher.fetch30dVolume(coinId);
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko 30d volume error:', error);
    res.status(500).json({ error: 'Failed to fetch 30d volume data' });
  }
});

// Add 24h volume endpoint -> /api/coingecko/24h-volume/:coinId
app.get('/api/coingecko/24h-volume/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:24h-volume:${coinId}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await coinGeckoFetcher.fetch24hVolume(coinId);
      await cacheManager.set(cacheKey, data, 1800); // 30 minutes for 24h volume
    }
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko 24h volume error:', error);
    res.status(500).json({ error: 'Failed to fetch 24h volume data' });
  }
});

// Add separate market cap endpoint -> /api/coingecko/market-cap/:coinId  
app.get('/api/coingecko/market-cap/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:market-cap:${coinId}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await coinGeckoFetcher.fetchMarketCap(coinId);
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko market cap error:', error);
    res.status(500).json({ error: 'Failed to fetch market cap data' });
  }
});

// Add separate FDV endpoint -> /api/coingecko/fdv/:coinId
app.get('/api/coingecko/fdv/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:fdv:${coinId}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await coinGeckoFetcher.fetchFDV(coinId);
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko FDV error:', error);
    res.status(500).json({ error: 'Failed to fetch FDV data' });
  }
});

// fetchTopExchanges24h -> /api/coingecko/top-exchanges/:coinId
app.get('/api/coingecko/top-exchanges/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:top-exchanges:${coinId}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await coinGeckoFetcher.fetchTopExchanges(coinId);
      await cacheManager.set(cacheKey, data, 1800); // 30 minutes
    }
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko top exchanges error:', error);
    res.status(500).json({ error: 'Failed to fetch top exchanges data' });
  }
});

// fetchAllMetricsRaw -> /api/coingecko/all-metrics/:coinId
app.get('/api/coingecko/all-metrics/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:all-metrics:${coinId}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await coinGeckoFetcher.fetchAllMetrics(coinId);
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko all metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch all metrics data' });
  }
});

// Market chart and tickers (existing endpoints)
app.get('/api/coingecko/coins/:coinId/market_chart/range', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:chart:${coinId}:${JSON.stringify(req.query)}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await coinGeckoFetcher.fetchMarketChart(coinId, req.query);
      await cacheManager.set(cacheKey, data, 1800); // 30 minutes for chart data
    }
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko market chart error:', error);
    res.status(500).json({ error: 'Failed to fetch market chart data' });
  }
});

app.get('/api/coingecko/coins/:coinId/tickers', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:tickers:${coinId}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await coinGeckoFetcher.fetchTickers(coinId, req.query);
      await cacheManager.set(cacheKey, data, 1800); // 30 minutes for tickers
    }
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko tickers error:', error);
    res.status(500).json({ error: 'Failed to fetch tickers data' });
  }
});

// ================= DEFILLAMA ENDPOINTS =================
// Mirror src/services/defillama.js functions

// fetchDefiLlamaTVLDirect -> /api/defillama/tvl/:protocolSlug
app.get('/api/defillama/tvl/:protocolSlug', async (req, res) => {
  try {
    const { protocolSlug } = req.params;
    const cacheKey = `defillama:tvl:${protocolSlug}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await defiLlamaFetcher.fetchProtocolTVL(protocolSlug);
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('DeFiLlama TVL error:', error);
    res.status(500).json({ error: 'Failed to fetch TVL data' });
  }
});

// Legacy endpoint
app.get('/api/defillama/protocol/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = `defillama:protocol:${slug}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await defiLlamaFetcher.fetchProtocolTVL(slug);
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('DeFiLlama API error:', error);
    res.status(500).json({ error: 'Failed to fetch protocol data' });
  }
});

// getTokenPrice -> /api/defillama/token-price/:tokenAddress
app.get('/api/defillama/token-price/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const chain = req.query.chain || 'ethereum';
    const cacheKey = `defillama:token-price:${chain}:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await defiLlamaFetcher.fetchTokenPrice(tokenAddress, chain);
      await cacheManager.set(cacheKey, data, 300); // 5 minutes for prices
    }
    
    res.json(data);
  } catch (error) {
    logger.error('DeFiLlama token price error:', error);
    res.status(500).json({ error: 'Failed to fetch token price' });
  }
});



// getProtocolInfo -> /api/defillama/protocol-info/:protocolSlug
app.get('/api/defillama/protocol-info/:protocolSlug', async (req, res) => {
  try {
    const { protocolSlug } = req.params;
    const cacheKey = `defillama:protocol-info:${protocolSlug}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await defiLlamaFetcher.fetchProtocolInfo(protocolSlug);
      await cacheManager.set(cacheKey, data, 7200); // 2 hours
    }
    
    res.json(data);
  } catch (error) {
    logger.error('DeFiLlama protocol info error:', error);
    res.status(500).json({ error: 'Failed to fetch protocol info' });
  }
});

// getAllProtocols -> /api/defillama/all-protocols
app.get('/api/defillama/all-protocols', async (req, res) => {
  try {
    const cacheKey = 'defillama:all-protocols';
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await defiLlamaFetcher.fetchAllProtocols();
      await cacheManager.set(cacheKey, data, 1800); // 30 minutes
    }
    
    res.json(data);
  } catch (error) {
    logger.error('DeFiLlama all protocols error:', error);
    res.status(500).json({ error: 'Failed to fetch all protocols' });
  }
});

// getProtocolTVLHistory -> /api/defillama/protocol-tvl-history/:protocolSlug
app.get('/api/defillama/protocol-tvl-history/:protocolSlug', async (req, res) => {
  try {
    const { protocolSlug } = req.params;
    const { startDate, endDate } = req.query;
    const cacheKey = `defillama:tvl-history:${protocolSlug}:${startDate || 'all'}:${endDate || 'all'}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await defiLlamaFetcher.fetchProtocolTVLHistory(protocolSlug, startDate, endDate);
      await cacheManager.set(cacheKey, data, 1800); // 30 minutes for historical data
    }
    
    res.json(data);
  } catch (error) {
    logger.error('DeFiLlama protocol TVL history error:', error);
    res.status(500).json({ error: 'Failed to fetch protocol TVL history' });
  }
});

// getProtocolTVLByChain -> /api/defillama/protocol-tvl-by-chain/:protocolSlug
app.get('/api/defillama/protocol-tvl-by-chain/:protocolSlug', async (req, res) => {
  try {
    const { protocolSlug } = req.params;
    const cacheKey = `defillama:tvl-by-chain:${protocolSlug}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await defiLlamaFetcher.fetchProtocolTVLByChain(protocolSlug);
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('DeFiLlama protocol TVL by chain error:', error);
    res.status(500).json({ error: 'Failed to fetch protocol TVL by chain' });
  }
});

// ================= UNISWAP ENDPOINTS =================
// Mirror src/services/uniswap.js functions

// fetchUniswapTokenTVL -> /api/uniswap/v3/token-tvl/:tokenAddress
app.get('/api/uniswap/v3/token-tvl/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `uniswap:v3:token-tvl:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('uniswap_v3', 'token_tvl', { tokenAddress });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Uniswap V3 token TVL error:', error);
    res.status(500).json({ error: 'Failed to fetch Uniswap V3 token TVL' });
  }
});

// fetchUniswapTokenVolume -> /api/uniswap/v3/token-volume/:tokenAddress
app.get('/api/uniswap/v3/token-volume/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `uniswap:v3:token-volume:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('uniswap_v3', 'token_volume', { tokenAddress });
      await cacheManager.set(cacheKey, data, 1800); // 30 minutes
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Uniswap V3 token volume error:', error);
    res.status(500).json({ error: 'Failed to fetch Uniswap V3 token volume' });
  }
});

// fetchUniswapV2TokenTVL -> /api/uniswap/v2/token-tvl/:tokenAddress
app.get('/api/uniswap/v2/token-tvl/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `uniswap:v2:token-tvl:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('uniswap_v2', 'token_tvl', { tokenAddress });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Uniswap V2 token TVL error:', error);
    res.status(500).json({ error: 'Failed to fetch Uniswap V2 token TVL' });
  }
});

// fetchUniswapV2TokenVolume24h -> /api/uniswap/v2/token-volume/:tokenAddress
app.get('/api/uniswap/v2/token-volume/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `uniswap:v2:token-volume:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('uniswap_v2', 'token_volume', { tokenAddress });
      await cacheManager.set(cacheKey, data, 1800); // 30 minutes
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Uniswap V2 token volume error:', error);
    res.status(500).json({ error: 'Failed to fetch Uniswap V2 token volume' });
  }
});

// getUniswapV2PairsForToken -> /api/uniswap/v2/pairs/:tokenAddress
app.get('/api/uniswap/v2/pairs/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `uniswap:v2:pairs:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('uniswap_v2', 'token_pairs', { tokenAddress, first: 100 });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Uniswap V2 pairs error:', error);
    res.status(500).json({ error: 'Failed to fetch Uniswap V2 pairs' });
  }
});

// getUniswapV3PoolsForToken -> /api/uniswap/v3/pools/:tokenAddress
app.get('/api/uniswap/v3/pools/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `uniswap:v3:pools:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('uniswap_v3', 'token_pairs', { tokenAddress, first: 100 });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Uniswap V3 pools error:', error);
    res.status(500).json({ error: 'Failed to fetch Uniswap V3 pools' });
  }
});

// ================= CURVE ENDPOINTS =================
// Mirror src/services/curve.js functions

// fetchCurveTokenTVL -> /api/curve/token-tvl/:tokenAddress
app.get('/api/curve/token-tvl/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `curve:token-tvl:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await curveFetcher.fetchData('token_tvl', { tokenAddress });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Curve token TVL error:', error);
    res.status(500).json({ error: 'Failed to fetch Curve token TVL' });
  }
});

// fetchCurveTokenVolume -> /api/curve/token-volume/:tokenAddress
app.get('/api/curve/token-volume/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `curve:token-volume:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await curveFetcher.fetchData('token_volume', { tokenAddress });
      await cacheManager.set(cacheKey, data, 1800); // 30 minutes
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Curve token volume error:', error);
    res.status(500).json({ error: 'Failed to fetch Curve token volume' });
  }
});

// fetchAllCurvePools -> /api/curve/all-pools
app.get('/api/curve/all-pools', async (req, res) => {
  try {
    const cacheKey = 'curve:all-pools';
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await curveFetcher.fetchData('all_pools', {});
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Curve all pools error:', error);
    res.status(500).json({ error: 'Failed to fetch all Curve pools' });
  }
});

// ================= FRAXSWAP ENDPOINTS =================
// Mirror src/services/fraxswap.js functions

// fetchFraxswapTokenTVL -> /api/fraxswap/token-tvl/:tokenAddress
app.get('/api/fraxswap/token-tvl/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `fraxswap:token-tvl:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('fraxswap', 'token_tvl', { tokenAddress });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Fraxswap token TVL error:', error);
    res.status(500).json({ error: 'Failed to fetch Fraxswap token TVL' });
  }
});

// fetchFraxswapTokenVolume -> /api/fraxswap/token-volume/:tokenAddress
app.get('/api/fraxswap/token-volume/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `fraxswap:token-volume:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('fraxswap', 'token_volume', { tokenAddress });
      await cacheManager.set(cacheKey, data, 1800); // 30 minutes
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Fraxswap token volume error:', error);
    res.status(500).json({ error: 'Failed to fetch Fraxswap token volume' });
  }
});

// getFraxswapPairsForToken -> /api/fraxswap/pairs/:tokenAddress
app.get('/api/fraxswap/pairs/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `fraxswap:pairs:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('fraxswap', 'token_pairs', { tokenAddress, first: 100 });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Fraxswap pairs error:', error);
    res.status(500).json({ error: 'Failed to fetch Fraxswap pairs' });
  }
});

// ================= SUSHISWAP ENDPOINTS =================
// Mirror src/services/sushiswap.js functions

// fetchSushiTokenTVL -> /api/sushiswap/v3/token-tvl/:tokenAddress
app.get('/api/sushiswap/v3/token-tvl/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `sushiswap:v3:token-tvl:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('sushi_v3', 'token_tvl', { tokenAddress });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('SushiSwap V3 token TVL error:', error);
    res.status(500).json({ error: 'Failed to fetch SushiSwap V3 token TVL' });
  }
});

// fetchSushiV2TokenTVL -> /api/sushiswap/v2/token-tvl/:tokenAddress
app.get('/api/sushiswap/v2/token-tvl/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `sushiswap:v2:token-tvl:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('sushi_v2', 'token_tvl', { tokenAddress });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('SushiSwap V2 token TVL error:', error);
    res.status(500).json({ error: 'Failed to fetch SushiSwap V2 token TVL' });
  }
});

// getSushiV2PairsForToken -> /api/sushiswap/v2/pairs/:tokenAddress
app.get('/api/sushiswap/v2/pairs/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `sushiswap:v2:pairs:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('sushi_v2', 'token_pairs', { tokenAddress, first: 100 });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('SushiSwap V2 pairs error:', error);
    res.status(500).json({ error: 'Failed to fetch SushiSwap V2 pairs' });
  }
});

// fetchSushiTokenVolume -> /api/sushiswap/v3/token-volume/:tokenAddress  
app.get('/api/sushiswap/v3/token-volume/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `sushiswap:v3:volume:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('sushi_v3', 'token_volume', { tokenAddress });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('SushiSwap V3 volume error:', error);
    res.status(500).json({ error: 'Failed to fetch SushiSwap V3 volume' });
  }
});

// fetchSushiV2TokenVolume24h -> /api/sushiswap/v2/token-volume/:tokenAddress
app.get('/api/sushiswap/v2/token-volume/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `sushiswap:v2:volume:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('sushi_v2', 'token_volume', { tokenAddress });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('SushiSwap V2 volume error:', error);
    res.status(500).json({ error: 'Failed to fetch SushiSwap V2 volume' });
  }
});

// ================= BALANCER ENDPOINTS =================
// Mirror src/services/balancer.js functions

// fetchBalancerTokenTVL -> /api/balancer/token-tvl/:tokenAddress
app.get('/api/balancer/token-tvl/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `balancer:token-tvl:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('balancer', 'token_tvl', { tokenAddress });
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Balancer token TVL error:', error);
    res.status(500).json({ error: 'Failed to fetch Balancer token TVL' });
  }
});

// fetchBalancerTokenVolume -> /api/balancer/token-volume/:tokenAddress
app.get('/api/balancer/token-volume/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `balancer:token-volume:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData('balancer', 'token_volume', { tokenAddress });
      await cacheManager.set(cacheKey, data, 1800); // 30 minutes
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Balancer token volume error:', error);
    res.status(500).json({ error: 'Failed to fetch Balancer token volume' });
  }
});

// ================= THE GRAPH GENERIC ENDPOINTS =================
// Legacy generic endpoint
app.get('/api/graph/:protocol/:query', async (req, res) => {
  try {
    const { protocol, query } = req.params;
    const cacheKey = `graph:${protocol}:${query}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await theGraphFetcher.fetchData(protocol, query, req.query);
      await cacheManager.set(cacheKey, data, 3600); // 1 hour
    }
    
    res.json(data);
  } catch (error) {
    logger.error('The Graph API error:', error);
    res.status(500).json({ error: 'Failed to fetch graph data' });
  }
});

// ================= ETHEREUM ENDPOINTS =================
// Mirror src/services/ethereum.js functions

// getTokenBalance -> /api/ethereum/token-balance/:tokenAddress/:holderAddress
app.get('/api/ethereum/token-balance/:tokenAddress/:holderAddress', async (req, res) => {
  try {
    const { tokenAddress, holderAddress } = req.params;
    const cacheKey = `ethereum:token-balance:${tokenAddress}:${holderAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await ethereumFetcher.getTokenBalanceFormatted(tokenAddress, holderAddress);
      await cacheManager.set(cacheKey, data, 60); // 1 minute for balances
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Ethereum token balance error:', error);
    res.status(500).json({ error: 'Failed to fetch token balance' });
  }
});

// getTokenDecimals -> /api/ethereum/token-decimals/:tokenAddress
app.get('/api/ethereum/token-decimals/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `ethereum:token-decimals:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await ethereumFetcher.getTokenDecimalsFormatted(tokenAddress);
      await cacheManager.set(cacheKey, data, 86400); // 24 hours for decimals
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Ethereum token decimals error:', error);
    res.status(500).json({ error: 'Failed to fetch token decimals' });
  }
});

// getTokenName -> /api/ethereum/token-name/:tokenAddress
app.get('/api/ethereum/token-name/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `ethereum:token-name:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await ethereumFetcher.getTokenNameFormatted(tokenAddress);
      await cacheManager.set(cacheKey, data, 86400); // 24 hours for name
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Ethereum token name error:', error);
    res.status(500).json({ error: 'Failed to fetch token name' });
  }
});

// getTokenSymbol -> /api/ethereum/token-symbol/:tokenAddress
app.get('/api/ethereum/token-symbol/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `ethereum:token-symbol:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await ethereumFetcher.getTokenSymbolFormatted(tokenAddress);
      await cacheManager.set(cacheKey, data, 86400); // 24 hours for symbol
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Ethereum token symbol error:', error);
    res.status(500).json({ error: 'Failed to fetch token symbol' });
  }
});

// getTotalSupply -> /api/ethereum/total-supply/:tokenAddress
app.get('/api/ethereum/total-supply/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `ethereum:total-supply:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await ethereumFetcher.getTotalSupplyFormatted(tokenAddress);
      await cacheManager.set(cacheKey, data, 600); // 10 minutes for total supply
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Ethereum total supply error:', error);
    res.status(500).json({ error: 'Failed to fetch total supply' });
  }
});

// getCurrentBlock -> /api/ethereum/current-block
app.get('/api/ethereum/current-block', async (req, res) => {
  try {
    const cacheKey = 'ethereum:current-block';
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await ethereumFetcher.getCurrentBlock();
      await cacheManager.set(cacheKey, data, 15); // 15 seconds for current block
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Ethereum current block error:', error);
    res.status(500).json({ error: 'Failed to fetch current block' });
  }
});

// getGasPrice -> /api/ethereum/gas-price
app.get('/api/ethereum/gas-price', async (req, res) => {
  try {
    const cacheKey = 'ethereum:gas-price';
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await ethereumFetcher.getGasPrice();
      await cacheManager.set(cacheKey, data, 30); // 30 seconds for gas price
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Ethereum gas price error:', error);
    res.status(500).json({ error: 'Failed to fetch gas price' });
  }
});

// getTokenInfo -> /api/ethereum/token-info/:tokenAddress
app.get('/api/ethereum/token-info/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `ethereum:token-info:${tokenAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await ethereumFetcher.getTokenInfo(tokenAddress);
      await cacheManager.set(cacheKey, data, 3600); // 1 hour for token info
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Ethereum token info error:', error);
    res.status(500).json({ error: 'Failed to fetch token info' });
  }
});

// getAllowance -> /api/ethereum/allowance/:tokenAddress/:ownerAddress/:spenderAddress
app.get('/api/ethereum/allowance/:tokenAddress/:ownerAddress/:spenderAddress', async (req, res) => {
  try {
    const { tokenAddress, ownerAddress, spenderAddress } = req.params;
    const cacheKey = `ethereum:allowance:${tokenAddress}:${ownerAddress}:${spenderAddress}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await ethereumFetcher.getAllowanceFormatted(tokenAddress, ownerAddress, spenderAddress);
      await cacheManager.set(cacheKey, data, 300); // 5 minutes for allowance (can change frequently)
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Ethereum allowance error:', error);
    res.status(500).json({ error: 'Failed to fetch allowance' });
  }
});

// Legacy generic endpoint
app.get('/api/ethereum/:method', async (req, res) => {
  try {
    const { method } = req.params;
    const cacheKey = `ethereum:${method}:${JSON.stringify(req.query)}`;
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      data = await ethereumFetcher.fetchData(method, req.query);
      // Different TTL based on method
      const ttl = method === 'currentBlock' ? 15 : 3600; // 15s for blocks, 1h for others
      await cacheManager.set(cacheKey, data, ttl);
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Ethereum RPC error:', error);
    res.status(500).json({ error: 'Failed to fetch ethereum data' });
  }
});

// Batch data refresh function
async function refreshAllData() {
  logger.info('Starting scheduled data refresh...');
  
  try {
    // Refresh common coin data with all metrics
    const popularCoins = ['frax-share', 'ethereum', 'bitcoin', 'frax', 'curve-dao-token'];
    for (const coinId of popularCoins) {
      try {
        // Market data
        const marketData = await coinGeckoFetcher.fetchCoinData(coinId);
        await cacheManager.set(`coingecko:coin:${coinId}`, marketData, 3600);
        await cacheManager.set(`coingecko:market-data:${coinId}`, marketData, 3600);
        
        // Volume data
        const volume24h = await coinGeckoFetcher.fetch24hVolume(coinId);
        await cacheManager.set(`coingecko:24h-volume:${coinId}`, volume24h, 1800);
        
        const volume30d = await coinGeckoFetcher.fetch30dVolume(coinId);
        await cacheManager.set(`coingecko:30d-volume:${coinId}`, volume30d, 3600);
        
        // Market cap and FDV
        const marketCap = await coinGeckoFetcher.fetchMarketCap(coinId);
        await cacheManager.set(`coingecko:market-cap:${coinId}`, marketCap, 3600);
        
        const fdv = await coinGeckoFetcher.fetchFDV(coinId);
        await cacheManager.set(`coingecko:fdv:${coinId}`, fdv, 3600);
        
        logger.info(`Refreshed all CoinGecko metrics for ${coinId}`);
      } catch (error) {
        logger.error(`Failed to refresh CoinGecko data for ${coinId}:`, error);
      }
    }

    // Refresh protocol TVL data
    const popularProtocols = ['curve-dex', 'uniswap', 'fraxswap', 'sushiswap', 'balancer-v2'];
    for (const slug of popularProtocols) {
      try {
        const data = await defiLlamaFetcher.fetchProtocolTVL(slug);
        await cacheManager.set(`defillama:protocol:${slug}`, data, 3600);
        await cacheManager.set(`defillama:tvl:${slug}`, data, 3600);
        
        const protocolInfo = await defiLlamaFetcher.fetchProtocolInfo(slug);
        await cacheManager.set(`defillama:protocol-info:${slug}`, protocolInfo, 7200);
        
        logger.info(`Refreshed DeFiLlama data for ${slug}`);
      } catch (error) {
        logger.error(`Failed to refresh DeFiLlama data for ${slug}:`, error);
      }
    }

    // Refresh DEX data for popular tokens
    const popularTokens = [
      '0x853d955acef822db058eb8505911ed77f175b99e', // FRAX
      '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0', // FXS
      '0xa0b86a33e6e7440e73cdf7c8e8de2b3bb2a9ce40', // FraxShare
    ];
    
    for (const tokenAddress of popularTokens) {
      try {
        // Refresh Uniswap data
        await theGraphFetcher.fetchData('uniswap_v3', 'token_tvl', { tokenAddress });
        await theGraphFetcher.fetchData('uniswap_v2', 'token_tvl', { tokenAddress });
        
        // Refresh Curve data
        await curveFetcher.fetchData('token_tvl', { tokenAddress });
        
        // Refresh Fraxswap data
        await theGraphFetcher.fetchData('fraxswap', 'token_tvl', { tokenAddress });
        
        logger.info(`Refreshed DEX data for token ${tokenAddress}`);
      } catch (error) {
        logger.error(`Failed to refresh DEX data for token ${tokenAddress}:`, error);
      }
    }

    // Clean up expired cache entries
    await cacheManager.cleanup();
    
    logger.info('Scheduled data refresh completed');
  } catch (error) {
    logger.error('Error during data refresh:', error);
  }
}

// Initialize server
async function startServer() {
  try {
    await redis.connect();
    cacheManager = new CacheManager(redis);
    
    // Schedule data refresh every hour
    cron.schedule('0 * * * *', refreshAllData);
    
    // Initial data refresh
    setTimeout(refreshAllData, 5000); // 5 seconds after startup
    
    app.listen(PORT, () => {
      logger.info(`Cache service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redis.quit();
  process.exit(0);
});

startServer(); 