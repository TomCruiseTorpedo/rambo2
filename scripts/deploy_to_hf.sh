#!/bin/bash

# Usage: ./scripts/deploy_to_hf.sh <hf_username> <space_name>
# Example: ./scripts/deploy_to_hf.sh myuser tomcruisemissile-rambo2

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <hf_username> <space_name>"
    echo "Example: $0 myuser tomcruisemissile-rambo2"
    exit 1
fi

HF_USER=$1
SPACE_NAME=$2
REPO_URL="https://huggingface.co/spaces/$HF_USER/$SPACE_NAME"
CLONE_DIR="../$SPACE_NAME"

echo "🚀 Starting Deployment to Hugging Face Space: $SPACE_NAME"
echo "---------------------------------------------------"

# 1. Check if directory exists, if not clone it
if [ -d "$CLONE_DIR" ]; then
    echo "✅ Directory $CLONE_DIR exists. Pulling latest changes..."
    cd "$CLONE_DIR"
    git pull
    cd - > /dev/null
else
    echo "📥 Cloning Space from $REPO_URL..."
    git clone "$REPO_URL" "$CLONE_DIR"
    if [ $? -ne 0 ]; then
        echo "❌ Failed to clone. Please make sure:"
        echo "   1. You have created the Space on Hugging Face"
        echo "   2. You have SSH keys or credentials set up"
        exit 1
    fi
fi

# 2. Copy Dockerfile
echo "📦 Copying Dockerfile..."
cp docker/Dockerfile "$CLONE_DIR/Dockerfile"

# 3. Commit and Push
echo "nm Pushing to Hugging Face..."
cd "$CLONE_DIR"
git add Dockerfile
git commit -m "Update Dockerfile for DeepSeek-R1-Distill (Tier 2 Backup)"
git push

if [ $? -eq 0 ]; then
    echo "---------------------------------------------------"
    echo "✅ Deployment Triggered!"
    echo "👀 Monitor build status here: $REPO_URL"
else
    echo "❌ Failed to push. Please check your credentials."
fi
