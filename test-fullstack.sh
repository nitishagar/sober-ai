#!/bin/bash

echo "=== SoberAI Full-Stack Test ==="
echo

# Test backend health
echo "1. Testing backend (port 3000)..."
BACKEND=$(curl -s http://localhost:3000/health)
if echo "$BACKEND" | grep -q "ok"; then
  echo "✅ Backend healthy"
else
  echo "❌ Backend not responding"
  exit 1
fi
echo

# Test frontend
echo "2. Testing frontend (port 5173)..."
FRONTEND=$(curl -s http://localhost:5173)
if echo "$FRONTEND" | grep -q "SoberAI"; then
  echo "✅ Frontend serving"
else
  echo "❌ Frontend not responding"
  exit 1
fi
echo

# Test authentication
echo "3. Testing authentication API..."
LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@soberai.com","password":"testpassword123"}')

TOKEN=$(echo "$LOGIN" | jq -r .token 2>/dev/null)
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ Authentication working"
  echo "   Token: ${TOKEN:0:50}..."
else
  echo "❌ Authentication failed"
  echo "   Response: $LOGIN"
  exit 1
fi
echo

# Test protected endpoint
echo "4. Testing protected API endpoint..."
STATS=$(curl -s http://localhost:3000/api/reports/stats \
  -H "Authorization: Bearer $TOKEN")

if echo "$STATS" | jq -e '.totalReports' >/dev/null 2>&1; then
  echo "✅ Protected endpoints working"
  echo "   Stats: $(echo "$STATS" | jq -c .)"
else
  echo "❌ Protected endpoints failed"
  exit 1
fi
echo

# Test database
echo "5. Testing database connection..."
USER=$(curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN")

if echo "$USER" | jq -e '.user.email' >/dev/null 2>&1; then
  echo "✅ Database connection working"
  EMAIL=$(echo "$USER" | jq -r .user.email)
  PLAN=$(echo "$USER" | jq -r .user.plan)
  echo "   User: $EMAIL ($PLAN plan)"
else
  echo "❌ Database query failed"
  exit 1
fi
echo

echo "=== All Tests Passed! ✅ ==="
echo
echo "Services running:"
echo "  • Backend API:  http://localhost:3000"
echo "  • Frontend UI:  http://localhost:5173"
echo
echo "Test credentials:"
echo "  • Email:    test@soberai.com"
echo "  • Password: testpassword123"
echo
echo "Next steps:"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Login with test credentials"
echo "  3. Try running an audit"
