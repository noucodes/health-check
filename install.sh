#!/bin/bash

# Health Monitor Service Installation Script

echo "🚀 Installing Health Monitor Service..."

# Variables
SERVICE_NAME="health-monitor"
SERVICE_FILE="$SERVICE_NAME.service"
INSTALL_DIR="/home/ubuntu/health-check"
NODE_PATH="/usr/bin/node"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "💡 Run: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

# Get Node.js path
NODE_PATH=$(which node)
echo "📍 Node.js found at: $NODE_PATH"

# Update service file with correct Node.js path
sed -i "s|/usr/bin/node|$NODE_PATH|g" $SERVICE_FILE

# Copy service file
echo "📁 Copying service file..."
sudo cp $SERVICE_FILE /etc/systemd/system/

# Reload systemd
echo "🔄 Reloading systemd..."
sudo systemctl daemon-reload

# Enable service
echo "⚡ Enabling service..."
sudo systemctl enable $SERVICE_NAME

# Start service
echo "▶️ Starting service..."
sudo systemctl start $SERVICE_NAME

# Check status
echo "📊 Checking service status..."
sudo systemctl status $SERVICE_NAME

echo ""
echo "✅ Service installation complete!"
echo ""
echo "📋 Service Commands:"
echo "  Start:    sudo systemctl start $SERVICE_NAME"
echo "  Stop:     sudo systemctl stop $SERVICE_NAME"
echo "  Restart:  sudo systemctl restart $SERVICE_NAME"
echo "  Status:   sudo systemctl status $SERVICE_NAME"
echo "  Logs:     sudo journalctl -u $SERVICE_NAME -f"
echo "  Enable:   sudo systemctl enable $SERVICE_NAME"
echo "  Disable:  sudo systemctl disable $SERVICE_NAME"
