// Load environment variables
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'YOUR_DISCORD_WEBHOOK_URL_HERE';
const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL || 'YOUR_TEAMS_WEBHOOK_URL_HERE';

// Load services configuration
let services = [];
try {
  const configPath = path.join(__dirname, '..', 'integrations', 'config.json');
  const configData = fs.readFileSync(configPath, 'utf8');
  const allServices = JSON.parse(configData);
  // Only load enabled services
  services = allServices.filter(service => service.enabled);
} catch (error) {
  console.error('Error loading services config:', error.message);
  services = [];
}

const healthStatus = {};

services.forEach(service => {
  healthStatus[service.name] = {
    isHealthy: true,
    consecutiveFailures: 0
  };
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

async function sendDiscordMessage(message, isError = false) {
  try {
    if (DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
      console.log('Discord webhook URL not configured. Message:', message);
      return;
    }

    const payload = {
      username: process.env.INTEGRATION_NAME || 'Health Monitor',
      embeds: isError ? [{
        color: 0xFF0000,
        title: '❌ Health Check Failed',
        description: message,
        timestamp: new Date().toISOString()
      }] : [{
        color: 0x00FF00,
        title: '✅ Health Check Status',
        description: message,
        timestamp: new Date().toISOString()
      }]
    };

    await axios.post(DISCORD_WEBHOOK_URL, payload);
    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message);
  }
}


async function sendTeamsMessage(message, isError = false) {
  try {
    if (TEAMS_WEBHOOK_URL === 'YOUR_TEAMS_WEBHOOK_URL_HERE') {
      console.log('Teams webhook URL not configured. Message:', message);
      return;
    }

    const payload = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              {
                type: 'TextBlock',
                text: isError ? '❌ Health Check Failed' : '✅ Health Check Status',
                weight: 'Bolder',
                size: 'Medium',
                color: isError ? 'Attention' : 'Good'
              },
              {
                type: 'TextBlock',
                text: message,
                wrap: true,
                color: 'Default'
              },
              {
                type: 'TextBlock',
                text: `🕐 ${new Date().toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Australia/Sydney'
                })}`,
                size: 'Small',
                isSubtle: true
              }
            ]
          }
        }
      ]
    };

    await axios.post(TEAMS_WEBHOOK_URL, payload);
    console.log('Teams notification sent successfully');
  } catch (error) {
    console.error('Failed to send Teams notification:', error.message);
  }
}

// Helper to notify all channels at once
async function notify(message, isError = false) {
  await Promise.all([
    sendDiscordMessage(message, isError),
    sendTeamsMessage(message, isError)
  ]);
}

async function performHealthCheck() {
  console.log('Checking health for all services...');
  
  for (const service of services) {
    const status = healthStatus[service.name];
    
    try {
      const response = await axios.get(service.url, {
        timeout: 10000,
        validateStatus: (statusCode) => statusCode === 200
      });

      if (response.status === 200) {
        // Health check passed
        if (!status.isHealthy) {
          // Service recovered from unhealthy state
          status.isHealthy = true;
          status.consecutiveFailures = 0;
          await notify(`🎉 ${service.name} has recovered and is now healthy!`);
        }
        console.log(`✅ ${service.name} health check passed:`, new Date().toISOString());
      }
    } catch (error) {
      // Health check failed
      status.consecutiveFailures++;
      console.error(`❌ ${service.name} health check failed (${status.consecutiveFailures} consecutive failures):`, error.message);
      
      if (status.isHealthy || status.consecutiveFailures === 1) {
        // First failure or transition from healthy to unhealthy
        status.isHealthy = false;
        await notify(
          `⚠️ ${service.name} health check failed!\nURL: ${service.url}\nConsecutive failures: ${status.consecutiveFailures}\nError: ${error.message}`,
          true
        );
      } else if (status.consecutiveFailures % 5 === 0) {
        // Every 5th consecutive failure, send an update
        await notify(
          `⚠️ ${service.name} still unhealthy! Consecutive failures: ${status.consecutiveFailures}`,
          true
        );
      }
    }
  }
}

async function sendHealthyStatus() {
  const healthyServices = services.filter(service => healthStatus[service.name].isHealthy);
  
  if (healthyServices.length > 0) {
    const serviceNames = healthyServices.map(s => s.name).join(', ');
    const uptime = `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`;
    
    await notify(
      `✅ All monitored services are healthy!\nServices: ${serviceNames}\nMonitor uptime: ${uptime}`
    );
  }
}

cron.schedule('*/3 * * * *', performHealthCheck);

// Schedule healthy status notifications every 4 hours
cron.schedule('0 */4 * * *', sendHealthyStatus);

// Start server
app.listen(PORT, () => {
  console.log(`Health monitoring server running on port ${PORT}`);
  console.log(`Health endpoint available at: http://localhost:${PORT}/health`);
  
  // Send startup notification
  notify('🚀 Health monitoring service started successfully!');
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await notify('🛑 Health monitoring service is shutting down...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await notify('🛑 Health monitoring service is shutting down...');
  process.exit(0);
});