/**
 * Mission Control - Digital Employee Management System
 */

export { AgentManager } from './agent.js';
export { WorkspaceManager, type TaskExecutor } from './workspace.js';
export type { 
  Task, 
  Result, 
  Agent, 
  AgentStats, 
  Workspace, 
  AssignOptions 
} from './types.js';

import { AgentManager } from './agent.js';
import { WorkspaceManager, type TaskExecutor } from './workspace.js';
import type { Task, Result, AssignOptions } from './types.js';

/**
 * Mission Control - 主入口
 */
export class MissionControl {
  private workspaceManager: WorkspaceManager;

  constructor() {
    this.workspaceManager = new WorkspaceManager();
  }

  /**
   * 设置任务执行器
   */
  setExecutor(executor: TaskExecutor): void {
    this.workspaceManager.setExecutor(executor);
  }

  /**
   * 创建部门
   */
  createWorkspace(config: Parameters<WorkspaceManager['create']>[0]) {
    return this.workspaceManager.create(config);
  }

  /**
   * 删除部门
   */
  deleteWorkspace(workspaceId: string) {
    return this.workspaceManager.delete(workspaceId);
  }

  /**
   * 获取部门
   */
  getWorkspace(workspaceId: string) {
    return this.workspaceManager.get(workspaceId);
  }

  /**
   * 获取所有部门
   */
  getWorkspaces() {
    return this.workspaceManager.getAll();
  }

  /**
   * 获取部门的 Agent 管理器
   */
  getAgentManager(workspaceId: string) {
    return this.workspaceManager.getAgentManager(workspaceId);
  }

  /**
   * 招聘员工
   */
  hireAgent(workspaceId: string, config: Parameters<AgentManager['hire']>[0]) {
    return this.workspaceManager.hireAgent(workspaceId, config);
  }

  /**
   * 解雇员工
   */
  fireAgent(workspaceId: string, agentId: string) {
    return this.workspaceManager.fireAgent(workspaceId, agentId);
  }

  /**
   * 分配任务
   */
  async assign(workspaceId: string, task: Task, options?: AssignOptions): Promise<Result> {
    return this.workspaceManager.assign(workspaceId, task, options);
  }

  /**
   * 批量分配任务
   */
  async assignBatch(workspaceId: string, tasks: Task[], options?: AssignOptions): Promise<Result[]> {
    return this.workspaceManager.assignBatch(workspaceId, tasks, options);
  }

  /**
   * 获取部门统计
   */
  getStats(workspaceId: string) {
    return this.workspaceManager.getStats(workspaceId);
  }

  /**
   * 导出所有配置
   */
  export() {
    const workspaces = this.workspaceManager.getAll();
    return workspaces.map(w => this.workspaceManager.export(w.id)).filter(Boolean);
  }

  /**
   * 导入配置
   */
  import(configs: { workspace: any; agents: any[] }[]) {
    configs.forEach(c => {
      this.workspaceManager.import(c);
    });
  }
}

/**
 * 创建 Mission Control 实例
 */
export function createMissionControl(): MissionControl {
  return new MissionControl();
}
