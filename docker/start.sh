#!/bin/bash

# Start Ollama in the background
ollama serve &
pid=$!

# Wait for Ollama to start
sleep 5

echo "🔴 Retrieving model..."
ollama pull deepseek-r1-distill-qwen-1.5b
echo "🟢 Model pulled successfully!"

# Wait for the process to finish
wait $pid
