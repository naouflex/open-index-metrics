import { kvManager } from '../../lib/kv.js';
import { CoinGeckoFetcher } from '../../lib/fetchers/coingecko-fetcher.js';

const coinGeckoFetcher = new CoinGeckoFetcher();

// Popular coins to pre-cache
const POPULAR_COINS = [
  'bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana',
  'polkadot', 'dogecoin', 'avalanche-2', 'polygon-ecosystem-token',
  'chainlink', 'uniswap', 'litecoin', 'algorand', 'cosmos'
];

export default async function handler(req, res) {
  // Verify this is a cron job request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const results = {
      success: [],
      errors: []
    };

    // Pre-cache popular coin data
    for (const coinId of POPULAR_COINS) {
      try {
        const data = await coinGeckoFetcher.fetchCoinData(coinId);
        const cacheKey = `coingecko:market-data:${coinId}`;
        // Cache for 25 hours to ensure coverage between daily runs
        await kvManager.set(cacheKey, data, 90000);
        results.success.push(coinId);
      } catch (error) {
        console.error(`Failed to cache ${coinId}:`, error);
        results.errors.push({ coinId, error: error.message });
      }
    }

    res.json({
      message: 'Data update completed',
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({ error: 'Failed to update data' });
  }
} 