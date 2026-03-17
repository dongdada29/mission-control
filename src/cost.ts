/**
 * Cost - 成本控制
 */

import type { Agent } from './types.js';

/**
 * 模型定价 (USD per 1K tokens)
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4': { input: 0.003, output: 0.015 },
  'claude-opus-4': { input: 0.015, output: 0.075 },
  'zai/glm-5': { input: 0.0005, output: 0.0005 },
  'deepseek-v3': { input: 0.0003, output: 0.0006 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
};

/**
 * 成本记录
 */
export interface CostRecord {
  id: string;
  agentId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
  taskId?: string;
}

/**
 * 成本预算
 */
export interface CostBudget {
  daily: number;
  weekly: number;
  monthly: number;
}

/**
 * 成本报告
 */
export interface CostReport {
  totalCost: number;
  byAgent: Map<string, number>;
  byModel: Map<string, number>;
  period: {
    start: Date;
    end: Date;
  };
  budget?: CostBudget;
  utilization: number;
}

/**
 * 成本管理器
 */
export class CostManager {
  private records: CostRecord[] = [];
  private budget?: CostBudget;
  private idCounter = 0;

  constructor(budget?: CostBudget) {
    this.budget = budget;
  }

  /**
   * 设置预算
   */
  setBudget(budget: CostBudget): void {
    this.budget = budget;
  }

  /**
   * 记录成本
   */
  recordCost(params: {
    agentId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    taskId?: string;
  }): CostRecord {
    const pricing = MODEL_PRICING[params.model] || { input: 0.001, output: 0.002 };
    
    const cost = 
      (params.inputTokens / 1000) * pricing.input +
      (params.outputTokens / 1000) * pricing.output;

    const record: CostRecord = {
      id: `cost-${++this.idCounter}`,
      agentId: params.agentId,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cost,
      timestamp: new Date(),
      taskId: params.taskId,
    };

    this.records.push(record);
    return record;
  }

  /**
   * 生成成本报告
   */
  generateReport(periodDays: number = 7): CostReport {
    const end = new Date();
    const start = new Date(end.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const filteredRecords = this.records.filter(r => 
      r.timestamp >= start && r.timestamp <= end
    );

    const totalCost = filteredRecords.reduce((sum, r) => sum + r.cost, 0);

    const byAgent = new Map<string, number>();
    filteredRecords.forEach(r => {
      const current = byAgent.get(r.agentId) || 0;
      byAgent.set(r.agentId, current + r.cost);
    });

    const byModel = new Map<string, number>();
    filteredRecords.forEach(r => {
      const current = byModel.get(r.model) || 0;
      byModel.set(r.model, current + r.cost);
    });

    let utilization = 0;
    if (this.budget) {
      const budgetAmount = periodDays <= 1 
        ? this.budget.daily 
        : periodDays <= 7 
          ? this.budget.weekly 
          : this.budget.monthly;
      utilization = budgetAmount > 0 ? totalCost / budgetAmount : 0;
    }

    return {
      totalCost,
      byAgent,
      byModel,
      period: { start, end },
      budget: this.budget,
      utilization,
    };
  }

  /**
   * 检查预算
   */
  checkBudget(): { exceeded: boolean; usage: number; remaining: number } {
    if (!this.budget) {
      return { exceeded: false, usage: 0, remaining: Infinity };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCost = this.records
      .filter(r => r.timestamp >= today)
      .reduce((sum, r) => sum + r.cost, 0);

    return {
      exceeded: todayCost > this.budget.daily,
      usage: todayCost,
      remaining: Math.max(0, this.budget.daily - todayCost),
    };
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(agents: Agent[]): string[] {
    const suggestions: string[] = [];

    // 找出高成本员工
    const agentCosts = agents.map(a => ({
      id: a.id,
      name: a.name,
      model: a.model,
      cost: this.calculateAgentCost(a),
      tasks: a.stats.tasksCompleted,
      costPerTask: a.stats.tasksCompleted > 0 
        ? this.calculateAgentCost(a) / a.stats.tasksCompleted 
        : 0,
    }));

    // 高成本任务
    const highCost = agentCosts.filter(a => a.costPerTask > 0.1);
    if (highCost.length > 0) {
      suggestions.push(
        `以下员工单任务成本较高: ${highCost.map(a => a.name).join(', ')}，建议切换到更便宜的模型`
      );
    }

    // 检查高价模型
    const expensiveModels = agentCosts.filter(a => 
      a.model.includes('opus') || a.model.includes('gpt-4')
    );
    if (expensiveModels.length > 0) {
      suggestions.push(
        `有 ${expensiveModels.length} 个员工使用高价模型，对于简单任务可考虑切换到 sonnet 或 glm-5`
      );
    }

    // 预算警告
    const budgetCheck = this.checkBudget();
    if (this.budget && budgetCheck.usage > this.budget.daily * 0.8) {
      suggestions.push(`日预算已使用 ${((budgetCheck.usage / this.budget.daily) * 100).toFixed(1)}%，请注意控制成本`);
    }

    return suggestions;
  }

  /**
   * 计算单个 Agent 成本
   */
  calculateAgentCost(agent: Agent): number {
    const pricing = MODEL_PRICING[agent.model] || { input: 0.001, output: 0.002 };
    // 假设 input:output 比例为 3:1
    const inputTokens = agent.stats.tokensUsed * 0.75;
    const outputTokens = agent.stats.tokensUsed * 0.25;
    
    return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
  }

  /**
   * 获取记录
   */
  getRecords(agentId?: string): CostRecord[] {
    if (agentId) {
      return this.records.filter(r => r.agentId === agentId);
    }
    return [...this.records];
  }

  /**
   * 清除记录
   */
  clearRecords(before?: Date): void {
    if (before) {
      this.records = this.records.filter(r => r.timestamp >= before);
    } else {
      this.records = [];
    }
  }
}
