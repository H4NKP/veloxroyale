# 🚀 VeloxAI Panel - Ubuntu Deployment Guide

Complete step-by-step guide for deploying VeloxAI Panel on Ubuntu Server 20.04/22.04 LTS.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Server Preparation](#server-preparation)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Process Management (PM2)](#process-management-pm2)
- [Nginx Reverse Proxy](#nginx-reverse-proxy)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [System Updates](#system-updates)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Ubuntu Server** 20.04 or 22.04 LTS
- **Root or sudo access**
- **Domain name** (optional but recommended for SSL)
- **Minimum 2GB RAM** (4GB recommended)
- **10GB disk space** minimum

---

## Server Preparation

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Required Dependencies

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Install MySQL Server
sudo apt install -y mysql-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2
```

### 3. Verify Installations

```bash
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
mysql --version   # Should show 8.0.x
nginx -v          # Should show nginx/1.x.x
pm2 --version     # Should show 5.x.x
```

---

## Installation

### 1. Clone Repository

```bash
# Navigate to your preferred directory
cd /var/www

# Clone the repository
sudo git clone https://github.com/yourusername/velox-ai-panel.git
cd velox-ai-panel

# Set proper permissions
sudo chown -R $USER:$USER /var/www/velox-ai-panel
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build for Production

```bash
npm run build
```

---

## Database Setup

### 1. Secure MySQL Installation

```bash
sudo mysql_secure_installation
```

Follow the prompts:
- Set root password: **Yes** (choose a strong password)
- Remove anonymous users: **Yes**
- Disallow root login remotely: **Yes**
- Remove test database: **Yes**
- Reload privilege tables: **Yes**

### 2. Create Database and User

```bash
# Login to MySQL
sudo mysql -u root -p

# Create database
CREATE DATABASE velox_panel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (replace 'your_password' with a strong password)
CREATE USER 'veloxai'@'localhost' IDENTIFIED BY 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON velox_panel.* TO 'veloxai'@'localhost';
FLUSH PRIVILEGES;

# Exit MySQL
EXIT;
```

### 3. Import Database Schema

```bash
# Import the schema
mysql -u veloxai -p velox_panel < schema.sql

# Verify tables were created
mysql -u veloxai -p -e "USE velox_panel; SHOW TABLES;"
```

You should see:
```
+------------------------+
| Tables_in_velox_panel  |
+------------------------+
| reservations           |
| users                  |
+------------------------+
```

---

## Configuration

### 1. Create Environment File

```bash
# Copy the example file
cp .env.example .env

# Edit with your credentials
nano .env
```

### 2. Configure Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=veloxai
DB_PASSWORD=your_password_from_step_2
DB_NAME=velox_panel

# Google Gemini AI API
GEMINI_API_KEY=your_gemini_api_key

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_APP_ID=your_app_id
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_VERIFY_TOKEN=your_verify_token

# Application Settings
NODE_ENV=production
PORT=3000
```

**Important**: See [CONFIGURATION.md](CONFIGURATION.md) for detailed instructions on getting API keys.

### 3. Test Configuration

```bash
# Test database connection
mysql -u veloxai -p velox_panel -e "SELECT 1;"

# Should output:
# +---+
# | 1 |
# +---+
# | 1 |
# +---+
```

---

## Process Management (PM2)

### 1. Start Application with PM2

```bash
# Start the application
pm2 start npm --name "velox-panel" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Copy and run the command that PM2 outputs
```

### 2. PM2 Commands Reference

```bash
# View status
pm2 status

# View logs
pm2 logs velox-panel

# View real-time logs
pm2 logs velox-panel --lines 100

# Restart application
pm2 restart velox-panel

# Stop application
pm2 stop velox-panel

# Monitor resources
pm2 monit
```

### 3. Configure PM2 for Production

```bash
# Create ecosystem file for better management
pm2 ecosystem

# Edit ecosystem.config.js
nano ecosystem.config.js
```

Add this configuration:

```javascript
module.exports = {
  apps: [{
    name: 'velox-panel',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/velox-ai-panel',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

Then start with:

```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## Nginx Reverse Proxy

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/velox-panel
```

Add this configuration (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Increase client body size for file uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WhatsApp webhook endpoint
    location /api/whatsapp/webhook {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Enable Site and Test

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/velox-panel /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### 3. Configure Firewall

```bash
# Allow Nginx through firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable

# Check status
sudo ufw status
```

---

## SSL/HTTPS Setup

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate

```bash
# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

### 3. Verify Auto-Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run

# Certbot will automatically renew certificates before they expire
```

### 4. Updated Nginx Configuration (After SSL)

Certbot automatically updates your Nginx config. Verify it looks like this:

```bash
sudo nano /etc/nginx/sites-available/velox-panel
```

Should include:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # ... rest of configuration
}

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## System Updates

### Automatic Updates via GitHub

The VeloxAI Panel includes a built-in update system:

1. **Via Admin Panel**:
   - Login to Admin Panel
   - Go to **Settings** (Panel Life)
   - Click **"Check for Updates"**
   - If updates available, click **"Start Update"**
   - System will pull from GitHub and restart automatically

2. **Manual Update**:
   ```bash
   cd /var/www/velox-ai-panel
   git pull origin main
   npm install
   npm run build
   pm2 restart velox-panel
   ```

### Update Notifications

The system checks for updates from the configured GitHub repository (set in Admin Panel > Settings).

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs velox-panel --lines 50

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart application
pm2 restart velox-panel
```

### Database Connection Errors

```bash
# Verify MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u veloxai -p velox_panel

# Check .env file
cat .env | grep DB_
```

### Nginx Errors

```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx SSL configuration
sudo nginx -t
```

### WhatsApp Webhook Not Working

```bash
# Check if webhook URL is accessible
curl https://yourdomain.com/api/whatsapp/webhook

# Check application logs
pm2 logs velox-panel | grep webhook

# Verify firewall allows HTTPS
sudo ufw status
```

### High Memory Usage

```bash
# Check PM2 memory usage
pm2 monit

# Restart application
pm2 restart velox-panel

# If persistent, increase server RAM or optimize
```

---

## Maintenance Tasks

### Daily

- Monitor PM2 logs: `pm2 logs velox-panel`
- Check disk space: `df -h`

### Weekly

- Review error logs: `pm2 logs velox-panel --err`
- Check system updates: `sudo apt update && sudo apt list --upgradable`

### Monthly

- Update system packages: `sudo apt update && sudo apt upgrade -y`
- Review database size: `mysql -u veloxai -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema = 'velox_panel';"`
- Rotate logs: `pm2 flush`

---

## Security Checklist

- [ ] Changed default admin password
- [ ] MySQL root password is strong
- [ ] Firewall (UFW) is enabled
- [ ] SSL certificate is active
- [ ] `.env` file has proper permissions (600)
- [ ] Regular backups are configured
- [ ] API keys are rotated regularly
- [ ] Server is updated regularly

---

## Backup Strategy

### Automated Backups

```bash
# Create backup script
sudo nano /usr/local/bin/velox-backup.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/velox-panel"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u veloxai -p'your_password' velox_panel > $BACKUP_DIR/db_$DATE.sql

# Backup .env file
cp /var/www/velox-ai-panel/.env $BACKUP_DIR/env_$DATE.bak

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.bak" -mtime +7 -delete
```

Make executable and schedule:

```bash
sudo chmod +x /usr/local/bin/velox-backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/velox-backup.sh
```

---

## Performance Optimization

### Enable Nginx Caching

Add to Nginx config:

```nginx
# Cache static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Enable Gzip Compression

Add to Nginx config:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

---

## Support

- **Documentation**: [README.md](README.md), [CONFIGURATION.md](CONFIGURATION.md)
- **Issues**: Create an issue on GitHub
- **Community**: [Your community link]

---

**Last Updated**: December 2025  
**Version**: v1.0
