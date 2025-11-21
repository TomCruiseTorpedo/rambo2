FROM ollama/ollama:latest

# Set environment variables
# Set environment variables
ENV OLLAMA_HOST=0.0.0.0:7860
ENV OLLAMA_MODELS=/app/ollama_models

# Create the directory for models and set permissions
RUN mkdir -p /app/ollama_models && chmod 777 /app/ollama_models

# Copy the start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Create a user to run as (optional, but good practice, though Ollama usually runs as root in container)
# For HF Spaces, we often run as a specific user ID (1000).
# We set the user to 1000 to match HF Spaces default
RUN useradd -m -u 1000 user
USER user

# Expose the port (HF Spaces expects 7860)
EXPOSE 7860

# Entrypoint
ENTRYPOINT ["/start.sh"]
