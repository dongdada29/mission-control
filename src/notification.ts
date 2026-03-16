/**
 * Notification System - Alerts and notifications
 */

import { EventEmitter } from 'events';
import log from 'electron-log';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  source?: string;
}

export interface NotificationChannel {
  type: 'slack' | 'discord' | 'email' | 'webhook';
  config: Record<string, string>;
  enabled: boolean;
}

export class NotificationSystem extends EventEmitter {
  private notifications: Notification[] = [];
  private channels: Map<string, NotificationChannel> = new Map();
  private maxHistory = 100;

  constructor() {
    super();
    log.info('[NotificationSystem] Initialized');
  }

  /**
   * Add notification
   */
  notify(type: Notification['type'], title: string, message: string, source?: string): Notification {
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      source,
    };

    this.notifications.unshift(notification);
    
    // Keep only last N
    if (this.notifications.length > this.maxHistory) {
      this.notifications = this.notifications.slice(0, this.maxHistory);
    }

    log.info(`[NotificationSystem] ${type}: ${title}`);
    this.emit('notification', notification);

    // Send to channels
    this.sendToChannels(notification);

    return notification;
  }

  /**
   * Send to configured channels
   */
  private async sendToChannels(notification: Notification): Promise<void> {
    for (const [name, channel] of this.channels) {
      if (!channel.enabled) continue;

      try {
        await this.sendToChannel(channel, notification);
      } catch (error) {
        log.error(`[NotificationSystem] Failed to send to ${name}:`, error);
      }
    }
  }

  /**
   * Send to specific channel
   */
  private async sendToChannel(channel: NotificationChannel, notification: Notification): Promise<void> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };

    const payload = {
      text: `${emoji[notification.type]} ${notification.title}`,
      attachments: [{
        color: notification.type === 'error' ? 'danger' : notification.type,
        text: notification.message,
        footer: notification.source ? `Source: ${notification.source}` : undefined,
      }],
    };

    if (channel.type === 'webhook' || channel.type === 'slack' || channel.type === 'discord') {
      const url = channel.config.url;
      await execAsync(`curl -X POST -H 'Content-Type: application/json' -d '${JSON.stringify(payload)}' ${url}`);
    }
  }

  /**
   * Configure channel
   */
  configureChannel(name: string, type: NotificationChannel['type'], config: Record<string, string>): void {
    this.channels.set(name, {
      type,
      config,
      enabled: true,
    });
    log.info(`[NotificationSystem] Configured channel: ${name} (${type})`);
  }

  /**
   * Enable/disable channel
   */
  setChannelEnabled(name: string, enabled: boolean): void {
    const channel = this.channels.get(name);
    if (channel) {
      channel.enabled = enabled;
      log.info(`[NotificationSystem] Channel ${name} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get notifications
   */
  get(limit?: number, unreadOnly = false): Notification[] {
    let result = this.notifications;
    
    if (unreadOnly) {
      result = result.filter(n => !n.read);
    }
    
    if (limit) {
      result = result.slice(0, limit);
    }
    
    return result;
  }

  /**
   * Mark as read
   */
  markRead(id: string): void {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
    }
  }

  /**
   * Mark all as read
   */
  markAllRead(): void {
    for (const notif of this.notifications) {
      notif.read = true;
    }
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Clear all
   */
  clear(): void {
    this.notifications = [];
    log.info('[NotificationSystem] Cleared all notifications');
  }

  /**
   * Get stats
   */
  getStats(): {
    total: number;
    unread: number;
    byType: Record<string, number>;
  } {
    return {
      total: this.notifications.length,
      unread: this.getUnreadCount(),
      byType: this.notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

// Convenience methods
export const notify = {
  info: (title: string, msg: string, src?: string) => 
    new NotificationSystem().notify('info', title, msg, src),
  success: (title: string, msg: string, src?: string) => 
    new NotificationSystem().notify('success', title, msg, src),
  warning: (title: string, msg: string, src?: string) => 
    new NotificationSystem().notify('warning', title, msg, src),
  error: (title: string, msg: string, src?: string) => 
    new NotificationSystem().notify('error', title, msg, src),
};
