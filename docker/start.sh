#!/bin/bash

# Start Ollama in the background
ollama serve &
pid=$!

# Wait for Ollama to start
sleep 5

echo "🔴 Retrieving model..."
ollama pull phi3.5
echo "🟢 Model pulled successfully!"

# Wait for the process to finish
wait $pid
