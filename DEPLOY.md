# Deploying VeloxAI Panel on Ubuntu

This guide covers the deployment of the VeloxAI Panel on an Ubuntu 20.04/22.04 LTS server seamlessly.

## Prerequisites

- **OS**: Ubuntu 20.04 or 22.04 LTS
- **Root Access**: You need `sudo` privileges.
- **Domain**: A domain name pointing to your server IP (optional but recommended).

## 1. Automated Installation (Recommended)

We provide a script to handle the heavy lifting.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/YourRepo/velox-ai-panel.git
    cd velox-ai-panel
    ```

2.  **Run the deploy script**:
    ```bash
    chmod +x scripts/deploy.sh
    sudo ./scripts/deploy.sh
    ```

    Follow the on-screen prompts to configure your database and admin user.

## 2. Manual Installation

If you prefer to configure everything yourself:

### Step 1: Install Dependencies
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx git
```

### Step 2: Configure Database
```bash
sudo mysql_secure_installation
sudo mysql -u root -p
```
Inside MySQL shell:
```sql
CREATE DATABASE velox_panel;
CREATE USER 'velox_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON velox_panel.* TO 'velox_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
Now, import the database schema using the terminal. Ensure you are in the project root directory:
```bash
sudo mysql -u root -p velox_panel < schema.sql
```

### Step 3: Setup Application
```bash
# Install Node dependencies
npm install

# Build the application
npm run build

# Create Environment File
cp .env.example .env
nano .env
```
Fill in your `.env`:
```env
DB_HOST=localhost
DB_USER=velox_user
DB_PASSWORD=your_secure_password
DB_NAME=velox_panel
NEXT_PUBLIC_APP_URL=http://your-server-ip
```

### Step 4: Run with PM2
```bash
sudo npm install -g pm2
pm2 start npm --name "velox-panel" -- start
pm2 save
pm2 startup
```

### Step 5: Configure Nginx (Reverse Proxy)
Create config: `/etc/nginx/sites-available/velox`
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/velox /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 3. Post-Install Checks
- **Database**: Go to `Admin > System > Database` and verify connection.
- **Status**: Go to `Admin > System > Status` and verify uptime is tracking.
- **AI/WhatsApp**: Ensure your API keys are set in the `.env` file or Admin settings.

## 4. Troubleshooting
- **Logs**: View application logs with `pm2 logs velox-panel`.
- **Database Connection**: Ensure MySQL is running (`systemctl status mysql`).
