#!/bin/bash
set -e

echo "================================================"
echo "  SoberAI Optimizer - Local Development Setup"
echo "================================================"
echo ""
echo "Starting all services..."
echo "  - PostgreSQL (database)"
echo "  - Redis (queue system)"
echo "  - Ollama (AI model) - First run will download 2.5GB model"
echo "  - Backend API (port 3000)"
echo "  - Frontend UI (port 5173)"
echo ""
echo "This may take 2-3 minutes on first run..."
echo ""

# Start all services
docker-compose -f docker-compose.local.yml up -d

echo ""
echo "✅ Services starting in background..."
echo ""
echo "Monitor logs with:"
echo "  docker-compose -f docker-compose.local.yml logs -f"
echo ""
echo "Check status with:"
echo "  docker-compose -f docker-compose.local.yml ps"
echo ""
echo "Stop all services with:"
echo "  docker-compose -f docker-compose.local.yml down"
echo ""
echo "Once healthy, access:"
echo "  🌐 Frontend: http://localhost:5173"
echo "  🔧 Backend API: http://localhost:3000"
echo "  🤖 Ollama: http://localhost:11434"
echo ""
