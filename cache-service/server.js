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
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());

// Add request monitoring middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info(`Incoming request: ${req.method} ${req.url}`, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Monitor response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger[logLevel](`Request completed: ${req.method} ${req.url}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    });
    
    // Log slow requests
    if (duration > 5000) {
      logger.warn(`Slow request detected: ${req.method} ${req.url} took ${duration}ms`);
    }
  });

  next();
});

// Add request timeout middleware to prevent 504 errors
app.use((req, res, next) => {
  // Set timeout to 25 seconds (less than typical gateway timeout of 30s)
  req.setTimeout(25000, () => {
    logger.warn(`Request timeout for ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        error: 'Request timeout',
        message: 'The request took too long to process. Please try again.'
      });
    }
  });
  
  res.setTimeout(25000, () => {
    logger.warn(`Response timeout for ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        error: 'Response timeout',
        message: 'The response took too long to send. Please try again.'
      });
    }
  });
  
  next();
});

app.use(express.json());

// Initialize Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
logger.info(`Attempting to connect to Redis at: ${redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

const redis = createClient({
  url: redisUrl
});

redis.on('error', (err) => logger.error('Redis Client Error', err));
redis.on('connect', () => logger.info('Connected to Redis'));
redis.on('ready', () => logger.info('Redis client ready'));

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
      
      // Also store as stale data with longer TTL for fallback
      const staleKey = `${key}:stale`;
      const staleData = { ...data, _cached_at: new Date().toISOString() };
      await this.redis.setEx(staleKey, ttlSeconds * 4, JSON.stringify(staleData)); // 4x longer TTL
      
      logger.info(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      logger.error(`Cache set error for ${key}:`, error);
    }
  }

  /**
   * Smart caching with different TTLs based on data type
   */
  async setWithSmartTTL(key, data, dataType = 'default') {
    const ttlConfig = {
      'protocol-info': 86400, // 24 hours - protocol info changes infrequently
      'token-price': 300, // 5 minutes - prices change frequently
      'protocol-tvl': 1800, // 30 minutes - TVL changes moderately
      'protocol-revenue': 3600, // 1 hour - revenue changes moderately
      'all-protocols': 43200, // 12 hours - protocol list changes infrequently
      'market-data': 1800, // 30 minutes - market data changes moderately
      'market-data-open-index': 180, // 3 minutes - OPEN Index price needs frequent updates
      'volume-data': 3600, // 1 hour - volume data changes hourly
      'default': 3600 // 1 hour default
    };

    const ttl = ttlConfig[dataType] || ttlConfig.default;
    await this.set(key, data, ttl);
    
    logger.info(`Smart cache set: ${key} (type: ${dataType}, TTL: ${ttl}s)`);
  }

  async cleanup() {
    // Redis handles expiration automatically
    logger.info(`Cache cleanup not needed - Redis handles TTL automatically`);
    return 0;
  }
}

let cacheManager;
let lastRefreshTimestamp = null;

// Simple Circuit Breaker to prevent cascade failures
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold; // Number of failures before opening circuit
    this.timeout = timeout; // Time to wait before trying again
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      } else {
        this.state = 'HALF_OPEN';
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }
}

// Create circuit breakers for external services
const coinGeckoCircuitBreaker = new CircuitBreaker(3, 15000); // Reduced timeout to prevent 504 errors
const defiLlamaCircuitBreaker = new CircuitBreaker(3, 15000); // Reduced timeout to prevent 504 errors
const theGraphCircuitBreaker = new CircuitBreaker(3, 15000); // Reduced timeout to prevent 504 errors
const ethereumCircuitBreaker = new CircuitBreaker(3, 15000); // Reduced timeout to prevent 504 errors

// Universal helper to safely fetch data with circuit breaker and stale fallback
async function safeExternalFetch(cacheKey, fetchFunction, circuitBreaker = theGraphCircuitBreaker, timeoutMs = 8000, dataType = 'default') {
  let data = await cacheManager.get(cacheKey);
  if (data) return data;

  try {
    data = await circuitBreaker.call(async () => {
      const fetchPromise = fetchFunction();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('External API timeout')), timeoutMs)
      );
      return Promise.race([fetchPromise, timeoutPromise]);
    });
    await cacheManager.setWithSmartTTL(cacheKey, data, dataType);
    return data;
  } catch (fetchError) {
    // Log timeout-related errors for monitoring
    if (fetchError.message.includes('timeout') || fetchError.code === 'ECONNABORTED') {
      logger.warn(`Timeout detected for ${cacheKey}: ${fetchError.message}`);
    }
    // Return stale data or default
    const staleKey = `${cacheKey}:stale`;
    const staleData = await cacheManager.get(staleKey);
    if (staleData) {
      logger.info(`Returning stale data for ${cacheKey}`);
      return { ...staleData, _stale: true };
    }
    // No stale data, return safe default
    return { data: 0, _unavailable: true, _error: fetchError.message };
  }
}

// API Routes
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      redis: 'unknown',
      coinGecko: coinGeckoCircuitBreaker.state,
      defiLlama: defiLlamaCircuitBreaker.state,
      theGraph: theGraphCircuitBreaker.state,
      ethereum: ethereumCircuitBreaker.state
    },
    defiLlamaQueue: defiLlamaFetcher.getQueueStatus()
  };

  try {
    // Check Redis connection
    await redis.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
    logger.error('Redis health check failed:', error);
  }

  // Check if any circuit breakers are open
  const openCircuits = Object.values(health.services).filter(status => status === 'OPEN').length;
  if (openCircuits > 0) {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Admin endpoint to get Redis info
app.get('/api/admin/redis-info', async (req, res) => {
  try {
    const info = await redis.info();
    const dbSize = await redis.dbSize();
    res.json({
      success: true,
      redis_url: redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Hide credentials
      db_size: dbSize,
      info: info,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting Redis info:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get Redis info',
      message: error.message 
    });
  }
});

// Admin endpoint to flush Redis cache
app.post('/api/admin/flush-cache', async (req, res) => {
  try {
    await redis.flushAll();
    logger.info('Redis cache flushed successfully');
    res.json({ 
      success: true, 
      message: 'Redis cache flushed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error flushing Redis cache:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to flush cache',
      message: error.message 
    });
  }
});

// Admin endpoint to flush cache via GET (easier to use in browser)
app.get('/api/admin/flush-cache', async (req, res) => {
  try {
    await redis.flushAll();
    logger.info('Redis cache flushed successfully via GET');
    res.json({ 
      success: true, 
      message: 'Redis cache flushed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error flushing Redis cache:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to flush cache',
      message: error.message 
    });
  }
});

// Cache metadata endpoint - provides last refresh time
app.get('/api/cache/last-refresh', async (req, res) => {
  try {
    res.json({
      success: true,
      lastRefresh: lastRefreshTimestamp,
      nextRefresh: lastRefreshTimestamp ? 
        new Date(new Date(lastRefreshTimestamp).getTime() + 60 * 60 * 1000).toISOString() : 
        null,
      refreshInterval: '1 hour',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting cache metadata:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get cache metadata',
      message: error.message 
    });
  }
});

// ================= COINGECKO ENDPOINTS =================
// Mirror src/services/coingecko.js functions

// fetchCoinGeckoMarketData -> /api/coingecko/market-data/:coinId
app.get('/api/coingecko/market-data/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:market-data:${coinId}`;
    
    logger.info(`API Request: GET /api/coingecko/market-data/${coinId}`);
    
    let data = await cacheManager.get(cacheKey);
    if (!data) {
      logger.info(`Cache miss for ${coinId}, fetching fresh data...`);
      
      // Use circuit breaker pattern for external API calls
      try {
        data = await coinGeckoCircuitBreaker.call(async () => {
          const fetchPromise = coinGeckoFetcher.fetchCoinData(coinId);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('External API timeout')), 8000)
          );
          return Promise.race([fetchPromise, timeoutPromise]);
        });
        
        // Use shorter TTL for OPEN Index to ensure frequent updates
        const dataType = coinId === 'open-stablecoin-index' ? 'market-data-open-index' : 'market-data';
        await cacheManager.setWithSmartTTL(cacheKey, data, dataType);
        logger.info(`Fresh data fetched for ${coinId}:`, { price: data?.current_price, market_cap: data?.market_cap });
      } catch (fetchError) {
        logger.error(`Failed to fetch fresh data for ${coinId}:`, fetchError.message);
        
        // Try to return stale cache data if available
        const staleKey = `${cacheKey}:stale`;
        const staleData = await cacheManager.get(staleKey);
        
        if (staleData) {
          logger.info(`Returning stale data for ${coinId} due to fetch failure`);
          res.json({ ...staleData, _stale: true, _cached_at: staleData._cached_at });
          return;
        }
        
        // No stale data available, return error
        res.status(503).json({ 
          error: 'Service temporarily unavailable',
          message: 'Unable to fetch fresh data and no cached data available. Please try again in a few moments.',
          retry_after: coinGeckoCircuitBreaker.state === 'OPEN' ? 30 : 10
        });
        return;
      }
    } else {
      logger.info(`Cache hit for ${coinId}:`, { price: data?.current_price, market_cap: data?.market_cap });
    }
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko market data error:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// Legacy endpoint for direct coin data access
app.get('/api/coingecko/coin/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:coin:${coinId}`;
    
    const data = await safeExternalFetch(
      cacheKey,
      () => coinGeckoFetcher.fetchCoinData(coinId),
      coinGeckoCircuitBreaker,
      10000
    );
    
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
    
    const data = await safeExternalFetch(
      cacheKey,
      () => coinGeckoFetcher.fetch30dVolume(coinId),
      coinGeckoCircuitBreaker
    );
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko 30d volume error:', error);
    res.status(500).json({ error: 'Failed to fetch volume data' });
  }
});

// fetchCoinGecko24hVolume -> /api/coingecko/24h-volume/:coinId
app.get('/api/coingecko/24h-volume/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const cacheKey = `coingecko:24h-volume:${coinId}`;
    
    const data = await safeExternalFetch(
      cacheKey,
      () => coinGeckoFetcher.fetch24hVolume(coinId),
      coinGeckoCircuitBreaker
    );
    
    res.json(data);
  } catch (error) {
    logger.error('CoinGecko 24h volume error:', error);
    res.status(500).json({ error: 'Failed to fetch volume data' });
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
    
    const data = await safeExternalFetch(
      cacheKey,
      () => defiLlamaFetcher.fetchProtocolTVL(protocolSlug),
      defiLlamaCircuitBreaker,
      12000, // Longer timeout for DefiLlama
      'protocol-tvl' // Smart caching type
    );
    
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
    
    const data = await safeExternalFetch(
      cacheKey,
      () => defiLlamaFetcher.fetchProtocolTVL(slug),
      defiLlamaCircuitBreaker,
      12000,
      'protocol-tvl'
    );
    
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
    
    const data = await safeExternalFetch(
      cacheKey,
      () => defiLlamaFetcher.fetchTokenPrice(tokenAddress, chain),
      defiLlamaCircuitBreaker,
      10000,
      'token-price'
    );
    
    res.json(data);
  } catch (error) {
    logger.error('DeFiLlama token price error:', error);
    res.status(500).json({ error: 'Failed to fetch token price' });
  }
});

// NEW: Batch token prices endpoint
app.post('/api/defillama/batch-token-prices', async (req, res) => {
  try {
    const { tokens } = req.body;
    
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: 'Invalid tokens array' });
    }
    
    // Create a cache key based on the token list
    const tokenSignature = tokens.map(t => `${t.chain || 'ethereum'}:${t.tokenAddress}`).sort().join(',');
    const cacheKey = `defillama:batch-prices:${Buffer.from(tokenSignature).toString('base64').slice(0, 32)}`;
    
    const data = await safeExternalFetch(
      cacheKey,
      () => defiLlamaFetcher.fetchMultipleTokenPrices(tokens),
      defiLlamaCircuitBreaker,
      15000,
      'token-price'
    );
    
    res.json(data);
  } catch (error) {
    logger.error('DeFiLlama batch token prices error:', error);
    res.status(500).json({ error: 'Failed to fetch batch token prices' });
  }
});

// Multiple token prices endpoint (simplified interface)
app.post('/api/defillama/multiple-token-prices', async (req, res) => {
  try {
    const { tokenAddresses, chain = 'ethereum' } = req.body;
    
    logger.info(`Batch price request for ${tokenAddresses?.length || 0} tokens`);
    
    if (!Array.isArray(tokenAddresses) || tokenAddresses.length === 0) {
      return res.status(400).json({ error: 'Invalid tokenAddresses array' });
    }
    
    // Create a cache key based on the token list
    const tokenSignature = tokenAddresses.map(addr => `${chain}:${addr.toLowerCase()}`).sort().join(',');
    const cacheKey = `defillama:multiple-prices:${chain}:${Buffer.from(tokenSignature).toString('base64').slice(0, 32)}`;
    
    const data = await safeExternalFetch(
      cacheKey,
      async () => {
        // Convert to the format expected by fetchMultipleTokenPrices
        const tokenRequests = tokenAddresses.map(address => ({
          tokenAddress: address,
          chain: chain
        }));
        logger.info(`Fetching ${tokenRequests.length} token prices from DeFiLlama`);
        return await defiLlamaFetcher.fetchMultipleTokenPrices(tokenRequests);
      },
      defiLlamaCircuitBreaker,
      15000,
      'token-price'
    );
    
    logger.info(`Returning ${Object.keys(data || {}).length} token prices`);
    
    // Return prices in a format the client expects
    res.json({ prices: data });
  } catch (error) {
    logger.error('DeFiLlama multiple token prices error:', error);
    res.status(500).json({ error: 'Failed to fetch multiple token prices', prices: {} });
  }
});



// getProtocolInfo -> /api/defillama/protocol-info/:protocolSlug
app.get('/api/defillama/protocol-info/:protocolSlug', async (req, res) => {
  try {
    const { protocolSlug } = req.params;
    const cacheKey = `defillama:protocol-info:${protocolSlug}`;
    
    const data = await safeExternalFetch(
      cacheKey,
      () => defiLlamaFetcher.fetchProtocolInfo(protocolSlug),
      defiLlamaCircuitBreaker,
      12000,
      'protocol-info'
    );
    
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
    
    const data = await safeExternalFetch(
      cacheKey,
      () => defiLlamaFetcher.fetchAllProtocols(),
      defiLlamaCircuitBreaker,
      20000, // Even longer timeout for large dataset
      'all-protocols'
    );
    
    res.json(data);
  } catch (error) {
    logger.error('DeFiLlama all protocols error:', error);
    res.status(500).json({ error: 'Failed to fetch all protocols' });
  }
});

// NEW: DefiLlama queue status monitoring endpoint
app.get('/api/defillama/queue-status', async (req, res) => {
  try {
    const queueStatus = defiLlamaFetcher.getQueueStatus();
    const healthCheck = await defiLlamaFetcher.healthCheck();
    
    res.json({
      ...queueStatus,
      health: healthCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('DeFiLlama queue status error:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
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

// getProtocolRevenue -> /api/defillama/protocol-revenue/:protocolSlug
app.get('/api/defillama/protocol-revenue/:protocolSlug', async (req, res) => {
  try {
    const { protocolSlug } = req.params;
    const cacheKey = `defillama:revenue:${protocolSlug}`;
    
    const data = await safeExternalFetch(
      cacheKey,
      () => defiLlamaFetcher.fetchProtocolRevenue(protocolSlug),
      defiLlamaCircuitBreaker,
      10000,
      'protocol-revenue'
    );
    
    res.json(data);
  } catch (error) {
    logger.error('DeFiLlama protocol revenue error:', error);
    res.status(500).json({ error: 'Failed to fetch protocol revenue' });
  }
});

// ================= UNISWAP ENDPOINTS =================
// Mirror src/services/uniswap.js functions

// fetchUniswapTokenTVL -> /api/uniswap/v3/token-tvl/:tokenAddress
app.get('/api/uniswap/v3/token-tvl/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const cacheKey = `uniswap:v3:token-tvl:${tokenAddress}`;
    
    const data = await safeExternalFetch(
      cacheKey,
      () => theGraphFetcher.fetchData('uniswap_v3', 'token_tvl', { tokenAddress })
    );
    
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
    
    const data = await safeExternalFetch(
      cacheKey,
      () => curveFetcher.fetchData('token_tvl', { tokenAddress })
    );
    
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
      // Use circuit breaker and quick timeout
      try {
        data = await theGraphCircuitBreaker.call(async () => {
          const fetchPromise = theGraphFetcher.fetchData('fraxswap', 'token_tvl', { tokenAddress });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('External API timeout')), 8000)
          );
          return Promise.race([fetchPromise, timeoutPromise]);
        });
        await cacheManager.set(cacheKey, data, 3600);
      } catch (fetchError) {
        // Return stale data or default
        const staleKey = `${cacheKey}:stale`;
        const staleData = await cacheManager.get(staleKey);
        if (staleData) {
          logger.info(`Returning stale Fraxswap TVL data for ${tokenAddress}`);
          res.json({ ...staleData, _stale: true });
          return;
        }
        // No stale data, return default
        data = { data: 0, _unavailable: true };
      }
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

// Simplified data refresh function aligned with dashboard protocols
async function refreshAllData() {
  logger.info('Starting scheduled data refresh...');
  
  try {
    // Light refresh strategy - only essential data
    const coreProtocols = [
      { coingeckoId: 'open-stablecoin-index', defiLlamaSlug: null }, // OPEN Index - critical for dashboard
      { coingeckoId: 'fxn-token', defiLlamaSlug: 'fx-protocol' },
      { coingeckoId: 'ethena', defiLlamaSlug: 'ethena-usde' },
      { coingeckoId: 'origin-protocol', defiLlamaSlug: 'origin-ether' },
      { coingeckoId: 'reserve-rights-token', defiLlamaSlug: 'reserve-protocol' },
      { coingeckoId: 'curve-dao-token', defiLlamaSlug: 'curve-dex' },
      { coingeckoId: 'sky', defiLlamaSlug: 'sky-lending' },
      { coingeckoId: 'alchemix', defiLlamaSlug: 'alchemix' },
      { coingeckoId: 'syrup', defiLlamaSlug: 'maple' },
      { coingeckoId: 'frax-share', defiLlamaSlug: 'frax' },
      { coingeckoId: 'aave', defiLlamaSlug: 'aave-v3' },
      { coingeckoId: 'inverse-finance', defiLlamaSlug: 'inverse-finance-firm' },
      { coingeckoId: 'liquity', defiLlamaSlug: 'liquity-v2' }
    ];

    // Lightweight refresh - only market data and TVL (most important)
    const refreshPromises = coreProtocols.map(protocol => 
      (async () => {
        try {
          // Only refresh core market data 
          const promises = [coinGeckoFetcher.fetchCoinData(protocol.coingeckoId)];
          
          // Only fetch TVL if defiLlamaSlug is provided (not needed for OPEN Index)
          if (protocol.defiLlamaSlug) {
            promises.push(defiLlamaFetcher.fetchProtocolTVL(protocol.defiLlamaSlug));
          }
          
          const results = await Promise.allSettled(promises);
          const [marketData, tvlData] = results;

          if (marketData.status === 'fulfilled') {
            // Use shorter TTL for OPEN Index
            const dataType = protocol.coingeckoId === 'open-stablecoin-index' ? 'market-data-open-index' : 'market-data';
            await cacheManager.setWithSmartTTL(`coingecko:market-data:${protocol.coingeckoId}`, marketData.value, dataType);
          }
          if (tvlData && tvlData.status === 'fulfilled') {
            await cacheManager.setWithSmartTTL(`defillama:tvl:${protocol.defiLlamaSlug}`, tvlData.value, 'protocol-tvl');
          }
          
          logger.info(`Light refresh: ${protocol.coingeckoId}`);
        } catch (error) {
          logger.error(`Light refresh failed for ${protocol.coingeckoId}:`, error);
        }
      })()
    );

    // Execute all refresh operations in parallel
    await Promise.allSettled(refreshPromises);
    
    // Clean up expired cache entries
    await cacheManager.cleanup();
    
    // Update last refresh timestamp
    lastRefreshTimestamp = new Date().toISOString();
    
    logger.info(`Scheduled data refresh completed at ${lastRefreshTimestamp}`);
  } catch (error) {
    logger.error('Error during data refresh:', error);
  }
}

// Initialize server
async function startServer() {
  try {
    logger.info('Starting cache service...');
    logger.info(`Environment: NODE_ENV=${process.env.NODE_ENV}`);
    logger.info(`Port: ${PORT}`);
    
    // Try to connect to Redis (but don't fail if it's not available)
    try {
      logger.info('Connecting to Redis...');
      await redis.connect();
      logger.info('Redis connection successful');
      cacheManager = new CacheManager(redis);
    } catch (redisError) {
      logger.warn('Redis connection failed - service will run without caching:', redisError.message);
      logger.warn('This may result in slower response times and higher API usage');
      // Set cacheManager to null - endpoints will handle this gracefully
      cacheManager = null;
    }
    
    // Schedule data refresh every hour as requested (only if Redis is available)
    if (cacheManager) {
      cron.schedule('0 * * * *', refreshAllData);
      
      // Initial data refresh
      setTimeout(async () => {
        logger.info('Starting initial data refresh...');
        await refreshAllData();
      }, 5000); // 5 seconds after startup
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Cache service running on port ${PORT} (all interfaces)`);
      logger.info('Service fully initialized and ready to accept requests');
      logger.info(`Redis caching: ${cacheManager ? 'ENABLED' : 'DISABLED'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (redis.isOpen) {
    await redis.quit();
  }
  process.exit(0);
});

startServer(); 