/**
 * Task Scheduler - Schedule and manage tasks
 */

import { EventEmitter } from 'events';
import log from 'electron-log';

export interface ScheduledTask {
  id: string;
  name: string;
  command: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  tasks: string[];
  agents: string[];
  conditions?: {
    time?: string;
    files?: string[];
    git?: { branch?: string; changes?: boolean };
  };
}

export class TaskScheduler extends EventEmitter {
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private templates: Map<string, TaskTemplate> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    log.info('[TaskScheduler] Initialized');
  }

  /**
   * Schedule a recurring task
   */
  schedule(task: ScheduledTask): void {
    this.scheduledTasks.set(task.id, task);
    this.scheduleNext(task.id);
    log.info(`[TaskScheduler] Scheduled: ${task.name} (${task.schedule})`);
    this.emit('scheduled', task);
  }

  /**
   * Schedule next run
   */
  private scheduleNext(taskId: string): void {
    const task = this.scheduledTasks.get(taskId);
    if (!task || !task.enabled) return;

    // Simple interval for now (support basic: daily, hourly)
    const interval = this.parseSchedule(task.schedule);
    if (!interval) return;

    const nextRun = Date.now() + interval;
    task.nextRun = nextRun;

    const timer = setTimeout(() => {
      this.runTask(taskId);
    }, interval);

    this.timers.set(taskId, timer);
  }

  /**
   * Parse schedule to interval ms
   */
  private parseSchedule(schedule: string): number | null {
    const patterns: Record<string, number> = {
      '0 9 * * *': 24 * 60 * 60 * 1000, // daily at 9am
      '0 * * * *': 60 * 60 * 1000, // hourly
      '*/15 * * * *': 15 * 60 * 1000, // every 15 min
      '*/30 * * * *': 30 * 60 * 1000, // every 30 min
      'daily': 24 * 60 * 60 * 1000,
      'hourly': 60 * 60 * 1000,
      'minutely': 60 * 1000,
    };

    return patterns[schedule] || null;
  }

  /**
   * Run a scheduled task
   */
  async runTask(taskId: string): Promise<any> {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return null;

    task.status = 'running';
    log.info(`[TaskScheduler] Running: ${task.name}`);
    this.emit('run:start', task);

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const result = await execAsync(task.command, { timeout: 300000 });
      
      task.status = 'completed';
      task.lastRun = Date.now();
      task.result = { stdout: result.stdout, stderr: result.stderr };
      
      log.info(`[TaskScheduler] Completed: ${task.name}`);
      this.emit('run:complete', task, task.result);
      
      return task.result;
    } catch (error: any) {
      task.status = 'failed';
      task.lastRun = Date.now();
      task.result = { error: error.message };
      
      log.error(`[TaskScheduler] Failed: ${task.name}`, error);
      this.emit('run:failed', task, error);
      
      return null;
    } finally {
      // Schedule next run
      this.scheduleNext(taskId);
    }
  }

  /**
   * Run task immediately
   */
  async runNow(taskId: string): Promise<any> {
    const task = this.scheduledTasks.get(taskId);
    if (!task) {
      log.error(`[TaskScheduler] Task not found: ${taskId}`);
      return null;
    }

    return this.runTask(taskId);
  }

  /**
   * Enable/disable task
   */
  setEnabled(taskId: string, enabled: boolean): void {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return;

    task.enabled = enabled;
    
    if (enabled) {
      this.scheduleNext(taskId);
      log.info(`[TaskScheduler] Enabled: ${task.name}`);
    } else {
      const timer = this.timers.get(taskId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(taskId);
      }
      log.info(`[TaskScheduler] Disabled: ${task.name}`);
    }

    this.emit('enabled', task, enabled);
  }

  /**
   * Get task
   */
  get(taskId: string): ScheduledTask | undefined {
    return this.scheduledTasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAll(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  /**
   * Get upcoming tasks
   */
  getUpcoming(): ScheduledTask[] {
    return this.getAll()
      .filter(t => t.enabled && t.nextRun)
      .sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0));
  }

  /**
   * Register template
   */
  registerTemplate(template: TaskTemplate): void {
    this.templates.set(template.id, template);
    log.info(`[TaskScheduler] Registered template: ${template.name}`);
  }

  /**
   * Create task from template
   */
  createFromTemplate(templateId: string, vars: Record<string, string> = {}): ScheduledTask | null {
    const template = this.templates.get(templateId);
    if (!template) {
      log.error(`[TaskScheduler] Template not found: ${templateId}`);
      return null;
    }

    const task: ScheduledTask = {
      id: `task_${Date.now()}`,
      name: template.name,
      command: this.interpolate(template.tasks.join(' && '), vars),
      schedule: 'manual',
      enabled: true,
      status: 'pending',
    };

    return task;
  }

  /**
   * Interpolate variables
   */
  private interpolate(str: string, vars: Record<string, string>): string {
    let result = str;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  /**
   * Remove task
   */
  remove(taskId: string): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return false;

    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }

    this.scheduledTasks.delete(taskId);
    log.info(`[TaskScheduler] Removed: ${task.name}`);
    this.emit('removed', task);

    return true;
  }

  /**
   * Stop all
   */
  stopAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    log.info('[TaskScheduler] Stopped all tasks');
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    enabled: number;
    running: number;
    upcoming: number;
  } {
    const all = this.getAll();
    return {
      total: all.length,
      enabled: all.filter(t => t.enabled).length,
      running: all.filter(t => t.status === 'running').length,
      upcoming: this.getUpcoming().length,
    };
  }
}

// Common task templates
export const COMMON_TEMPLATES: TaskTemplate[] = [
  {
    id: 'daily-build',
    name: 'Daily Build',
    description: 'Run build, test, and report',
    tasks: ['npm ci', 'npm run build', 'npm run test'],
    agents: ['worker'],
    conditions: { time: '0 2 * * *' },
  },
  {
    id: 'code-scan',
    name: 'Code Security Scan',
    description: 'Scan for security vulnerabilities',
    tasks: ['npm audit', 'npm run lint'],
    agents: ['reviewer'],
    conditions: { time: '0 3 * * *' },
  },
  {
    id: 'sync-docs',
    name: 'Sync Documentation',
    description: 'Sync docs to CDN',
    tasks: ['npm run docs:build', 'npm run docs:deploy'],
    agents: ['worker'],
    conditions: { time: '0 4 * * *' },
  },
];
