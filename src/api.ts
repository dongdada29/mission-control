/**
 * REST API Server - Remote control Mission Control
 */

import express, { Request, Response, NextFunction } from 'express';
import log from 'electron-log';
import { MissionControl } from './index.js';
import { Metrics } from './metrics.js';
import { NotificationSystem } from './notification.js';

export interface APIServerConfig {
  port: number;
  cors?: boolean;
  auth?: {
    apiKey: string;
  };
}

export class APIServer {
  private app: express.Application;
  private server?: any;
  private mc: MissionControl;
  private metrics: Metrics;
  private notif: NotificationSystem;

  constructor(mc: MissionControl, config: APIServerConfig) {
    this.mc = mc;
    this.metrics = new Metrics();
    this.notif = new NotificationSystem();
    this.app = express();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        log.info(`[API] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });

    // Error handling
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      log.error('[API] Error:', err);
      res.status(500).json({ error: err.message });
    });
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Health
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // Status
    this.app.get('/api/status', (req: Request, res: Response) => {
      res.json(this.mc.getStatus());
    });

    // Agents
    this.app.get('/api/agents', (req: Request, res: Response) => {
      const agents = this.mc.getAgents();
      res.json({ agents });
    });

    this.app.post('/api/agents', (req: Request, res: Response) => {
      const { name, type, skills } = req.body;
      const agent = this.mc.hire(name, type, skills);
      res.json({ agent });
    });

    this.app.get('/api/agents/:id', (req: Request, res: Response) => {
      const agent = this.mc.getAgents().find(a => a.id === req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json({ agent });
    });

    this.app.delete('/api/agents/:id', (req: Request, res: Response) => {
      const success = this.mc.fire(req.params.id);
      res.json({ success });
    });

    // Tasks
    this.app.get('/api/tasks', (req: Request, res: Response) => {
      const tasks = this.mc.getScheduledTasks();
      res.json({ tasks });
    });

    this.app.post('/api/tasks', (req: Request, res: Response) => {
      const { name, command, schedule, agentId } = req.body;
      
      // For now, just return accepted
      res.json({ 
        status: 'accepted',
        taskId: `task_${Date.now()}`,
      });
    });

    // Metrics
    this.app.get('/api/metrics', (req: Request, res: Response) => {
      res.json(this.metrics.getSummary());
    });

    this.app.get('/api/metrics/:name', (req: Request, res: Response) => {
      const stats = this.metrics.stats(req.params.name);
      res.json(stats);
    });

    this.app.post('/api/metrics', (req: Request, res: Response) => {
      const { name, value, unit } = req.body;
      this.metrics.record(name, value, unit);
      res.json({ success: true });
    });

    // Notifications
    this.app.get('/api/notifications', (req: Request, res: Response) => {
      const notifications = this.notif.get(50);
      res.json({ notifications });
    });

    this.app.post('/api/notifications', (req: Request, res: Response) => {
      const { type, title, message } = req.body;
      const notif = this.notif.notify(type, title, message);
      res.json({ notification: notif });
    });

    // Workspaces
    this.app.get('/api/workspaces', (req: Request, res: Response) => {
      const workspaces = [this.mc.getStatus()]; // Placeholder
      res.json({ workspaces });
    });

    this.app.post('/api/workspaces', (req: Request, res: Response) => {
      const { name, path } = req.body;
      const ws = this.mc.createWorkspace(name, path);
      res.json({ workspace: ws });
    });

    // Webhook endpoint for external triggers
    this.app.post('/api/webhook', (req: Request, res: Response) => {
      const { event, data } = req.body;
      log.info(`[API] Webhook: ${event}`, data);
      
      // Handle events
      switch (event) {
        case 'task.trigger':
          // Trigger task
          break;
        case 'agent.hire':
          // Hire agent
          break;
        default:
          log.warn(`[API] Unknown event: ${event}`);
      }
      
      res.json({ received: true });
    });
  }

  /**
   * Start server
   */
  async start(port: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        log.info(`[APIServer] Started on port ${port}`);
        resolve();
      });
    });
  }

  /**
   * Stop server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          log.info('[APIServer] Stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get express app
   */
  getApp(): express.Application {
    return this.app;
  }
}

// Quick start
export async function createAPIServer(mc: MissionControl, port: number = 3000): Promise<APIServer> {
  const server = new APIServer(mc, { port });
  await server.start(port);
  return server;
}
