#!/bin/bash

# Health Monitor Service Removal Script

echo "🗑️ Removing Health Monitor Service..."

SERVICE_NAME="health-check"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Stop service
echo "⏹️ Stopping service..."
sudo systemctl stop $SERVICE_NAME

# Disable service
echo "🔒 Disabling service..."
sudo systemctl disable $SERVICE_NAME

# Remove service file
echo "🗑️ Removing service file..."
sudo rm /etc/systemd/system/$SERVICE_NAME.service

# Reload systemd
echo "🔄 Reloading systemd..."
sudo systemctl daemon-reload

echo ""
echo "✅ Service removed successfully!"
echo ""
echo "📋 Service is no longer running as a Linux service."
