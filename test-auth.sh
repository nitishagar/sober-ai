#!/bin/bash

echo "=== Testing SoberAI Authentication Flow ==="
echo

# 1. Test login
echo "1. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@soberai.com","password":"testpassword123"}')

echo "$LOGIN_RESPONSE" | jq .

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r .token)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed - no token received"
  exit 1
fi

echo "✅ Login successful - Token received"
echo

# 2. Test /api/auth/me endpoint
echo "2. Testing /api/auth/me endpoint..."
ME_RESPONSE=$(curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN")

echo "$ME_RESPONSE" | jq .
echo

# 3. Test protected endpoint (reports stats)
echo "3. Testing protected endpoint /api/reports/stats..."
STATS_RESPONSE=$(curl -s http://localhost:3000/api/reports/stats \
  -H "Authorization: Bearer $TOKEN")

echo "$STATS_RESPONSE" | jq .
echo

# 4. Test without auth (should fail)
echo "4. Testing protected endpoint WITHOUT auth (should fail)..."
NO_AUTH_RESPONSE=$(curl -s http://localhost:3000/api/reports/stats)

echo "$NO_AUTH_RESPONSE" | jq .
echo

if echo "$NO_AUTH_RESPONSE" | grep -q "401"; then
  echo "✅ Unauthorized access correctly blocked"
else
  echo "❌ Unauthorized access was NOT blocked"
fi

echo
echo "=== Authentication Tests Complete ==="
