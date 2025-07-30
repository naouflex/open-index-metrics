# Vercel Deployment Guide

This guide will help you deploy your DeFi dashboard to Vercel with serverless functions and KV storage.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install with `npm i -g vercel`
3. **API Keys**: Gather all your API keys from the original setup

## Step 1: Set Up Vercel KV Storage

1. Go to your Vercel dashboard
2. Navigate to Storage tab
3. Create a new KV database
4. Copy the connection details (will be auto-added to your project)

## Step 2: Environment Variables

Set up these environment variables in your Vercel project dashboard:

### API Keys
```
COINGECKO_API_KEY=your_coingecko_api_key
THE_GRAPH_API_KEY=your_graph_api_key
ETH_RPC_URL=your_ethereum_rpc_url
ETH_RPC_URL_FALLBACK=your_fallback_rpc_url
```

### Subgraph IDs
```
UNISWAP_V3_SUBGRAPH_ID=your_uniswap_v3_subgraph_id
UNISWAP_V2_SUBGRAPH_ID=your_uniswap_v2_subgraph_id
SUSHI_SUBGRAPH_ID=your_sushi_subgraph_id
SUSHI_V2_SUBGRAPH_ID=your_sushi_v2_subgraph_id
CURVE_SUBGRAPH_ID=your_curve_subgraph_id
FRAXSWAP_SUBGRAPH_ID=your_fraxswap_subgraph_id
BALANCER_V2_SUBGRAPH_ID=your_balancer_v2_subgraph_id
```

### Cron Security
```
CRON_SECRET=generate_a_random_secret_string
```

## Step 3: Deploy to Vercel

### Option A: GitHub Integration (Recommended)
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Vercel will auto-deploy on every push

### Option B: Direct Deploy
```bash
# Install dependencies
npm install

# Deploy to Vercel
vercel --prod
```

## Step 4: Configure Cron Jobs

### Hobby Plan (Free) - Daily Updates
The default `vercel.json` is configured for daily updates at midnight (0 0 * * *).

### Pro Plan ($20/month) - Hourly Updates  
If you want hourly data updates, upgrade to Pro and use `vercel.pro.json`:
```bash
# Rename the pro config to use hourly updates
mv vercel.pro.json vercel.json
```

### Testing Cron Jobs
1. In Vercel dashboard, go to Functions tab
2. Verify the cron job is scheduled for `/api/cron/update-data`
3. Test the cron endpoint manually:
```bash
curl -X GET "https://your-app.vercel.app/api/cron/update-data" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Step 5: Test Your Deployment

Test key endpoints:
```bash
# Health check
curl https://your-app.vercel.app/api/health

# CoinGecko market data
curl https://your-app.vercel.app/api/coingecko/market-data/bitcoin
```

## Migration from Docker

### What Changed:
- ✅ **Redis** → **Vercel KV** (Redis-compatible)
- ✅ **Express Server** → **Serverless Functions**
- ✅ **node-cron** → **Vercel Cron**
- ✅ **Docker Compose** → **Vercel Deployment**

### What Stays the Same:
- ✅ React frontend (no changes needed)
- ✅ API endpoints (same URLs and responses)
- ✅ Caching logic (same TTL and keys)
- ✅ External API integrations

## Performance Benefits

- **Auto-scaling**: Functions scale based on demand
- **Global CDN**: Your app is served from edge locations
- **Caching**: Built-in edge caching for API responses
- **Zero maintenance**: No server management needed

## Development Workflow

For local development, you can still use your Docker setup or:

```bash
# Install Vercel CLI
npm i -g vercel

# Start local development with Vercel functions
vercel dev
```

## Monitoring

- View function logs in Vercel dashboard
- Monitor KV usage and performance
- Set up alerts for function errors

## Cost Optimization

### Hobby Plan (Free)
- ✅ Perfect for development and personal projects
- ✅ Daily cron jobs (24-hour data refresh)
- ✅ 100GB bandwidth per month
- ✅ 100K function executions per month
- ❌ Limited to daily cron jobs only

### Pro Plan ($20/month)
- ✅ Ideal for production DeFi dashboards
- ✅ Hourly cron jobs (real-time data refresh)
- ✅ 1TB bandwidth per month  
- ✅ 1M function executions per month
- ✅ Priority support

### KV Storage (Both Plans)
- ✅ First 30GB and 100M requests free per month
- ✅ Redis-compatible commands
- ✅ Global edge distribution

## Troubleshooting

### Common Issues:

1. **Environment Variables**: Make sure all env vars are set in Vercel dashboard
2. **Import Paths**: Use relative imports for lib files
3. **Function Timeout**: Default is 10s, increased to 60s in config
4. **KV Connection**: Verify KV database is properly linked

### Support:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel KV Guide](https://vercel.com/docs/storage/vercel-kv)
- [Serverless Functions](https://vercel.com/docs/functions/serverless-functions) 