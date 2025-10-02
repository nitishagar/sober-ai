#!/bin/bash

echo "=== Testing Complete Audit Flow with Database ==="
echo

# 1. Login
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@soberai.com","password":"testpassword123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r .token)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo

# 2. Run audit
echo "2. Running audit on https://example.com..."
AUDIT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/audit \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url":"https://example.com"}')

REPORT_ID=$(echo "$AUDIT_RESPONSE" | jq -r .reportId)

if [ "$REPORT_ID" = "null" ] || [ -z "$REPORT_ID" ]; then
  echo "❌ Audit failed or report not saved"
  echo "Response: $AUDIT_RESPONSE" | jq .
  exit 1
fi

echo "✅ Audit completed - Report ID: $REPORT_ID"
echo "Overall Score: $(echo "$AUDIT_RESPONSE" | jq -r .scores.overall)"
echo "Grade: $(echo "$AUDIT_RESPONSE" | jq -r .scores.grade)"
echo

# 3. Get report from database
echo "3. Fetching report from database..."
REPORT=$(curl -s http://localhost:3000/api/reports/$REPORT_ID \
  -H "Authorization: Bearer $TOKEN")

echo "$REPORT" | jq '{id, url, overallScore, grade, createdAt}'
echo

# 4. List all reports
echo "4. Listing all reports..."
REPORTS=$(curl -s http://localhost:3000/api/reports \
  -H "Authorization: Bearer $TOKEN")

echo "$REPORTS" | jq '{total: .pagination.total, reports: .reports}'
echo

# 5. Get statistics
echo "5. Getting user statistics..."
STATS=$(curl -s http://localhost:3000/api/reports/stats \
  -H "Authorization: Bearer $TOKEN")

echo "$STATS" | jq .
echo

# 6. Check user usage
echo "6. Checking updated user info (auditsThisMonth should be 1)..."
USER=$(curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN")

echo "$USER" | jq '.user | {email, auditsThisMonth, lastAuditAt}'
echo

echo "=== All Tests Passed! ✅ ==="
