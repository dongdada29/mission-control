/**
 * Webhook Handler - Handle external webhooks
 */

import { EventEmitter } from 'events';
import log from 'electron-log';

export interface WebhookHandler {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  handler: (payload: any) => Promise<any>;
  description?: string;
}

export interface WebhookEvent {
  type: string;
  source: string;
  payload: any;
  timestamp: number;
}

export class WebhookServer extends EventEmitter {
  private handlers: Map<string, WebhookHandler> = new Map();
  private events: WebhookEvent[] = [];
  private server?: any;

  constructor() {
    super();
    this.registerDefaultHandlers();
    log.info('[WebhookServer] Initialized');
  }

  /**
   * Register default handlers
   */
  private registerDefaultHandlers(): void {
    // Health check
    this.register({
      path: '/health',
      method: 'GET',
      handler: async () => ({ status: 'ok', timestamp: Date.now() }),
      description: 'Health check endpoint',
    });

    // List all agents
    this.register({
      path: '/agents',
      method: 'GET',
      handler: async () => ({ agents: [] }), // Placeholder
      description: 'List all agents',
    });

    // Trigger task
    this.register({
      path: '/tasks',
      method: 'POST',
      handler: async (payload) => {
        this.emit('task:triggered', payload);
        return { status: 'accepted', taskId: `task_${Date.now()}` };
      },
      description: 'Create a new task',
    });

    // Agent status
    this.register({
      path: '/agents/:id/status',
      method: 'GET',
      handler: async (params) => ({ agentId: params.id, status: 'idle' }),
      description: 'Get agent status',
    });

    // Webhook event receiver
    this.register({
      path: '/webhook',
      method: 'POST',
      handler: async (payload) => {
        const event: WebhookEvent = {
          type: payload.type || 'unknown',
          source: payload.source || 'external',
          payload: payload.data,
          timestamp: Date.now(),
        };
        
        this.events.push(event);
        this.emit('webhook', event);
        
        return { received: true };
      },
      description: 'Generic webhook receiver',
    });
  }

  /**
   * Register handler
   */
  register(handler: WebhookHandler): void {
    const key = `${handler.method}:${handler.path}`;
    this.handlers.set(key, handler);
    log.info(`[WebhookServer] Registered: ${key}`);
  }

  /**
   * Unregister handler
   */
  unregister(path: string, method: string): boolean {
    const key = `${method}:${path}`;
    return this.handlers.delete(key);
  }

  /**
   * Handle request
   */
  async handle(path: string, method: string, payload?: any): Promise<any> {
    const key = `${method}:${path}`;
    const handler = this.handlers.get(key);

    if (!handler) {
      // Try to match params
      for (const [hk, h] of this.handlers) {
        if (this.matchPath(h.path, path)) {
          const params = this.extractParams(h.path, path);
          return h.handler({ ...params, ...payload });
        }
      }
      
      throw new Error(`Handler not found: ${method} ${path}`);
    }

    return handler.handler(payload || {});
  }

  /**
   * Match path with params
   */
  private matchPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    
    if (patternParts.length !== pathParts.length) return false;
    
    return patternParts.every((part, i) => 
      part.startsWith(':') || part === pathParts[i]
    );
  }

  /**
   * Extract params from path
   */
  private extractParams(pattern: string, path: string): Record<string, string> {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    const params: Record<string, string> = {};

    patternParts.forEach((part, i) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = pathParts[i];
      }
    });

    return params;
  }

  /**
   * Get registered handlers
   */
  getHandlers(): WebhookHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Get events
   */
  getEvents(limit: number = 50): WebhookEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Clear events
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Start HTTP server
   */
  async start(port: number = 3456): Promise<void> {
    const express = await import('express');
    const app = express();
    
    app.use(express.json());

    // Register all handlers
    for (const handler of this.getHandlers()) {
      const method = handler.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
      app[method](handler.path, async (req: any, res: any) => {
        try {
          const result = await handler.handler(req.body);
          res.json(result);
        } catch (error: any) {
          res.status(500).json({ error: error.message });
        }
      });
    }

    this.server = app.listen(port, () => {
      log.info(`[WebhookServer] Started on port ${port}`);
    });
  }

  /**
   * Stop server
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = undefined;
      log.info('[WebhookServer] Stopped');
    }
  }
}

// Webhook events
export const WEBHOOK_EVENTS = {
  TASK_CREATED: 'task.created',
  TASK_COMPLETED: 'task.completed',
  TASK_FAILED: 'task.failed',
  AGENT_HIRED: 'agent.hired',
  AGENT_FIRED: 'agent.fired',
  AGENT_STATUS_CHANGED: 'agent.status_changed',
  BUILD_STARTED: 'build.started',
  BUILD_COMPLETED: 'build.completed',
  BUILD_FAILED: 'build.failed',
};
