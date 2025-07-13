const logger = require('../config/logger');
const { captureMessage } = require('../config/sentry');
const axios = require('axios');

class AlertingService {
  constructor() {
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate
      responseTime: 2000, // 2 seconds
      memoryUsage: 0.9, // 90% memory usage
      diskUsage: 0.9, // 90% disk usage
      databaseConnections: 0.8, // 80% connection pool usage
      redisConnections: 0.8 // 80% Redis connection pool usage
    };
    
    this.alertHistory = new Map();
    this.alertCooldown = 5 * 60 * 1000; // 5 minutes cooldown
  }

  async checkErrorRate(errorCount, totalRequests) {
    if (totalRequests === 0) return;
    
    const errorRate = errorCount / totalRequests;
    
    if (errorRate > this.alertThresholds.errorRate) {
      await this.sendAlert('HIGH_ERROR_RATE', {
        errorRate: `${(errorRate * 100).toFixed(2)}%`,
        threshold: `${(this.alertThresholds.errorRate * 100).toFixed(2)}%`,
        errorCount,
        totalRequests
      });
    }
  }

  async checkResponseTime(avgResponseTime) {
    if (avgResponseTime > this.alertThresholds.responseTime) {
      await this.sendAlert('HIGH_RESPONSE_TIME', {
        avgResponseTime: `${avgResponseTime}ms`,
        threshold: `${this.alertThresholds.responseTime}ms`
      });
    }
  }

  async checkMemoryUsage(memoryUsage) {
    const usageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
    
    if (usageRatio > this.alertThresholds.memoryUsage) {
      await this.sendAlert('HIGH_MEMORY_USAGE', {
        usageRatio: `${(usageRatio * 100).toFixed(2)}%`,
        threshold: `${(this.alertThresholds.memoryUsage * 100).toFixed(2)}%`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
      });
    }
  }

  async checkDatabaseConnection(databaseHealth) {
    if (databaseHealth.status === 'unhealthy') {
      await this.sendAlert('DATABASE_CONNECTION_FAILURE', {
        error: databaseHealth.error,
        duration: databaseHealth.duration
      });
    }
  }

  async checkRedisConnection(redisHealth) {
    if (redisHealth.status === 'unhealthy') {
      await this.sendAlert('REDIS_CONNECTION_FAILURE', {
        error: redisHealth.error,
        duration: redisHealth.duration
      });
    }
  }

  async checkDiskSpace(diskHealth) {
    if (diskHealth.status === 'unhealthy') {
      await this.sendAlert('DISK_SPACE_LOW', {
        error: diskHealth.error,
        availableSpace: diskHealth.availableSpace
      });
    }
  }

  async sendAlert(type, data) {
    // Check cooldown to prevent spam
    const now = Date.now();
    const lastAlert = this.alertHistory.get(type);
    
    if (lastAlert && (now - lastAlert) < this.alertCooldown) {
      logger.debug(`Alert ${type} skipped due to cooldown`);
      return;
    }
    
    this.alertHistory.set(type, now);

    const alert = {
      type,
      severity: this.getSeverity(type),
      timestamp: new Date().toISOString(),
      data,
      environment: process.env.NODE_ENV,
      service: 'E-Shop API'
    };

    // Log alert
    logger.warn(`Alert: ${type}`, alert);

    // Send to Sentry
    captureMessage(`Alert: ${type}`, 'warning', {
      component: 'alerting',
      ...alert
    });

    // Send to external alerting service
    await this.sendToExternalService(alert);
  }

  getSeverity(type) {
    const severityMap = {
      'HIGH_ERROR_RATE': 'critical',
      'HIGH_RESPONSE_TIME': 'warning',
      'HIGH_MEMORY_USAGE': 'critical',
      'DATABASE_CONNECTION_FAILURE': 'critical',
      'REDIS_CONNECTION_FAILURE': 'warning',
      'DISK_SPACE_LOW': 'critical'
    };
    
    return severityMap[type] || 'info';
  }

  async sendToExternalService(alert) {
    try {
      // Send to Slack if configured
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendToSlack(alert);
      }
      
      // Send email alert if configured
      if (process.env.EMAIL_ALERTS_ENABLED === 'true') {
        await this.sendEmailAlert(alert);
      }
      
      // Send to custom webhook if configured
      if (process.env.ALERT_WEBHOOK_URL) {
        await this.sendToWebhook(alert);
      }
    } catch (error) {
      logger.error('Failed to send external alert:', error);
    }
  }

  async sendToSlack(alert) {
    try {
      const emoji = this.getSeverityEmoji(alert.severity);
      const color = this.getSeverityColor(alert.severity);
      
      const message = {
        text: `${emoji} *${alert.type}* - ${alert.severity.toUpperCase()}`,
        attachments: [{
          color: color,
          fields: Object.entries(alert.data).map(([key, value]) => ({
            title: key,
            value: value.toString(),
            short: true
          })),
          footer: `E-Shop API - ${alert.environment}`,
          ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
        }]
      };
      
      await axios.post(process.env.SLACK_WEBHOOK_URL, message);
      logger.info(`Slack alert sent: ${alert.type}`);
    } catch (error) {
      logger.error('Failed to send Slack alert:', error);
    }
  }

  async sendEmailAlert(alert) {
    // Implement email alerting
    logger.info('Email alert would be sent:', alert);
  }

  async sendToWebhook(alert) {
    try {
      await axios.post(process.env.ALERT_WEBHOOK_URL, alert, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.ALERT_WEBHOOK_KEY || ''
        }
      });
      logger.info(`Webhook alert sent: ${alert.type}`);
    } catch (error) {
      logger.error('Failed to send webhook alert:', error);
    }
  }

  getSeverityEmoji(severity) {
    const emojiMap = {
      'critical': '🚨',
      'warning': '⚠️',
      'info': 'ℹ️'
    };
    return emojiMap[severity] || 'ℹ️';
  }

  getSeverityColor(severity) {
    const colorMap = {
      'critical': '#ff0000',
      'warning': '#ffa500',
      'info': '#0000ff'
    };
    return colorMap[severity] || '#0000ff';
  }

  // Method to update alert thresholds
  updateThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    logger.info('Alert thresholds updated:', this.alertThresholds);
  }

  // Method to get current thresholds
  getThresholds() {
    return { ...this.alertThresholds };
  }

  // Method to clear alert history (useful for testing)
  clearAlertHistory() {
    this.alertHistory.clear();
    logger.info('Alert history cleared');
  }
}

module.exports = new AlertingService(); 