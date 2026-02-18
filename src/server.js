// Load environment variables
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration - Replace with your actual Discord webhook URL
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'YOUR_DISCORD_WEBHOOK_URL_HERE';

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

// Health monitoring state for each service
const healthStatus = {};

// Initialize health status for all services
services.forEach(service => {
  healthStatus[service.name] = {
    isHealthy: true,
    consecutiveFailures: 0
  };
});

// Health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Discord webhook function
async function sendDiscordMessage(message, isError = false) {
  try {
    if (DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
      console.log('Discord webhook URL not configured. Message:', message);
      return;
    }

    const payload = {
      username: 'Health Monitor',
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

// Health check function for all services
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
          await sendDiscordMessage(`🎉 ${service.name} has recovered and is now healthy!`);
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
        await sendDiscordMessage(
          `⚠️ ${service.name} health check failed!\nURL: ${service.url}\nConsecutive failures: ${status.consecutiveFailures}\nError: ${error.message}`,
          true
        );
      } else if (status.consecutiveFailures % 5 === 0) {
        // Every 5th consecutive failure, send an update
        await sendDiscordMessage(
          `⚠️ ${service.name} still unhealthy! Consecutive failures: ${status.consecutiveFailures}`,
          true
        );
      }
    }
  }
}

// Send healthy status every 4 hours
async function sendHealthyStatus() {
  const healthyServices = services.filter(service => healthStatus[service.name].isHealthy);
  
  if (healthyServices.length > 0) {
    const serviceNames = healthyServices.map(s => s.name).join(', ');
    const uptime = `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`;
    
    await sendDiscordMessage(
      `✅ All monitored services are healthy!\nServices: ${serviceNames}\nMonitor uptime: ${uptime}`
    );
  }
}

// Schedule health checks every 3 minutes (between 2-5 minutes as requested)
cron.schedule('*/3 * * * *', performHealthCheck);

// Schedule healthy status notifications every 4 hours
cron.schedule('0 */4 * * *', sendHealthyStatus);

// Start server
app.listen(PORT, () => {
  console.log(`Health monitoring server running on port ${PORT}`);
  console.log(`Health endpoint available at: http://localhost:${PORT}/health`);
  
  // Send startup notification
  sendDiscordMessage('🚀 Health monitoring service started successfully!');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await sendDiscordMessage('🛑 Health monitoring service is shutting down...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await sendDiscordMessage('🛑 Health monitoring service is shutting down...');
  process.exit(0);
});