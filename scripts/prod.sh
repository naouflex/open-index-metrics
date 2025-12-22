#!/bin/bash

echo "🚀 Starting PRODUCTION environment..."
echo "   - Nginx: No proxy (for Digital Ocean)"
echo "   - Redis: External"
echo "   - API: Handled by DO App Platform"

docker-compose up -d --build

echo ""
echo "✅ Production environment started!"
echo "🌐 Dashboard: http://localhost:3000"
echo ""
echo "📝 Note: In production, API routing is handled by Digital Ocean App Platform" 