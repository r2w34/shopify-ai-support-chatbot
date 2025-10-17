#!/bin/bash

# VPS Deployment Script for Shopify AI Support Chatbot
# Target Server: 72.60.99.154

set -e

SERVER_IP="72.60.99.154"
SERVER_USER="root"
SERVER_PASS="Kalilinux@2812"
APP_NAME="shopify-ai-chatbot"
APP_DIR="/var/www/${APP_NAME}"
NODE_VERSION="20"
DOMAIN="twittstock.com"

echo "=========================================="
echo "Deploying Shopify AI Support Chatbot"
echo "=========================================="

# Function to run commands on remote server
run_remote() {
    sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "$@"
}

# Function to copy files to remote server
copy_to_remote() {
    sshpass -p "${SERVER_PASS}" scp -r -o StrictHostKeyChecking=no "$1" ${SERVER_USER}@${SERVER_IP}:"$2"
}

echo ""
echo "Step 1: Installing system dependencies..."
run_remote 'apt-get update && apt-get install -y curl wget git nginx build-essential certbot python3-certbot-nginx'

echo ""
echo "Step 2: Installing Node.js ${NODE_VERSION}..."
run_remote "curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - && apt-get install -y nodejs"

echo ""
echo "Step 3: Verifying Node.js installation..."
run_remote 'node --version && npm --version'

echo ""
echo "Step 4: Installing PM2 globally..."
run_remote 'npm install -g pm2'

echo ""
echo "Step 5: Creating application directory..."
run_remote "mkdir -p ${APP_DIR} && mkdir -p ${APP_DIR}/data"

echo ""
echo "Step 6: Transferring application files..."
echo "This may take a few minutes..."
# Create a tarball to transfer (excluding node_modules and other unnecessary files)
cd /workspace/shopify-ai-support-chatbot
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='build' \
    --exclude='*.log' \
    --exclude='.cache' \
    --exclude='dev.sqlite' \
    --exclude='prisma/dev.sqlite' \
    --exclude='data/*' \
    -czf /tmp/app.tar.gz .

# Copy tarball to server
copy_to_remote /tmp/app.tar.gz /tmp/

# Extract on server
run_remote "cd ${APP_DIR} && tar -xzf /tmp/app.tar.gz && rm /tmp/app.tar.gz"

# Make sure package-lock.json exists
run_remote "cd ${APP_DIR} && if [ ! -f package-lock.json ]; then npm install --package-lock-only; fi"

echo ""
echo "Step 7: Creating .env file..."
# Create a basic .env file
run_remote "cat > ${APP_DIR}/.env << 'ENVEOF'
# Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SCOPES=read_products,write_products,read_orders,write_orders,read_customers,write_customers,read_content,write_content,read_themes,write_themes,read_script_tags,write_script_tags,read_checkouts,write_checkouts,read_marketing_events,write_marketing_events,read_analytics,read_translations,write_translations,read_locales,read_shipping,write_shipping,read_inventory,write_inventory,read_merchant_managed_fulfillment_orders,write_merchant_managed_fulfillment_orders,read_online_store_pages,write_online_store_pages,read_price_rules,write_price_rules,read_discounts,write_discounts
HOST=https://${DOMAIN}

# Database
DATABASE_URL=file:./data/production.sqlite

# AI Configuration (OpenAI)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

# Security
SESSION_SECRET=\$(openssl rand -base64 32)
ENCRYPTION_KEY=\$(openssl rand -base64 32)

# Application Settings
NODE_ENV=production
PORT=3000
APP_URL=https://${DOMAIN}

# Feature Flags
ENABLE_AI_CHAT=true
ENABLE_ORDER_TRACKING=true
ENABLE_PRODUCT_RECOMMENDATIONS=true
ENABLE_CART_ABANDONMENT=true
ENABLE_REVIEW_REQUESTS=true
ENABLE_MULTI_LANGUAGE=true

# Shopify Billing
BILLING_REQUIRED=false
FREE_TRIAL_DAYS=14
ENVEOF
"

echo ""
echo "Step 8: Installing npm dependencies..."
run_remote "cd ${APP_DIR} && npm install --omit=dev"

echo ""
echo "Step 9: Setting up database..."
run_remote "cd ${APP_DIR} && npx prisma generate && npx prisma migrate deploy"

echo ""
echo "Step 10: Building application..."
run_remote "cd ${APP_DIR} && npm run build"

echo ""
echo "Step 11: Configuring PM2..."
run_remote "cd ${APP_DIR} && pm2 delete ${APP_NAME} 2>/dev/null || true"
run_remote "cd ${APP_DIR} && pm2 start npm --name '${APP_NAME}' -- start"
run_remote "pm2 save && pm2 startup systemd -u root --hp /root"

echo ""
echo "Step 12: Configuring Nginx..."
run_remote "cat > /etc/nginx/sites-available/${APP_NAME} << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket support for Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
NGINXEOF
"

# Enable the site and restart nginx
run_remote "ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/${APP_NAME}"
run_remote "rm -f /etc/nginx/sites-enabled/default"
run_remote "nginx -t && systemctl restart nginx"

echo ""
echo "Step 13: Configuring firewall..."
run_remote "ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable" || echo "UFW not available, skipping..."

echo ""
echo "Step 14: Installing SSL Certificate with Let's Encrypt..."
echo "NOTE: Make sure ${DOMAIN} and www.${DOMAIN} point to ${SERVER_IP}"
echo "Waiting 5 seconds before proceeding..."
sleep 5

# Test if domain is pointing to the server
echo "Testing DNS resolution..."
run_remote "nslookup ${DOMAIN} || echo 'DNS not fully propagated yet, but continuing...'"

# Obtain SSL certificate
echo "Obtaining SSL certificate..."
run_remote "certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect" || echo "SSL certificate installation failed. You may need to run this manually after DNS is configured."

echo ""
echo "Step 15: Verifying deployment..."
run_remote "pm2 status"
run_remote "systemctl status nginx --no-pager -l"

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Your application is now running at:"
echo "  https://${DOMAIN}"
echo "  https://www.${DOMAIN}"
echo ""
echo "PM2 Management Commands:"
echo "  View logs:    ssh root@${SERVER_IP} 'pm2 logs ${APP_NAME}'"
echo "  Restart:      ssh root@${SERVER_IP} 'pm2 restart ${APP_NAME}'"
echo "  Stop:         ssh root@${SERVER_IP} 'pm2 stop ${APP_NAME}'"
echo "  Status:       ssh root@${SERVER_IP} 'pm2 status'"
echo ""
echo "SSL Certificate Management:"
echo "  Check status: ssh root@${SERVER_IP} 'certbot certificates'"
echo "  Renew:        ssh root@${SERVER_IP} 'certbot renew'"
echo "  (Auto-renewal is configured via cron)"
echo ""
echo "IMPORTANT: Please update the .env file with your actual credentials:"
echo "  ssh root@${SERVER_IP} 'nano ${APP_DIR}/.env'"
echo "Then restart the application:"
echo "  ssh root@${SERVER_IP} 'cd ${APP_DIR} && pm2 restart ${APP_NAME}'"
echo ""
echo "Make sure your DNS is configured:"
echo "  ${DOMAIN} -> ${SERVER_IP} (A record)"
echo "  www.${DOMAIN} -> ${SERVER_IP} (A record or CNAME to ${DOMAIN})"
echo ""
echo "=========================================="
