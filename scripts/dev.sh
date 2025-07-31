#!/bin/bash

echo "🚀 Starting DEVELOPMENT environment..."
echo "   - Nginx: Proxy to cache-service"
echo "   - Redis: External"
echo "   - API: http://localhost:4000"
echo "   - App: http://localhost:3000"

docker-compose -f docker-compose.dev.yml up -d --build

echo ""
echo "✅ Development environment started!"
echo "🌐 Dashboard: http://localhost:3000"
echo "🔧 API Health: http://localhost:3000/api/health"
echo "📊 Redis Info: http://localhost:3000/api/admin/redis-info" 