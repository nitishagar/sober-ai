#!/bin/bash
set -e

echo "Stopping all SoberAI Optimizer services..."
docker-compose -f docker-compose.local.yml down

echo ""
echo "✅ All services stopped"
echo ""
echo "To remove volumes (CAUTION: deletes database data):"
echo "  docker-compose -f docker-compose.local.yml down -v"
echo ""
