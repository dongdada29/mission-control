/**
 * Agent Pool - Manage multiple agents
 */

import { EventEmitter } from 'events';
import log from 'electron-log';

export interface Agent {
  id: string;
  name: string;
  type: 'worker' | 'reviewer' | 'coordinator' | 'researcher' | 'monitor';
  status: 'idle' | 'busy' | 'offline';
  skills: string[];
  currentTask?: Task;
  metrics: AgentMetrics;
  config: AgentConfig;
}

export interface AgentConfig {
  runtime: 'acp' | 'subagent';
  model?: string;
  maxConcurrent: number;
  timeout: number;
  retryAttempts: number;
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  avgDuration: number;
  lastActive: number;
}

export interface Task {
  id: string;
  description: string;
  priority: number;
  skills: string[];
  timeout?: number;
  assignee?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export class AgentPool extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private queue: Task[] = [];

  constructor() {
    super();
    log.info('[AgentPool] Initialized');
  }

  /**
   * Register a new agent
   */
  register(config: AgentConfig, name: string, type: Agent['type'], skills: string[] = []): Agent {
    const id = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const agent: Agent = {
      id,
      name,
      type,
      status: 'idle',
      skills,
      metrics: {
        tasksCompleted: 0,
        tasksFailed: 0,
        avgDuration: 0,
        lastActive: Date.now(),
      },
      config,
    };

    this.agents.set(id, agent);
    log.info(`[AgentPool] Registered agent: ${name} (${type})`);
    
    this.emit('agent:registered', agent);
    return agent;
  }

  /**
   * Get agent by ID
   */
  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents
   */
  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by type
   */
  getByType(type: Agent['type']): Agent[] {
    return this.getAll().filter(a => a.type === type);
  }

  /**
   * Get idle agents
   */
  getIdle(): Agent[] {
    return this.getAll().filter(a => a.status === 'idle');
  }

  /**
   * Find best agent for task
   */
  findBest(task: Task): Agent | undefined {
    const idle = this.getIdle();
    if (idle.length === 0) return undefined;

    // Filter by required skills
    if (task.skills.length > 0) {
      const withSkills = idle.filter(a => 
        task.skills.every(s => a.skills.includes(s))
      );
      if (withSkills.length > 0) return withSkills[0];
    }

    // Filter by type
    const byType = idle.filter(a => a.type === 'worker');
    if (byType.length > 0) return byType[0];

    return idle[0];
  }

  /**
   * Assign task to agent
   */
  async assign(agentId: string, task: Task): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      log.error(`[AgentPool] Agent not found: ${agentId}`);
      return false;
    }

    if (agent.status !== 'idle') {
      log.warn(`[AgentPool] Agent ${agent.name} is not idle`);
      return false;
    }

    agent.status = 'busy';
    agent.currentTask = task;
    task.status = 'running';
    task.assignee = agentId;

    log.info(`[AgentPool] Assigned task ${task.id} to ${agent.name}`);
    this.emit('task:assigned', task, agent);

    return true;
  }

  /**
   * Complete task
   */
  complete(agentId: string, result: any): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    if (agent.currentTask) {
      agent.currentTask.status = 'completed';
      agent.currentTask.result = result;
      
      agent.metrics.tasksCompleted++;
      agent.metrics.lastActive = Date.now();
      
      log.info(`[AgentPool] Agent ${agent.name} completed task`);
      this.emit('task:completed', agent.currentTask, agent);
    }

    agent.status = 'idle';
    agent.currentTask = undefined;
  }

  /**
   * Fail task
   */
  fail(agentId: string, error: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    if (agent.currentTask) {
      agent.currentTask.status = 'failed';
      agent.currentTask.error = error;
      
      agent.metrics.tasksFailed++;
      agent.metrics.lastActive = Date.now();
      
      log.error(`[AgentPool] Agent ${agent.name} failed: ${error}`);
      this.emit('task:failed', agent.currentTask, agent, error);
    }

    agent.status = 'idle';
    agent.currentTask = undefined;
  }

  /**
   * Remove agent
   */
  remove(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    if (agent.status === 'busy') {
      log.warn(`[AgentPool] Cannot remove busy agent: ${agent.name}`);
      return false;
    }

    this.agents.delete(id);
    log.info(`[AgentPool] Removed agent: ${agent.name}`);
    this.emit('agent:removed', agent);

    return true;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    idle: number;
    busy: number;
    byType: Record<string, number>;
  } {
    const agents = this.getAll();
    
    return {
      total: agents.length,
      idle: agents.filter(a => a.status === 'idle').length,
      busy: agents.filter(a => a.status === 'busy').length,
      byType: agents.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Queue task for later
   */
  queueTask(task: Task): void {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    log.info(`[AgentPool] Queued task: ${task.id} (${this.queue.length} in queue)`);
  }

  /**
   * Process queue
   */
  async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const task = this.queue[0];
      const agent = this.findBest(task);

      if (agent) {
        this.queue.shift();
        await this.assign(agent.id, task);
      } else {
        break;
      }
    }
  }
}

// Default agent configurations
export const DEFAULT_AGENT_CONFIGS: Record<Agent['type'], AgentConfig> = {
  worker: {
    runtime: 'acp',
    maxConcurrent: 5,
    timeout: 300000,
    retryAttempts: 3,
  },
  reviewer: {
    runtime: 'acp',
    maxConcurrent: 3,
    timeout: 120000,
    retryAttempts: 2,
  },
  coordinator: {
    runtime: 'acp',
    maxConcurrent: 1,
    timeout: 600000,
    retryAttempts: 2,
  },
  researcher: {
    runtime: 'acp',
    maxConcurrent: 3,
    timeout: 300000,
    retryAttempts: 2,
  },
  monitor: {
    runtime: 'acp',
    maxConcurrent: 1,
    timeout: 60000,
    retryAttempts: 5,
  },
};
