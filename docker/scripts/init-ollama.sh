#!/bin/bash
set -e

echo "[Ollama] Starting Ollama service..."

# Start ollama in the background
/bin/ollama serve &
OLLAMA_PID=$!

echo "[Ollama] Waiting for Ollama to be ready..."
sleep 5

# Wait for ollama to be responsive
for i in {1..30}; do
  if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "[Ollama] Service is ready"
    break
  fi
  echo "[Ollama] Waiting... ($i/30)"
  sleep 2
done

# Check if model exists
if ! ollama list | grep -q "qwen3:4b"; then
  echo "[Ollama] Model qwen3:4b not found. Downloading (this may take 2-3 minutes)..."
  ollama pull qwen3:4b
  echo "[Ollama] Model downloaded successfully!"
else
  echo "[Ollama] Model qwen3:4b already available"
fi

echo "[Ollama] Ready to serve requests"

# Keep container running
wait $OLLAMA_PID
