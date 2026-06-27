#!/bin/bash
# AlmaLinux 9 VPS Setup Script for Next.js app
# This script automates package installations for RHEL-based enterprise Linux.
set -e

echo "=== Updating System Package Cache ==="
sudo dnf update -y

echo "=== Installing EPEL Repository ==="
sudo dnf install -y epel-release

echo "=== Installing Development Utilities ==="
sudo dnf install -y git curl wget tar unzip

echo "=== Configuring NodeSource Repository (Node.js 20 LTS) ==="
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

echo "=== Installing PM2 Process Manager ==="
sudo npm install -g pm2

echo "=== Installing Nginx Web Server ==="
sudo dnf install -y nginx

echo "=== Configuring Firewall for HTTP & HTTPS ==="
if systemctl is-active --quiet firewalld; then
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
else
    echo "firewalld is not active, skipping firewall configurations."
fi

echo "=== Installing Certbot for SSL ==="
sudo dnf install -y certbot python3-certbot-nginx

echo "=== Enabling and Starting Nginx ==="
sudo systemctl enable nginx
sudo systemctl start nginx

echo "=== Setup complete ==="
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "PM2 version: $(pm2 -v)"
