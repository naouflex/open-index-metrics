#!/bin/bash

# DeFi Dashboard Docker Deployment Script
set -e

echo "🚀 Starting DeFi Dashboard Deployment..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating template...${NC}"
    cat > .env << EOF
# CoinGecko Pro API Key
COINGECKO_API_KEY=your_coingecko_pro_api_key_here

# The Graph API Key
THE_GRAPH_API_KEY=your_the_graph_api_key_here

# Subgraph IDs for The Graph
UNISWAP_V3_SUBGRAPH_ID=your_uniswap_v3_subgraph_id
UNISWAP_V2_SUBGRAPH_ID=your_uniswap_v2_subgraph_id
SUSHI_SUBGRAPH_ID=your_sushi_v3_subgraph_id
SUSHI_V2_SUBGRAPH_ID=your_sushi_v2_subgraph_id
CURVE_SUBGRAPH_ID=your_curve_subgraph_id
FRAXSWAP_SUBGRAPH_ID=your_fraxswap_subgraph_id
BALANCER_V2_SUBGRAPH_ID=your_balancer_v2_subgraph_id

# Ethereum RPC URLs
ETH_RPC_URL=https://eth.llamarpc.com
ETH_RPC_URL_FALLBACK=https://rpc.ankr.com/eth
EOF
    echo -e "${YELLOW}📝 Please edit .env file with your API keys before continuing.${NC}"
    echo "Press Enter when ready..."
    read
fi

# Validate required environment variables
source .env
missing_vars=()

if [ "$COINGECKO_API_KEY" = "your_coingecko_pro_api_key_here" ]; then
    missing_vars+=("COINGECKO_API_KEY")
fi

if [ "$THE_GRAPH_API_KEY" = "your_the_graph_api_key_here" ]; then
    missing_vars+=("THE_GRAPH_API_KEY")
fi

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${RED}❌ Please set the following environment variables in .env:${NC}"
    printf '%s\n' "${missing_vars[@]}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables validated${NC}"

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo "🔍 Performing health checks..."

# Check cache service
if curl -s http://localhost:4000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Cache service is healthy${NC}"
else
    echo -e "${RED}❌ Cache service health check failed${NC}"
    echo "Checking logs..."
    docker-compose logs cache-service
    exit 1
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
else
    echo -e "${RED}❌ Redis health check failed${NC}"
    exit 1
fi

# Check main app
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Main application is healthy${NC}"
else
    echo -e "${RED}❌ Main application health check failed${NC}"
    echo "Checking logs..."
    docker-compose logs app
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo ""
echo "📱 Access your dashboard at: http://localhost:3000"
echo "🔧 Cache API health: http://localhost:4000/api/health"
echo ""
echo "📊 Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart: docker-compose restart"
echo ""
echo "📖 Read DOCKER_DEPLOYMENT.md for more details" 