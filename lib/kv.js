import { kv } from '@vercel/kv';

// Utility functions for KV operations
export class KVManager {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  async get(key) {
    try {
      if (this.isProduction) {
        return await kv.get(key);
      } else {
        // For development, you can use Upstash Redis or local Redis
        // This is a fallback implementation
        const { createClient } = await import('redis');
        const client = createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        await client.connect();
        const result = await client.get(key);
        await client.disconnect();
        return result ? JSON.parse(result) : null;
      }
    } catch (error) {
      console.error('KV get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    try {
      if (this.isProduction) {
        return await kv.set(key, value, { ex: ttlSeconds });
      } else {
        // Development fallback
        const { createClient } = await import('redis');
        const client = createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        await client.connect();
        await client.setEx(key, ttlSeconds, JSON.stringify(value));
        await client.disconnect();
      }
    } catch (error) {
      console.error('KV set error:', error);
    }
  }

  async del(key) {
    try {
      if (this.isProduction) {
        return await kv.del(key);
      } else {
        const { createClient } = await import('redis');
        const client = createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        await client.connect();
        const result = await client.del(key);
        await client.disconnect();
        return result;
      }
    } catch (error) {
      console.error('KV del error:', error);
      return 0;
    }
  }
}

export const kvManager = new KVManager(); 