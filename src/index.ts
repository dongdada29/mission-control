/**
 * Mission Control - Core Index
 * Manage 100+ AI Agent digital employees
 */

import { AgentPool, Agent, DEFAULT_AGENT_CONFIGS, Task } from './agentPool';
import { TaskScheduler, ScheduledTask, COMMON_TEMPLATES } from './taskScheduler';

export interface Workspace {
  id: string;
  name: string;
  path: string;
  agents: string[];
  config: WorkspaceConfig;
}

export interface WorkspaceConfig {
  maxAgents: number;
  defaultSkills: string[];
  notifyOnFail: boolean;
  autoScale: boolean;
}

export interface MissionConfig {
  version: string;
  workspaces: Map<string, Workspace>;
  pool: AgentPool;
  scheduler: TaskScheduler;
}

/**
 * Mission Control - Main Class
 */
export class MissionControl {
  private pool: AgentPool;
  private scheduler: TaskScheduler;
  private workspaces: Map<string, Workspace> = new Map();

  constructor() {
    this.pool = new AgentPool();
    this.scheduler = new TaskScheduler();
    
    // Register common templates
    for (const template of COMMON_TEMPLATES) {
      this.scheduler.registerTemplate(template);
    }
  }

  /**
   * Create workspace
   */
  createWorkspace(name: string, path: string, config?: Partial<WorkspaceConfig>): Workspace {
    const workspace: Workspace = {
      id: `ws_${Date.now()}`,
      name,
      path,
      agents: [],
      config: {
        maxAgents: 10,
        defaultSkills: [],
        notifyOnFail: true,
        autoScale: false,
        ...config,
      },
    };

    this.workspaces.set(name, workspace);
    return workspace;
  }

  /**
   * Get workspace
   */
  getWorkspace(name: string): Workspace | undefined {
    return this.workspaces.get(name);
  }

  /**
   * Hire agent
   */
  hire(name: string, type: Agent['type'], skills: string[] = [], workspace?: string): Agent {
    const config = DEFAULT_AGENT_CONFIGS[type];
    const agent = this.pool.register(config, name, type, skills);

    if (workspace) {
      const ws = this.workspaces.get(workspace);
      if (ws) {
        ws.agents.push(agent.id);
      }
    }

    return agent;
  }

  /**
   * Assign task to agent
   */
  async assign(agentId: string, task: Task): Promise<boolean> {
    return this.pool.assign(agentId, task);
  }

  /**
   * Assign task to best available agent
   */
  async assignBest(task: Task): Promise<boolean> {
    const agent = this.pool.findBest(task);
    if (!agent) {
      this.pool.queueTask(task);
      return false;
    }

    return this.pool.assign(agent.id, task);
  }

  /**
   * Schedule task
   */
  schedule(task: ScheduledTask): void {
    this.scheduler.schedule(task);
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      pool: this.pool.getStats(),
      scheduler: this.scheduler.getStats(),
      workspaces: this.workspaces.size,
    };
  }

  /**
   * Get all agents
   */
  getAgents(): Agent[] {
    return this.pool.getAll();
  }

  /**
   * Get scheduled tasks
   */
  getScheduledTasks(): ScheduledTask[] {
    return this.scheduler.getAll();
  }

  /**
   * Fire agent
   */
  fire(agentId: string): boolean {
    return this.pool.remove(agentId);
  }

  /**
   * Stop all
   */
  shutdown(): void {
    this.scheduler.stopAll();
  }
}

// Export everything
export { AgentPool, Agent, Task } from './agentPool';
export { TaskScheduler, ScheduledTask, TaskTemplate, COMMON_TEMPLATES } from './taskScheduler';
