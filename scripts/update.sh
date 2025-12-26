#!/bin/bash

# VeloxAI Panel Professional Update Script
# Designed for Ubuntu / Debian Servers

echo "--- VELOX AI AUTOMATED UPDATE STARTED ---"
echo "Target: Ubuntu Latest / Production Environment"
date

# 1. Fetch latest code from Git
echo "[1/4] Connecting to GitHub repository..."
git fetch --all
git reset --hard origin/main
if [ $? -eq 0 ]; then
    echo "Success: Codebase synchronized with remote."
else
    echo "Error: Failed to fetch from GitHub. Check internet connection or SSH keys."
    exit 1
fi

# 2. Install/Update Dependencies
echo "[2/4] Verifying node_modules and dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "Success: Dependencies are up to date."
else
    echo "Error: npm install failed."
    exit 1
fi

# 3. Build the Application
echo "[3/4] Running production build (Next.js)..."
npm run build
if [ $? -eq 0 ]; then
    echo "Success: Build optimized for production."
else
    echo "Error: Build failed."
    exit 1
fi

# 4. Restart Services
echo "[4/4] Restarting process manager (PM2)..."
pm2 restart all || pm2 restart velox-ai || echo "Warning: Could not restart PM2 automatically. Please restart manually."

echo "--- UPDATE COMPLETE ---"
