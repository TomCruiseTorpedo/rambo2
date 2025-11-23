FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Download the model (DeepSeek-R1-Distill-Qwen-1.5B-Q6_K_L.gguf)
RUN curl -L -o model.gguf https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q6_K_L.gguf

# Clone llama.cpp and build llama-server (static build)
RUN git clone https://github.com/ggerganov/llama.cpp.git && \
    cd llama.cpp && \
    git checkout b4600 && \
    cmake -B build -DGGML_CUDA=OFF -DGGML_METAL=OFF -DBUILD_SHARED_LIBS=OFF && \
    cmake --build build --config Release --target llama-server && \
    cp build/bin/llama-server /app/llama-server && \
    cd .. && \
    rm -rf llama.cpp

# Expose port 7860 (Hugging Face Spaces default)
EXPOSE 7860

# Run the server
# --host 0.0.0.0: Bind to all interfaces
# --port 7860: Port expected by HF Spaces
# --ctx-size 8192: Context window
# --n-gpu-layers 0: CPU only
CMD ["./llama-server", "--model", "model.gguf", "--host", "0.0.0.0", "--port", "7860", "--ctx-size", "8192", "--n-gpu-layers", "0"]
