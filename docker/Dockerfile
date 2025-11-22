FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Download the model (DeepSeek-R1-Distill-Qwen-1.5B-Q6_K_L.gguf)
RUN curl -L -o model.gguf https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q6_K_L.gguf

# Download llama-server binary (b4600)
RUN curl -L -o llama-server https://github.com/ggerganov/llama.cpp/releases/download/b4600/llama-server-b4600-linux-amd64 && \
    chmod +x llama-server

# Expose port 7860 (Hugging Face Spaces default)
EXPOSE 7860

# Run the server
# --host 0.0.0.0: Bind to all interfaces
# --port 7860: Port expected by HF Spaces
# --ctx-size 8192: Context window
# --n-gpu-layers 0: CPU only
CMD ["./llama-server", "--model", "model.gguf", "--host", "0.0.0.0", "--port", "7860", "--ctx-size", "8192", "--n-gpu-layers", "0"]
