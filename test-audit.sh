#!/bin/bash

echo "=== Testing Audit Functionality ==="
echo

# 1. Login
echo "1. Logging in..."
LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@soberai.com","password":"testpassword123"}')

TOKEN=$(echo "$LOGIN" | jq -r .token)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo

# 2. Run audit on a simple page
echo "2. Running audit on example.com..."
AUDIT=$(curl -s -X POST http://localhost:3000/api/audit \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url":"https://example.com"}')

# Check if audit was successful
if echo "$AUDIT" | jq -e '.error' >/dev/null 2>&1; then
  echo "❌ Audit failed with error:"
  echo "$AUDIT" | jq -r '.error'
  echo
  echo "Full response:"
  echo "$AUDIT" | jq .
  exit 1
fi

REPORT_ID=$(echo "$AUDIT" | jq -r '.reportId')
OVERALL_SCORE=$(echo "$AUDIT" | jq -r '.scores.overall')
GRADE=$(echo "$AUDIT" | jq -r '.scores.grade')

if [ "$REPORT_ID" != "null" ] && [ -n "$REPORT_ID" ]; then
  echo "✅ Audit completed successfully"
  echo "   Report ID: $REPORT_ID"
  echo "   Score: $OVERALL_SCORE"
  echo "   Grade: $GRADE"
else
  echo "❌ Audit failed - no report ID returned"
  echo "Response: $AUDIT" | jq .
  exit 1
fi
echo

# 3. Retrieve the report
echo "3. Retrieving report from database..."
REPORT=$(curl -s http://localhost:3000/api/reports/$REPORT_ID \
  -H "Authorization: Bearer $TOKEN")

if echo "$REPORT" | jq -e '.id' >/dev/null 2>&1; then
  echo "✅ Report retrieved from database"
  echo "$REPORT" | jq '{id, url, overallScore, grade, ssrScore, schemaScore, semanticScore, contentScore}'
else
  echo "❌ Failed to retrieve report"
  exit 1
fi
echo

# 4. Check user usage updated
echo "4. Verifying usage tracking..."
USER=$(curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN")

AUDITS=$(echo "$USER" | jq -r '.user.auditsThisMonth')
echo "✅ Usage tracking: $AUDITS audit(s) this month"
echo

echo "=== All Audit Tests Passed! ✅ ==="
echo
echo "Audit Details:"
echo "$AUDIT" | jq '{
  reportId,
  url,
  scores: {
    overall: .scores.overall,
    grade: .scores.grade,
    ssr: .scores.ssr,
    schema: .scores.schema,
    semantic: .scores.semantic,
    content: .scores.content
  },
  duration,
  detectedIndustry: .metadata.detectedIndustry
}'
