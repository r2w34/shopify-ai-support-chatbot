#!/bin/bash

# SSL Installation Script for twittstock.com
# Run this AFTER DNS is configured and pointing to 72.60.99.154

set -e

DOMAIN="twittstock.com"
EMAIL="${1:-admin@${DOMAIN}}"  # Use provided email or default

echo "=========================================="
echo "SSL Certificate Installation"
echo "=========================================="
echo "Domain: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo ""

# Check if we're root
if [ "$EUID" -ne 0 ]; then 
    echo "Error: Please run as root"
    echo "Usage: sudo bash install-ssl.sh your@email.com"
    exit 1
fi

# Check DNS
echo "Step 1: Checking DNS configuration..."
DNS_IP=$(nslookup ${DOMAIN} | grep -A1 "Name:" | grep "Address:" | awk '{print $2}' | head -1)
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "Domain ${DOMAIN} resolves to: ${DNS_IP}"
echo "This server's IP is: ${SERVER_IP}"

if [ "${DNS_IP}" != "${SERVER_IP}" ] && [ "${DNS_IP}" != "72.60.99.154" ]; then
    echo ""
    echo "⚠️  WARNING: DNS mismatch detected!"
    echo "The domain ${DOMAIN} is not pointing to this server."
    echo "Please update your DNS records before proceeding."
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting SSL installation."
        exit 1
    fi
fi

# Check if nginx is running
echo ""
echo "Step 2: Checking Nginx status..."
if ! systemctl is-active --quiet nginx; then
    echo "Error: Nginx is not running"
    echo "Starting Nginx..."
    systemctl start nginx
fi
echo "✓ Nginx is running"

# Check if site is accessible
echo ""
echo "Step 3: Testing site accessibility..."
if ! curl -s -o /dev/null -w "%{http_code}" http://${DOMAIN} | grep -q "200\|301\|302"; then
    echo "⚠️  Warning: Site may not be accessible yet"
    echo "Make sure DNS has propagated before proceeding"
fi

# Install SSL certificate
echo ""
echo "Step 4: Installing SSL certificate..."
echo "This may take a minute..."
echo ""

certbot --nginx \
    -d ${DOMAIN} \
    -d www.${DOMAIN} \
    --non-interactive \
    --agree-tos \
    --email ${EMAIL} \
    --redirect \
    --staple-ocsp \
    --must-staple

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ SSL Certificate Installed Successfully!"
    echo "=========================================="
    echo ""
    echo "Your site is now accessible via HTTPS:"
    echo "  https://${DOMAIN}"
    echo "  https://www.${DOMAIN}"
    echo ""
    echo "Certificate details:"
    certbot certificates | grep -A5 "${DOMAIN}"
    echo ""
    echo "Auto-renewal is configured via systemd timer."
    echo "To check renewal status: systemctl status certbot.timer"
    echo ""
    echo "Testing HTTPS..."
    curl -sI https://${DOMAIN} | head -5
    echo ""
else
    echo ""
    echo "=========================================="
    echo "⚠️  SSL Installation Failed"
    echo "=========================================="
    echo ""
    echo "Common reasons for failure:"
    echo "1. DNS not propagated yet (wait 10-30 minutes)"
    echo "2. Port 80 not accessible from internet"
    echo "3. Domain ownership verification failed"
    echo ""
    echo "Please check:"
    echo "1. DNS: nslookup ${DOMAIN}"
    echo "2. Firewall: ufw status"
    echo "3. Nginx logs: tail -f /var/log/nginx/error.log"
    echo ""
    echo "You can retry this script after fixing the issues."
    exit 1
fi
