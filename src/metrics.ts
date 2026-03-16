/**
 * Metrics & Analytics - Track and analyze agent performance
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import log from 'electron-log';

export interface Metric {
  name: string;
  value: number;
  unit?: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface Dashboard {
  id: string;
  name: string;
  panels: DashboardPanel[];
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'log';
  metric: string;
  groupBy?: string;
  timeRange?: string;
}

export class Metrics {
  private metrics: Metric[] = [];
  private timeSeries: Map<string, TimeSeriesPoint[]> = new Map();
  private basePath: string;
  private maxMetrics = 10000;

  constructor(basePath: string = '.missioncontrol/metrics') {
    this.basePath = basePath;
  }

  /**
   * Initialize storage
   */
  async init(): Promise<void> {
    await mkdir(this.basePath, { recursive: true });
    await this.load();
    log.info('[Metrics] Initialized');
  }

  /**
   * Record metric
   */
  record(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);
    
    // Trim old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Update time series
    this.updateTimeSeries(name, value);
  }

  /**
   * Update time series
   */
  private updateTimeSeries(name: string, value: number): void {
    if (!this.timeSeries.has(name)) {
      this.timeSeries.set(name, []);
    }

    const series = this.timeSeries.get(name)!;
    series.push({ timestamp: Date.now(), value });

    // Keep last 1000 points
    if (series.length > 1000) {
      series.shift();
    }
  }

  /**
   * Get current value
   */
  get(name: string): number | undefined {
    const reversed = [...this.metrics].reverse();
    const found = reversed.find(m => m.name === name);
    return found?.value;
  }

  /**
   * Get time series
   */
  getSeries(name: string, duration?: number): TimeSeriesPoint[] {
    const series = this.timeSeries.get(name) || [];
    
    if (!duration) return series;

    const cutoff = Date.now() - duration;
    return series.filter(p => p.timestamp > cutoff);
  }

  /**
   * Query metrics
   */
  query(filter: {
    name?: string;
    startTime?: number;
    endTime?: number;
    tags?: Record<string, string>;
  }): Metric[] {
    let results = this.metrics;

    if (filter.name) {
      results = results.filter(m => m.name === filter.name);
    }

    if (filter.startTime) {
      results = results.filter(m => m.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      results = results.filter(m => m.timestamp <= filter.endTime!);
    }

    if (filter.tags) {
      results = results.filter(m => {
        if (!m.tags) return false;
        return Object.entries(filter.tags!).every(
          ([k, v]) => m.tags![k] === v
        );
      });
    }

    return results;
  }

  /**
   * Get aggregated stats
   */
  stats(name: string, duration?: number): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const points = duration
      ? this.getSeries(name, duration)
      : this.timeSeries.get(name) || [];

    if (points.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const values = points.map(p => p.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      sum,
      avg: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: this.percentile(values, 0.5),
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99),
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Increment counter
   */
  increment(name: string, by: number = 1, tags?: Record<string, string>): void {
    const current = this.get(name) || 0;
    this.record(name, current + by, undefined, tags);
  }

  /**
   * Record timing
   */
  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.record(`${name}.duration`, durationMs, 'ms', tags);
  }

  /**
   * Get all metric names
   */
  names(): string[] {
    return [...new Set(this.metrics.map(m => m.name))];
  }

  /**
   * Get summary
   */
  getSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    
    for (const name of this.names()) {
      const latest = this.get(name);
      if (latest !== undefined) {
        summary[name] = latest;
      }
    }

    return summary;
  }

  /**
   * Save to disk
   */
  async save(): Promise<void> {
    const file = join(this.basePath, 'metrics.json');
    await writeFile(file, JSON.stringify({
      metrics: this.metrics.slice(-1000),
      timeSeries: Object.fromEntries(this.timeSeries),
    }, null, 2));
  }

  /**
   * Load from disk
   */
  async load(): Promise<void> {
    const file = join(this.basePath, 'metrics.json');
    
    if (!existsSync(file)) return;

    try {
      const content = await readFile(file, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.metrics) this.metrics = data.metrics;
      if (data.timeSeries) {
        this.timeSeries = new Map(Object.entries(data.timeSeries));
      }
    } catch (error) {
      log.error('[Metrics] Load error:', error);
    }
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
    this.timeSeries.clear();
  }

  /**
   * Create dashboard
   */
  createDashboard(name: string, panels: DashboardPanel[]): Dashboard {
    return {
      id: `dash_${Date.now()}`,
      name,
      panels,
    };
  }

  /**
   * Export for Grafana
   */
  exportGrafana(): object {
    return {
      panels: this.names().map(name => ({
        title: name,
        targets: [{ expr: `metric_${name}` }],
      })),
    };
  }
}

// Predefined metrics
export const COMMON_METRICS = {
  // Agent metrics
  AGENT_TASKS_TOTAL: 'agent.tasks.total',
  AGENT_TASKS_SUCCESS: 'agent.tasks.success',
  AGENT_TASKS_FAILED: 'agent.tasks.failed',
  AGENT_ACTIVE: 'agent.active',
  AGENT_IDLE: 'agent.idle',
  AGENT_BUSY: 'agent.busy',
  
  // Performance
  TASK_DURATION: 'task.duration',
  TASK_QUEUE_SIZE: 'task.queue.size',
  
  // System
  CPU_USAGE: 'system.cpu',
  MEMORY_USAGE: 'system.memory',
  
  // Cost
  API_CALLS: 'api.calls',
  API_COST: 'api.cost',
  TOKENS_USED: 'tokens.used',
};
