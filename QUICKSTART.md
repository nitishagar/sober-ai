# Quick Start Guide - SoberAI Optimizer

Get up and running in 5 minutes! ⚡

## Prerequisites Check

```bash
# Check Node.js version (need 20+)
node --version

# Check Docker
docker --version

# Check available RAM
# macOS: Activity Monitor → Memory tab (need 8GB+ free)
# Linux: free -h
```

## Installation Steps

### 1. Install Dependencies (1 minute)

```bash
cd /Users/nagarwal/repos/ai-work/sober-ai
npm install
```

Expected output: All packages installed successfully, no errors.

### 2. Start Docker Services (30 seconds)

```bash
npm run docker:up
```

This starts:
- Ollama service (for AI recommendations)
- Node.js application

Wait for: `sober-ollama` and `sober-app` containers to show as "Up"

```bash
# Verify containers are running
docker ps
```

### 3. Download AI Model (2-3 minutes, one-time only)

```bash
npm run ollama:pull
```

This downloads Qwen2.5-7B (~4.5GB). Output shows download progress.

**Verify model is ready:**
```bash
curl http://localhost:11434/api/tags
```

Should show `qwen2.5:7b` in the list.

### 4. Start the Application (5 seconds)

```bash
npm run dev
```

Look for:
```
[INFO] SoberAI Optimizer API server running on port 3000
[INFO] Ollama endpoint: http://ollama:11434
```

### 5. Test It! (30 seconds)

**Option A: Web UI**
- Open http://localhost:3000
- Enter a URL (try: https://vercel.com)
- Click "Run AI Agent Audit"
- See results in 15-20 seconds

**Option B: API Test**
```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://vercel.com"}' | jq
```

Expected: JSON response with scores, audit results, and AI recommendations.

## What to Expect

### Good Sites (Score 85-100):
- https://vercel.com (Next.js, excellent SSR)
- https://stripe.com (strong structured data)

### Sites with Issues (Score <70):
- https://youtube.com (SPA, poor SSR)
- Sites without Schema.org markup

### Typical Audit Results:
```
✅ SSR Readiness: 90/100 (Pass)
✅ Schema Coverage: 75/100 (Pass)
⚠️  Semantic Structure: 65/100 (Warning)
✅ Content Extractability: 82/100 (Pass)

Overall: 78/100 (Grade: C)
```

## Troubleshooting

### "Cannot connect to Ollama"

```bash
# Check Ollama is running
docker ps | grep ollama

# View Ollama logs
docker logs sober-ollama

# Restart if needed
docker restart sober-ollama

# Wait 30 seconds for startup
sleep 30
```

### "Model not found"

```bash
# Re-download model
npm run ollama:pull

# Or manually:
docker exec sober-ollama ollama pull qwen2.5:7b
```

### "Port 3000 already in use"

```bash
# Change port (edit package.json or use env var)
PORT=3001 npm run dev
```

### Tests Failing

```bash
# Install dependencies again
npm install

# Run tests
npm test

# Check specific test
npm test -- scorer.test.js
```

## Next Steps

1. **Read the full README**: `cat README.md`
2. **Explore the config**: `cat src/config/audits.yaml`
3. **Test different sites**: Try e-commerce, SaaS, news sites
4. **Review API docs**: Check `docs/API.md` (when available)
5. **Customize weights**: Edit `src/config/audits.yaml`

## Daily Workflow

```bash
# Morning startup
docker-compose -f docker/docker-compose.yml up -d
npm run dev

# Evening shutdown
docker-compose -f docker/docker-compose.yml down
```

## Development Commands

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format

# View logs
docker logs -f sober-app
docker logs -f sober-ollama
```

## Support

If stuck:
1. Check logs: `docker logs sober-app`
2. Verify services: `docker ps`
3. Check memory: Ensure 8GB+ available
4. Restart everything: `docker-compose down && docker-compose up -d`

## Success Checklist

- [x] Node.js 20+ installed
- [x] Docker running
- [x] Dependencies installed (`npm install`)
- [x] Docker services started
- [x] Qwen2.5-7B model downloaded
- [x] Dev server running
- [x] Web UI accessible at http://localhost:3000
- [x] API responding to curl test
- [x] First audit completed successfully

**You're ready to optimize websites for AI agents! 🚀**
