/**
 * Load Balancer - 负载均衡
 */

import type { Agent } from './types.js';

/**
 * 负载均衡策略
 */
export type LoadBalanceStrategy = 
  | 'round-robin'      // 轮询
  | 'least-tasks'      // 最少任务
  | 'least-duration'   // 最少工作时间
  | 'random'           // 随机
  | 'skill-based';     // 技能匹配

/**
 * 负载均衡器
 */
export class LoadBalancer {
  private strategy: LoadBalanceStrategy;
  private lastIndex: number = 0;

  constructor(strategy: LoadBalanceStrategy = 'least-tasks') {
    this.strategy = strategy;
  }

  /**
   * 设置策略
   */
  setStrategy(strategy: LoadBalanceStrategy): void {
    this.strategy = strategy;
    this.lastIndex = 0;
  }

  /**
   * 选择最佳员工
   */
  selectAgent(agents: Agent[], requiredSkill?: string): Agent | undefined {
    // 过滤空闲员工
    let candidates = agents.filter(a => a.status === 'idle');

    // 技能过滤
    if (requiredSkill) {
      const skilled = candidates.filter(a => a.skills.includes(requiredSkill));
      if (skilled.length > 0) {
        candidates = skilled;
      }
    }

    if (candidates.length === 0) {
      // 没有空闲的，从所有员工中选择
      candidates = agents;
    }

    if (candidates.length === 0) {
      return undefined;
    }

    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobin(candidates);
      case 'least-tasks':
        return this.leastTasks(candidates);
      case 'least-duration':
        return this.leastDuration(candidates);
      case 'random':
        return this.random(candidates);
      case 'skill-based':
        return this.skillBased(candidates, requiredSkill);
      default:
        return candidates[0];
    }
  }

  /**
   * 轮询
   */
  private roundRobin(agents: Agent[]): Agent {
    const agent = agents[this.lastIndex % agents.length];
    this.lastIndex++;
    return agent;
  }

  /**
   * 最少任务
   */
  private leastTasks(agents: Agent[]): Agent {
    return agents.reduce((min, a) => 
      a.stats.tasksCompleted < min.stats.tasksCompleted ? a : min
    );
  }

  /**
   * 最少工作时间
   */
  private leastDuration(agents: Agent[]): Agent {
    return agents.reduce((min, a) => 
      a.stats.totalWorkTime < min.stats.totalWorkTime ? a : min
    );
  }

  /**
   * 随机
   */
  private random(agents: Agent[]): Agent {
    const index = Math.floor(Math.random() * agents.length);
    return agents[index];
  }

  /**
   * 技能匹配
   */
  private skillBased(agents: Agent[], skill?: string): Agent {
    if (!skill) {
      return this.leastTasks(agents);
    }

    const skilled = agents.filter(a => a.skills.includes(skill));
    if (skilled.length > 0) {
      return this.leastTasks(skilled);
    }

    // 没有匹配技能的，选任务最少的
    return this.leastTasks(agents);
  }

  /**
   * 获取负载分布
   */
  getLoadDistribution(agents: Agent[]): {
    agentId: string;
    load: number; // 0-1
    tasks: number;
    status: string;
  }[] {
    const maxTasks = Math.max(...agents.map(a => a.stats.tasksCompleted), 1);

    return agents.map(a => ({
      agentId: a.id,
      load: a.stats.tasksCompleted / maxTasks,
      tasks: a.stats.tasksCompleted,
      status: a.status,
    }));
  }

  /**
   * 获取最空闲的员工
   */
  getIdleAgents(agents: Agent[]): Agent[] {
    return agents.filter(a => a.status === 'idle');
  }

  /**
   * 获取最忙的员工
   */
  getBusyAgents(agents: Agent[]): Agent[] {
    return agents.filter(a => a.status === 'busy');
  }

  /**
   * 检查是否需要扩容
   */
  needsScaling(agents: Agent[], threshold: number = 0.8): boolean {
    const busyCount = agents.filter(a => a.status === 'busy').length;
    const busyRatio = agents.length > 0 ? busyCount / agents.length : 0;
    return busyRatio >= threshold;
  }
}
