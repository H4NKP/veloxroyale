#!/bin/bash

# VeloxAI Panel Deployment Script for Ubuntu
# Usage: ./scripts/deploy.sh

set -e

echo "🚀 Starting VeloxAI Panel Deployment..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get install -y curl git build-essential

# 2. Install Node.js (v20) if not present
if ! command -v node &> /dev/null; then
    echo "🟢 Installing Node.js v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js is already installed."
fi

# 3. Install PM2 (Process Manager)
if ! command -v pm2 &> /dev/null; then
    echo "🔄 Installing PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 is already installed."
fi

# 4. Install Project Dependencies
echo "📥 Installing dependencies..."
npm install

# 5. Build Application
echo "🏗️ Building Next.js application..."
npm run build

# 6. Check for .env
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file is missing!"
    echo "📄 Copying .env.example to .env..."
    cp .env.example .env
    echo "❗ PLEASE EDIT .env WITH YOUR REAL CONFIGURATION!"
fi

# 7. Start/Restart with PM2
echo "🚀 Starting application with PM2..."
pm2 start npm --name "velox-panel" -- start
pm2 save

echo "------------------------------------------------"
echo "✅ Deployment Complete!"
echo "🌍 App should be running on port 3000."
echo "📜 To view logs: pm2 logs velox-panel"
echo "------------------------------------------------"
