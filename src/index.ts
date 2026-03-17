/**
 * Mission Control - Digital Employee Management System
 */

export { AgentManager } from './agent.js';
export { WorkspaceManager, type TaskExecutor } from './workspace.js';
export { PerformanceManager, type PerformanceReport } from './performance.js';
export { CostManager, type CostRecord, CostBudget, CostReport } from './cost.js';
export { LoadBalancer, type LoadBalanceStrategy } from './loadbalancer.js';
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
import { PerformanceManager } from './performance.js';
import { CostManager, type CostBudget } from './cost.js';
import { LoadBalancer, type LoadBalanceStrategy } from './loadbalancer.js';
import type { Task, Result, AssignOptions, Agent } from './types.js';

/**
 * Mission Control - 主入口
 */
export class MissionControl {
  private workspaceManager: WorkspaceManager;
  private performanceManager: PerformanceManager;
  private costManager: CostManager;
  private loadBalancer: LoadBalancer;

  constructor(config?: { budget?: CostBudget; loadBalanceStrategy?: LoadBalanceStrategy }) {
    this.workspaceManager = new WorkspaceManager();
    this.performanceManager = new PerformanceManager();
    this.costManager = new CostManager(config?.budget);
    this.loadBalancer = new LoadBalancer(config?.loadBalanceStrategy || 'least-tasks');
  }

  /**
   * 设置任务执行器
   */
  setExecutor(executor: TaskExecutor): void {
    this.workspaceManager.setExecutor(executor);
  }

  /**
   * 设置负载均衡策略
   */
  setLoadBalanceStrategy(strategy: LoadBalanceStrategy): void {
    this.loadBalancer.setStrategy(strategy);
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
   * 分配任务 (使用负载均衡)
   */
  async assign(workspaceId: string, task: Task, options?: AssignOptions): Promise<Result> {
    const manager = this.workspaceManager.getAgentManager(workspaceId);
    if (!manager) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // 如果没有指定 agentId，使用负载均衡选择
    if (!options?.agentId) {
      const agents = manager.getAll();
      const selected = this.loadBalancer.selectAgent(agents, options?.skill);
      if (selected) {
        options = { ...options, agentId: selected.id };
      }
    }

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
   * 生成绩效报告
   */
  generatePerformanceReport(workspaceId: string, agentId: string, periodDays?: number) {
    const manager = this.workspaceManager.getAgentManager(workspaceId);
    if (!manager) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const agent = manager.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return this.performanceManager.generateReport(agent, periodDays);
  }

  /**
   * 生成团队报告
   */
  generateTeamReport(workspaceId: string) {
    const manager = this.workspaceManager.getAgentManager(workspaceId);
    if (!manager) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    return this.performanceManager.generateTeamReport(manager.getAll());
  }

  /**
   * 生成成本报告
   */
  generateCostReport(periodDays?: number) {
    return this.costManager.generateReport(periodDays);
  }

  /**
   * 检查预算
   */
  checkBudget() {
    return this.costManager.checkBudget();
  }

  /**
   * 获取成本优化建议
   */
  getCostOptimizations(workspaceId: string) {
    const manager = this.workspaceManager.getAgentManager(workspaceId);
    if (!manager) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    return this.costManager.getOptimizationSuggestions(manager.getAll());
  }

  /**
   * 获取负载分布
   */
  getLoadDistribution(workspaceId: string) {
    const manager = this.workspaceManager.getAgentManager(workspaceId);
    if (!manager) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    return this.loadBalancer.getLoadDistribution(manager.getAll());
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
export function createMissionControl(config?: ConstructorParameters<typeof MissionControl>[0]): MissionControl {
  return new MissionControl(config);
}
