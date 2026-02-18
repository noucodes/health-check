#!/bin/bash

# Health Monitor Service Uninstallation Script
# This script removes the health monitor systemd service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVICE_NAME="health-monitor"
SERVICE_USER="health-monitor"
SERVICE_DIR="/opt/health-monitor"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo -e "${GREEN}🗑️  Uninstalling Health Monitor Service${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Stop and disable service
echo -e "${YELLOW}Stopping and disabling service${NC}"
systemctl stop "$SERVICE_NAME" 2>/dev/null || true
systemctl disable "$SERVICE_NAME" 2>/dev/null || true

# Remove systemd service file
echo -e "${YELLOW}Removing systemd service file${NC}"
rm -f "$SERVICE_FILE"
systemctl daemon-reload

# Remove logrotate configuration
echo -e "${YELLOW}Removing logrotate configuration${NC}"
rm -f "/etc/logrotate.d/${SERVICE_NAME}"

# Remove service directory (optional)
read -p "Remove service directory $SERVICE_DIR? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Removing service directory${NC}"
    rm -rf "$SERVICE_DIR"
fi

# Remove service user (optional)
read -p "Remove service user $SERVICE_USER? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Removing service user${NC}"
    userdel "$SERVICE_USER" 2>/dev/null || true
fi

echo -e "${GREEN}✅ Uninstallation completed successfully!${NC}"
