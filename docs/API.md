# SoberAI Optimizer - API Documentation

Version: 0.2.0
Base URL: `http://localhost:3000` (development)

## Table of Contents

1. [Authentication](#authentication)
2. [Audit Endpoints](#audit-endpoints)
3. [User Endpoints](#user-endpoints)
4. [Health & Status](#health--status)
5. [Error Responses](#error-responses)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)

## Authentication

### Register User

**POST** `/api/auth/register`

Creates a new user account.

```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "company": "Acme Inc" // optional
}

// Response (201 Created)
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "plan": "FREE",
    "createdAt": "2025-10-31T..."
  },
  "token": "jwt-token-here"
}

// Errors
// 400: Invalid email or weak password
// 409: Email already exists
```

### Login

**POST** `/api/auth/login`

Authenticates a user and returns JWT token.

```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Response (200 OK)
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "plan": "FREE"
  },
  "token": "jwt-token-here"
}

// Errors
// 401: Invalid credentials
// 403: Account not active
```

### Get Current User

**GET** `/api/auth/me`

Returns current authenticated user information.

```http
Headers:
Authorization: Bearer {token}

// Response (200 OK)
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "plan": "FREE",
  "createdAt": "2025-10-31T..."
}

// Errors
// 401: Invalid or missing token
```

## Audit Endpoints

### Create Audit

**POST** `/api/audit`

Initiates a website audit. Returns immediately with audit ID, then processes asynchronously.

```json
// Headers
Authorization: Bearer {token}

// Request
{
  "url": "https://example.com"
}

// Response (202 Accepted)
{
  "auditId": "uuid",
  "status": "PENDING",
  "url": "https://example.com",
  "createdAt": "2025-10-31T..."
}

// Progress Updates: Use SSE
// GET /api/audit/{auditId}/progress

// Errors
// 400: Invalid URL
// 401: Not authenticated
// 429: Rate limit exceeded
```

### Get Audit Result

**GET** `/api/audit/{auditId}`

Retrieves completed audit results.

```json
// Headers
Authorization: Bearer {token}

// Response (200 OK)
{
  "id": "uuid",
  "url": "https://example.com",
  "status": "COMPLETED",
  "timestamp": "2025-10-31T...",
  "duration": 18543,
  "scores": {
    "overall": 85,
    "grade": "B",
    "categories": {
      "ssrReadiness": {
        "score": 90,
        "weight": 25,
        "severity": "pass"
      },
      "schemaCoverage": {
        "score": 75,
        "weight": 20,
        "severity": "pass"
      },
      "semanticStructure": {
        "score": 88,
        "weight": 20,
        "severity": "pass"
      },
      "contentExtractability": {
        "score": 82,
        "weight": 20,
        "severity": "pass"
      }
    }
  },
  "auditResults": {
    "ssrReadiness": {
      "title": "Server-Side Rendering Readiness",
      "score": 90,
      "description": "Excellent SSR implementation"
    }
  },
  "recommendations": {
    "improvements": [
      "Add Product schema to product pages",
      "Include breadcrumb navigation"
    ],
    "industryContext": "E-commerce site",
    "priority": "HIGH"
  },
  "metadata": {
    "detectedIndustry": "ecommerce",
    "totalSchemas": 5,
    "ssrEnabled": true
  }
}

// Errors
// 404: Audit not found
// 401: Not authorized to view this audit
```

### Stream Audit Progress

**GET** `/api/audit/{auditId}/progress`

Server-Sent Events endpoint for real-time progress updates.

```http
Headers:
Authorization: Bearer {token}

// Response (text/event-stream)
event: progress
data: {"stage": "gathering", "progress": 25, "message": "Collecting SSR data..."}

event: progress
data: {"stage": "auditing", "progress": 50, "message": "Running audits..."}

event: progress
data: {"stage": "analyzing", "progress": 75, "message": "Generating recommendations..."}

event: complete
data: {"status": "COMPLETED", "auditId": "uuid"}

// Events
// - progress: Incremental progress updates
// - complete: Audit finished successfully
// - error: Audit failed with error message
```

### List User Audits

**GET** `/api/audits`

Returns paginated list of user's audit sessions.

```http
Headers:
Authorization: Bearer {token}

// Query Parameters
?page=1&limit=20&status=COMPLETED

// Response (200 OK)
{
  "audits": [
    {
      "id": "uuid",
      "url": "https://example.com",
      "status": "COMPLETED",
      "overallScore": 85,
      "createdAt": "2025-10-31T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

## User Endpoints

### Update User Profile

**PATCH** `/api/user/profile`

Updates user profile information.

```json
// Headers
Authorization: Bearer {token}

// Request
{
  "name": "Jane Doe",
  "company": "New Company Inc"
}

// Response (200 OK)
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Doe",
  "company": "New Company Inc",
  "updatedAt": "2025-10-31T..."
}
```

### Change Password

**POST** `/api/user/password`

Changes user password.

```json
// Headers
Authorization: Bearer {token}

// Request
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}

// Response (200 OK)
{
  "message": "Password updated successfully"
}

// Errors
// 401: Current password incorrect
// 400: New password too weak
```

## Health & Status

### Health Check

**GET** `/api/health`

Returns service health status. No authentication required.

```json
// Response (200 OK)
{
  "status": "ok",
  "timestamp": "2025-10-31T...",
  "version": "0.2.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ollama": "connected"
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // optional
  }
}
```

### Common Error Codes

- **400 BAD_REQUEST**: Invalid request data
- **401 UNAUTHORIZED**: Missing or invalid authentication
- **403 FORBIDDEN**: Insufficient permissions
- **404 NOT_FOUND**: Resource not found
- **409 CONFLICT**: Resource already exists
- **422 VALIDATION_ERROR**: Request validation failed
- **429 RATE_LIMIT**: Too many requests
- **500 INTERNAL_ERROR**: Server error

## Rate Limiting

### Limits

- Authenticated users: 100 requests/hour
- Anonymous users: 10 requests/hour
- Audit creation: 10 audits/hour

### Headers

Response includes rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635724800
```

### Exceeding Limits

```json
// 429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Try again in 45 minutes.",
    "retryAfter": 2700
  }
}
```

## Examples

### Complete Audit Flow (curl)

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# 2. Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  | jq -r '.token')

# 3. Create audit
AUDIT_ID=$(curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url":"https://vercel.com"}' \
  | jq -r '.auditId')

# 4. Get result
curl http://localhost:3000/api/audit/$AUDIT_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Using JavaScript/TypeScript

```javascript
const API_BASE = 'http://localhost:3000';
let authToken = '';

// Login
const login = async () => {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'test123'
    })
  });
  const data = await response.json();
  authToken = data.token;
  return data;
};

// Create audit
const createAudit = async (url) => {
  const response = await fetch(`${API_BASE}/api/audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ url })
  });
  return response.json();
};

// Stream progress
const streamProgress = (auditId) => {
  const eventSource = new EventSource(
    `${API_BASE}/api/audit/${auditId}/progress`,
    { headers: { 'Authorization': `Bearer ${authToken}` } }
  );

  eventSource.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data);
    console.log(`Progress: ${data.progress}% - ${data.message}`);
  });

  eventSource.addEventListener('complete', (e) => {
    console.log('Audit complete!');
    eventSource.close();
  });
};
```

## Version History

- **v0.2.0**: Added authentication, user management, SSE progress
- **v0.1.0**: Initial API with basic audit functionality

## Support

- **GitHub Issues**: https://github.com/nitishagar/sober-ai/issues
- **Documentation**: https://github.com/nitishagar/sober-ai/docs
