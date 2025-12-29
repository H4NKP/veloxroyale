#!/bin/bash

# VeloxAI Panel - Ubuntu Deployment Script
# Supports Ubuntu 20.04/22.04 LTS

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== VeloxAI Panel Deployment Installer ===${NC}"

if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (sudo ./scripts/deploy.sh)${NC}"
  exit 1
fi

echo -e "${BLUE}Step 1: Updating System & Installing Dependencies...${NC}"
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs mysql-server nginx git build-essential

echo -e "${BLUE}Step 2: Configuring Database...${NC}"
read -p "Enter a password for the new 'velox_user' database user: " DB_PASS
mysql -e "CREATE DATABASE IF NOT EXISTS velox_panel;"
mysql -e "CREATE USER IF NOT EXISTS 'velox_user'@'localhost' IDENTIFIED BY '$DB_PASS';"
mysql -e "GRANT ALL PRIVILEGES ON velox_panel.* TO 'velox_user'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
echo -e "${GREEN}Database configured successfully.${NC}"

echo -e "${BLUE}Step 3: Setting up Application...${NC}"
# Install dependencies
npm install

# Setup Env
if [ ! -f .env ]; then
    cp .env.example .env
    # Update .env with DB credentials
    sed -i "s/DB_USER=root/DB_USER=velox_user/" .env
    sed -i "s/DB_PASSWORD=/DB_PASSWORD=$DB_PASS/" .env
    echo -e "${GREEN}.env file created and updated.${NC}"
else
    echo -e "${BLUE}.env already exists, skipping creation.${NC}"
fi

# Build
echo -e "${BLUE}Building application (this may take a minute)...${NC}"
npm run build

echo -e "${BLUE}Step 4: Configuring PM2...${NC}"
npm install -g pm2
pm2 stop velox-panel 2>/dev/null || true
pm2 start npm --name "velox-panel" -- start
pm2 save
pm2 startup | tail -n 1 | bash 2>/dev/null || true

echo -e "${BLUE}Step 5: Configuring Nginx...${NC}"
read -p "Enter your domain name (or IP if no domain): " DOMAIN_NAME
cat > /etc/nginx/sites-available/velox <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/velox /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo -e "Access your panel at: http://$DOMAIN_NAME"
echo -e "Database credentials saved in .env"
echo -e "View logs with: pm2 logs velox-panel"
