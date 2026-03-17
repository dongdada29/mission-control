/**
 * Agent Manager - 员工管理
 */

import type { Agent, AgentStats } from './types.js';

/**
 * Agent 管理器
 */
export class AgentManager {
  private agents: Map<string, Agent> = new Map();

  /**
   * 招聘新员工
   */
  hire(config: {
    id: string;
    name: string;
    skills: string[];
    model: string;
    runtime?: 'acp' | 'subagent';
  }): Agent {
    const agent: Agent = {
      id: config.id,
      name: config.name,
      skills: config.skills,
      model: config.model,
      runtime: config.runtime || 'acp',
      status: 'idle',
      stats: {
        tasksCompleted: 0,
        successRate: 1,
        avgQuality: 0,
        tokensUsed: 0,
        totalWorkTime: 0,
      },
      createdAt: new Date(),
    };

    this.agents.set(agent.id, agent);
    return agent;
  }

  /**
   * 解雇员工
   */
  fire(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  /**
   * 获取员工信息
   */
  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * 获取所有员工
   */
  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * 按技能筛选员工
   */
  findBySkill(skill: string): Agent[] {
    return this.getAll().filter(a => a.skills.includes(skill));
  }

  /**
   * 获取空闲员工
   */
  getIdle(): Agent[] {
    return this.getAll().filter(a => a.status === 'idle');
  }

  /**
   * 获取工作负载最低的员工
   */
  getLowestWorkload(): Agent | undefined {
    const idle = this.getIdle();
    if (idle.length > 0) {
      return idle[0];
    }

    // 如果没有空闲的，返回任务最少的
    return this.getAll().sort((a, b) => 
      a.stats.tasksCompleted - b.stats.tasksCompleted
    )[0];
  }

  /**
   * 更新员工状态
   */
  updateStatus(agentId: string, status: Agent['status'], taskId?: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.currentTask = taskId;
    }
  }

  /**
   * 更新员工绩效
   */
  updateStats(agentId: string, result: { 
    success: boolean; 
    quality?: number; 
    tokens?: number; 
    duration?: number 
  }): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const stats = agent.stats;
    const total = stats.tasksCompleted + (result.success ? 1 : 0);
    
    stats.tasksCompleted = total;
    stats.successRate = (stats.successRate * (total - 1) + (result.success ? 1 : 0)) / total;
    
    if (result.quality !== undefined) {
      stats.avgQuality = (stats.avgQuality * (total - 1) + result.quality) / total;
    }
    
    if (result.tokens !== undefined) {
      stats.tokensUsed += result.tokens;
    }
    
    if (result.duration !== undefined) {
      stats.totalWorkTime += result.duration;
    }
  }

  /**
   * 获取团队统计
   */
  getTeamStats(): {
    total: number;
    idle: number;
    busy: number;
    offline: number;
    totalTasksCompleted: number;
    avgSuccessRate: number;
    totalTokensUsed: number;
  } {
    const agents = this.getAll();
    
    return {
      total: agents.length,
      idle: agents.filter(a => a.status === 'idle').length,
      busy: agents.filter(a => a.status === 'busy').length,
      offline: agents.filter(a => a.status === 'offline').length,
      totalTasksCompleted: agents.reduce((sum, a) => sum + a.stats.tasksCompleted, 0),
      avgSuccessRate: agents.length > 0 
        ? agents.reduce((sum, a) => sum + a.stats.successRate, 0) / agents.length 
        : 0,
      totalTokensUsed: agents.reduce((sum, a) => sum + a.stats.tokensUsed, 0),
    };
  }

  /**
   * 导出员工配置
   */
  export(): Agent[] {
    return this.getAll();
  }

  /**
   * 导入员工配置
   */
  import(agents: Agent[]): void {
    agents.forEach(a => this.agents.set(a.id, a));
  }
}
