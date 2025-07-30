import { kvManager } from '../../../lib/kv.js';
import { CoinGeckoFetcher } from '../../../lib/fetchers/coingecko-fetcher.js';

const coinGeckoFetcher = new CoinGeckoFetcher();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { coinId } = req.query;
    
    if (!coinId) {
      return res.status(400).json({ error: 'coinId parameter required' });
    }

    const cacheKey = `coingecko:market-data:${coinId}`;
    
    // Try to get from cache first
    let data = await kvManager.get(cacheKey);
    
    if (!data) {
      // Fetch fresh data if not in cache
      data = await coinGeckoFetcher.fetchCoinData(coinId);
      // Cache for 1 hour
      await kvManager.set(cacheKey, data, 3600);
    }
    
    res.json(data);
  } catch (error) {
    console.error('CoinGecko market data error:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
} 