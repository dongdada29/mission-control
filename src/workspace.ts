/**
 * Workspace Manager - 部门管理
 */

import type { Workspace, Agent, AssignOptions, Task, Result } from './types.js';
import { AgentManager } from './agent.js';

/**
 * Task executor function
 */
export type TaskExecutor = (task: Task) => Promise<Result>;

/**
 * Workspace 管理器
 */
export class WorkspaceManager {
  private workspaces: Map<string, Workspace> = new Map();
  private agentManagers: Map<string, AgentManager> = new Map();
  private executor?: TaskExecutor;

  /**
   * Set task executor
   */
  setExecutor(executor: TaskExecutor): void {
    this.executor = executor;
  }

  /**
   * 创建部门
   */
  create(config: {
    id: string;
    name: string;
    description?: string;
    skills?: string[];
    memoryPath?: string;
  }): Workspace {
    const workspace: Workspace = {
      id: config.id,
      name: config.name,
      description: config.description,
      agents: new Map(),
      skills: config.skills || [],
      memoryPath: config.memoryPath,
      createdAt: new Date(),
    };

    this.workspaces.set(workspace.id, workspace);
    this.agentManagers.set(workspace.id, new AgentManager());

    return workspace;
  }

  /**
   * 删除部门
   */
  delete(workspaceId: string): boolean {
    this.agentManagers.delete(workspaceId);
    return this.workspaces.delete(workspaceId);
  }

  /**
   * 获取部门
   */
  get(workspaceId: string): Workspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  /**
   * 获取所有部门
   */
  getAll(): Workspace[] {
    return Array.from(this.workspaces.values());
  }

  /**
   * 获取部门的 Agent 管理器
   */
  getAgentManager(workspaceId: string): AgentManager | undefined {
    return this.agentManagers.get(workspaceId);
  }

  /**
   * 给部门招聘员工
   */
  hireAgent(workspaceId: string, config: Parameters<AgentManager['hire']>[0]): Agent | undefined {
    const manager = this.agentManagers.get(workspaceId);
    const workspace = this.workspaces.get(workspaceId);

    if (!manager || !workspace) return undefined;

    const agent = manager.hire(config);
    workspace.agents.set(agent.id, agent);

    return agent;
  }

  /**
   * 解雇员工
   */
  fireAgent(workspaceId: string, agentId: string): boolean {
    const manager = this.agentManagers.get(workspaceId);
    const workspace = this.workspaces.get(workspaceId);

    if (!manager || !workspace) return false;

    const result = manager.fire(agentId);
    workspace.agents.delete(agentId);

    return result;
  }

  /**
   * 分配任务
   */
  async assign(
    workspaceId: string,
    task: Task,
    options: AssignOptions = {}
  ): Promise<Result> {
    const manager = this.agentManagers.get(workspaceId);
    if (!manager) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // 选择员工
    let agent: Agent | undefined;

    if (options.agentId) {
      agent = manager.get(options.agentId);
    } else if (options.skill) {
      const candidates = manager.findBySkill(options.skill);
      agent = candidates.find(a => a.status === 'idle') || candidates[0];
    } else if (options.lowestWorkload) {
      agent = manager.getLowestWorkload();
    } else {
      agent = manager.getIdle()[0];
    }

    if (!agent) {
      throw new Error('No available agent');
    }

    // 检查是否有执行器
    if (!this.executor) {
      // 返回模拟结果
      return {
        taskId: task.id,
        success: true,
        output: `Task ${task.id} assigned to ${agent.name} (no executor configured)`,
      };
    }

    // 更新状态
    manager.updateStatus(agent.id, 'busy', task.id);

    const startTime = Date.now();

    try {
      // 使用执行器执行任务
      const result = await this.executor({
        ...task,
        agent: agent.model,
      });

      // 更新绩效
      manager.updateStats(agent.id, {
        success: result.success,
        tokens: result.tokensUsed,
        duration: Date.now() - startTime,
      });

      return result;
    } finally {
      manager.updateStatus(agent.id, 'idle');
    }
  }

  /**
   * 批量分配任务
   */
  async assignBatch(
    workspaceId: string,
    tasks: Task[],
    options: AssignOptions = {}
  ): Promise<Result[]> {
    const results: Result[] = [];

    for (const task of tasks) {
      const result = await this.assign(workspaceId, task, options);
      results.push(result);
    }

    return results;
  }

  /**
   * 获取部门统计
   */
  getStats(workspaceId: string): ReturnType<AgentManager['getTeamStats']> | undefined {
    const manager = this.agentManagers.get(workspaceId);
    return manager?.getTeamStats();
  }

  /**
   * 导出部门配置
   */
  export(workspaceId: string): { workspace: Workspace; agents: Agent[] } | undefined {
    const workspace = this.workspaces.get(workspaceId);
    const manager = this.agentManagers.get(workspaceId);

    if (!workspace || !manager) return undefined;

    return {
      workspace,
      agents: manager.export(),
    };
  }

  /**
   * 导入部门配置
   */
  import(config: { workspace: Workspace; agents: Agent[] }): void {
    const workspace: Workspace = {
      ...config.workspace,
      agents: new Map(),
      createdAt: new Date(config.workspace.createdAt),
    };

    this.workspaces.set(workspace.id, workspace);

    const manager = new AgentManager();
    manager.import(config.agents);
    this.agentManagers.set(workspace.id, manager);

    // 更新 workspace.agents 引用
    config.agents.forEach(a => workspace.agents.set(a.id, a));
  }
}
