# Health Monitor Service

A Node.js service that monitors multiple endpoints and sends Discord notifications for health status changes.

## Features

- 🏥 Monitor multiple services from a configuration file
- 📱 Discord webhook notifications for failures and recovery
- ⏰ Health checks every 3 minutes
- 📊 Status reports every 4 hours when healthy
- 🔄 Automatic recovery detection
- 🛡️ Graceful shutdown handling

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Discord webhook URL
```

3. Configure services to monitor:
```bash
# Edit integrations/config.json
```

4. Start the service:
```bash
npm start
# or for development with auto-restart:
npm run dev
```

### Production Installation (Linux)

1. Make the install script executable:
```bash
chmod +x install.sh
```

2. Run as root:
```bash
sudo ./install.sh
```

3. Configure your services:
```bash
sudo nano /opt/health-check/.env
sudo nano /opt/health-check/integrations/config.json
```

4. Start the service:
```bash
sudo systemctl start health-check
```

## Configuration

### Environment Variables (.env)

```env
# Discord Webhook URL for health notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# Server port (optional, defaults to 3000)
PORT=3000
```

### Services Configuration (integrations/config.json)

```json
[
  {
    "name": "Orders API",
    "url": "https://your-api.com/health",
    "enabled": true
  },
  {
    "name": "Database Service",
    "url": "https://your-db.com/health",
    "enabled": false
  }
]
```

## Service Management

Once installed as a systemd service:

```bash
# Start service
sudo systemctl start health-check

# Stop service
sudo systemctl stop health-check

# Restart service
sudo systemctl restart health-check

# Check status
sudo systemctl status health-check

# View logs
sudo journalctl -u health-check -f

# Enable auto-start on boot
sudo systemctl enable health-check

# Disable auto-start
sudo systemctl disable health-check
```

## Notification Behavior

- **Immediate alerts**: When a service goes down
- **Recovery alerts**: When a service comes back online
- **Status updates**: Every 5 consecutive failures
- **Health reports**: Every 4 hours when all services are healthy
- **Startup/shutdown**: Notifications when service starts or stops

## Uninstallation

To remove the service completely:

```bash
chmod +x uninstall.sh
sudo ./uninstall.sh
```

## Health Endpoint

The service provides its own health endpoint at:
```
http://localhost:3000/health
```

This returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-02-18T12:00:00.000Z",
  "uptime": 3600
}
```
