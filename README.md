# Open Dashboard - DeFi Protocol Analytics

![Open Source](https://img.shields.io/badge/Open%20Source-Yes-green) ![License](https://img.shields.io/badge/license-MIT-blue) ![React](https://img.shields.io/badge/React-18.0+-61DAFB) ![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF)

**Open Dashboard** is a fully **open source** DeFi analytics platform that aggregates real-time data from multiple blockchain data sources to provide comprehensive protocol metrics. Teams can easily fork, customize, and deploy their own version with their preferred protocols and metrics.

## 🌟 Why Open Source?

This project is designed to be **completely customizable** and **community-driven**:

- ✅ **Fork-friendly**: Clone and customize for your specific protocols
- ✅ **Protocol agnostic**: Add any ERC-20 protocol with governance tokens
- ✅ **Data source flexible**: Integrate with your preferred APIs
- ✅ **UI customizable**: Modify layouts, colors, and metrics
- ✅ **Self-hostable**: Deploy on your own infrastructure
- ✅ **No vendor lock-in**: Full control over your analytics stack

## 📁 Project Structure

```
open-dashboard/
├── src/
│   ├── config/
│   │   └── protocols.js          # 🔧 MAIN CUSTOMIZATION FILE
│   ├── components/
│   │   ├── DeFiDashboard.jsx     # 🎛️ Main dashboard component
│   │   ├── Header.jsx            # Navigation header
│   │   └── Footer.jsx            # Footer component
│   ├── hooks/                    # Data fetching hooks
│   │   ├── useCoinGecko.js       # CoinGecko API integration
│   │   ├── useDefiLlama.js       # DeFiLlama API integration
│   │   ├── useUniswap.js         # Uniswap subgraph data
│   │   ├── useCurve.js           # Curve protocol data
│   │   ├── useBalancer.js        # Balancer protocol data
│   │   ├── useSushiSwap.js       # SushiSwap protocol data
│   │   ├── useFraxswap.js        # Fraxswap protocol data
│   │   └── useEthereum.js        # Ethereum on-chain data
│   ├── services/
│   │   └── cache-client.js       # Caching and API management
│   └── assets/                   # Static assets
├── cache-service/                # Backend caching service
├── public/                       # Public assets
├── dist/                         # Production build
├── .github/                      # GitHub workflows
├── docker-compose.yml            # Docker setup
├── Dockerfile                    # Container configuration
├── deploy.sh                     # Deployment script
└── package.json                  # Dependencies and scripts
```

## 🔧 Core Customization Files

### 1. `src/config/protocols.js` - Protocol Configuration

This is the **main file you'll customize** to add your protocols:

```javascript
export const protocols = [
  {
    ticker: "YOUR_TOKEN",              // Token symbol (e.g., "UNI", "AAVE")
    name: "Your Protocol Name",        // Full protocol name
    govContractAddress: "0x...",       // Governance token contract address
    coingeckoId: "your-token-id",      // CoinGecko API ID
    defiLlamaSlug: "your-protocol",    // DeFiLlama protocol slug
    blockchain: "ethereum",            // Blockchain network
    mainnetLaunch: "2024-01-01",      // Launch date (YYYY-MM-DD)
    openStatus: "current",             // "current" or "proposed"
    nextEmissions: 1000000,            // Upcoming token emissions
    emissionsCatalyst: "Description"   // Emissions description
  },
  // Add more protocols here...
];
```

### 2. `src/components/DeFiDashboard.jsx` - Dashboard Logic

Customize the dashboard display, metrics, and calculations:

- **Add new columns**: Extend the table with custom metrics
- **Modify calculations**: Change ratio formulas and thresholds
- **Customize styling**: Update colors, layouts, and responsive design
- **Add data sources**: Integrate new APIs or on-chain data

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/open-dashboard.git
cd open-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Adding Your First Protocol

1. **Open** `src/config/protocols.js`
2. **Add your protocol** to the `protocols` array:

```javascript
{
  ticker: "MYTOKEN",
  name: "My DeFi Protocol",
  govContractAddress: "0x1234567890123456789012345678901234567890",
  coingeckoId: "my-token",
  defiLlamaSlug: "my-protocol",
  blockchain: "ethereum",
  mainnetLaunch: "2024-01-01",
  openStatus: "current",
  nextEmissions: 500000,
  emissionsCatalyst: "Liquidity mining rewards"
}
```

3. **Save** and the dashboard will automatically update!

## 📊 Data Sources

The dashboard integrates with multiple APIs to provide comprehensive metrics:

| Data Source | Usage | Configuration |
|------------|-------|---------------|
| **CoinGecko API** | Market data, prices, volumes | `coingeckoId` in protocols.js |
| **DeFiLlama API** | Protocol TVL data | `defiLlamaSlug` in protocols.js |
| **Uniswap Subgraph** | DEX liquidity and volume | `govContractAddress` for token lookups |
| **Curve API** | Curve pool data | Auto-detected by token address |
| **Balancer Subgraph** | Balancer pool metrics | Auto-detected by token address |
| **SushiSwap Subgraph** | Sushi pool data | Auto-detected by token address |
| **Fraxswap API** | Frax DEX data | Auto-detected by token address |

## 🎨 Customization Examples

### Adding a New Metric Column

1. **Extend the protocol data structure** in `protocols.js`:
```javascript
{
  // ... existing fields
  customMetric: 1000000,  // Your new field
}
```

2. **Add the column header** in `DeFiDashboard.jsx`:
```jsx
<SortableHeader 
  column="customMetric" 
  currentSort={sortConfig} 
  onSort={handleSort} 
  dataSource="Custom"
>
  Your Metric
</SortableHeader>
```

3. **Add the data cell** in the `ProtocolRow` component:
```jsx
<Td>
  <Text fontSize="sm">{protocol.customMetric}</Text>
</Td>
```

### Modifying Color Thresholds

Update the `getColorForMetric` function in `DeFiDashboard.jsx`:

```javascript
case 'yourMetric':
  return getColorScale(value, { 
    low: 10,      // Red threshold
    medium: 50,   // Yellow threshold  
    high: 100     // Green threshold
  }, false);      // false = higher is better
```

### Adding Protocol-Specific Logic

Handle special cases for specific protocols:

```javascript
// Special handling for your protocol
if (protocol.ticker === 'MYTOKEN') {
  // Custom calculation logic
  const customValue = (marketCap * specialMultiplier) / totalSupply;
  // Use in your metrics
}
```

## 🐳 Docker Deployment

The Open Dashboard provides separate Docker configurations for development and production environments.

### 🛠️ Development Environment

For local development with external Redis and API proxy:

```bash
# Option 1: Use helper script (recommended)
./scripts/dev.sh

# Option 2: Manual setup
docker-compose -f docker-compose.dev.yml up -d --build
```

**Development Environment Features:**
- Uses `Dockerfile.dev` and `nginx.dev.conf`
- Nginx proxy routes API calls to cache-service
- External Redis connection
- Accessible at: http://localhost:3000
- API Health: http://localhost:3000/api/health

### 🚀 Production Environment

For production deployment (e.g., Digital Ocean App Platform):

```bash
# Option 1: Use helper script (recommended)
./scripts/prod.sh

# Option 2: Manual setup
docker-compose up -d --build
```

**Production Environment Features:**
- Uses `Dockerfile` and `nginx.conf`
- API routing handled by platform (Digital Ocean App Platform)
- External Redis connection
- Optimized for production deployment

### 📋 Environment Variables

Create a `.env` file in the root directory:

```env
# Cache Service Configuration
PORT=4000
REDIS_URL=redis://your-redis-host:6379

# API Keys (secure backend-only)
COINGECKO_API_KEY=your_coingecko_api_key
THE_GRAPH_API_KEY=your_thegraph_api_key

# Ethereum RPC URLs
ETH_RPC_URL=https://mainnet.infura.io/v3/your_key
ETH_RPC_URL_FALLBACK=https://rpc.ankr.com/eth

# The Graph Subgraph IDs
UNISWAP_V3_SUBGRAPH_ID=5zvR82QoaXuFYDNKBfRU5N3q
UNISWAP_V2_SUBGRAPH_ID=ELUcwgpm14LKPLrBRuVvPvNKHQ9HvwmtKgKSH6123456
SUSHI_SUBGRAPH_ID=4bb7e6e1-b60d-4e1e-9f0d-123456789abc
SUSHI_V2_SUBGRAPH_ID=0x4bb7e6e1-b60d-4e1e-9f0d-123456789abc
CURVE_SUBGRAPH_ID=3C5-qE3-wVf-6Pw-dS2-aB8-x9K-mN4
FRAXSWAP_SUBGRAPH_ID=8H2-nF9-sW3-7Qs-eR5-cD6-y1L-mK8
BALANCER_V2_SUBGRAPH_ID=C4ayEZP2yTXRAB8Tf0h8bKaLqr
```

### 🔧 Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Cache Service  │    │  External APIs  │
│   (React/Vite)  │◄──►│   (Node.js)     │◄──►│   (CoinGecko,   │
│   Port: 3000    │    │   Port: 4000    │    │   DeFiLlama,    │
└─────────────────┘    └─────────────────┘    │   The Graph)    │
         │                       │             └─────────────────┘
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │      Redis      │
│   (Proxy/CDN)   │    │     (Cache)     │
└─────────────────┘    └─────────────────┘
```

### 📊 Health Checks

Monitor your deployment:

```bash
# Check application status
curl http://localhost:3000/api/health

# Check Redis connection
curl http://localhost:3000/api/admin/redis-info

# View container logs
docker-compose logs -f app
docker-compose logs -f cache-service
```

### 🔄 Updating Deployment

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart (development)
docker-compose -f docker-compose.dev.yml down
./scripts/dev.sh

# Rebuild and restart (production)
docker-compose down
./scripts/prod.sh
```

## 🔄 Data Flow

```mermaid
graph LR
    A[protocols.js] --> B[DeFiDashboard.jsx]
    B --> C[Custom Hooks]
    C --> D[API Services]
    D --> E[Cache Layer]
    E --> F[External APIs]
    F --> G[Dashboard Display]
```

1. **Configuration** loaded from `protocols.js`
2. **Dashboard component** processes protocol list
3. **Custom hooks** fetch data for each protocol
4. **Cache service** optimizes API calls
5. **External APIs** provide real-time data
6. **UI components** display formatted results

## 🛠️ Advanced Customization

### Custom Data Sources

Add your own data sources by creating new hooks:

```javascript
// src/hooks/useCustomAPI.js
export function useCustomAPI(protocolAddress, options = {}) {
  return useQuery({
    queryKey: ['customAPI', protocolAddress],
    queryFn: () => fetchCustomData(protocolAddress),
    ...options
  });
}
```

### Protocol-Specific Components

Create specialized components for unique protocols:

```javascript
// Handle special protocols
if (protocol.ticker === 'SPECIAL') {
  return <SpecialProtocolRow protocol={protocol} />;
}
```

### Custom Styling

Modify themes in the main app or component files:

```javascript
const customTheme = {
  colors: {
    brand: {
      primary: '#your-color',
      secondary: '#your-color'
    }
  }
};
```

## 📈 Performance Optimization

- **Staggered Loading**: Protocols load incrementally to prevent API rate limits
- **Caching Layer**: Reduces redundant API calls with intelligent caching
- **Lazy Loading**: Components load data only when needed
- **Memoization**: Expensive calculations are cached
- **Virtual Scrolling**: Handles large protocol lists efficiently

## 🤝 Contributing

We welcome contributions! This project thrives on community involvement:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Contribution Ideas
- 📊 **Additional metrics** (governance participation, yield farming)
- 🎨 **UI improvements** (charts, graphs, mobile optimization)
- 🔌 **API integrations** (new data sources, real-time price feeds)
- 🧪 **Testing** (unit tests, integration tests)

## 🆘 Support & Community

- **Issues**: [GitHub Issues](https://github.com/your-username/open-dashboard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/open-dashboard/discussions)
- **Documentation**: This README and inline code comments
- **Examples**: Check the `examples/` directory for common customizations


---
*This project is maintained by the community for the community. Star ⭐ the repo if you find it useful!*

