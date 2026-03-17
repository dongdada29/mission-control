import { describe, it, expect, beforeEach } from 'vitest';
import { CostManager } from '../src/cost.js';
import type { CostBudget, Agent } from '../src/types.js';

describe('CostManager', () => {
  let manager: CostManager;
  const budget: CostBudget = {
    daily: 10,
    weekly: 50,
    monthly: 200,
  };

  beforeEach(() => {
    manager = new CostManager(budget);
  });

  it('should record cost', () => {
    const record = manager.recordCost({
      agentId: 'agent-1',
      model: 'claude-sonnet-4',
      inputTokens: 1000,
      outputTokens: 500,
    });

    expect(record.cost).toBeGreaterThan(0);
    expect(record.agentId).toBe('agent-1');
  });

  it('should generate cost report', () => {
    manager.recordCost({
      agentId: 'agent-1',
      model: 'claude-sonnet-4',
      inputTokens: 10000,
      outputTokens: 5000,
    });

    manager.recordCost({
      agentId: 'agent-2',
      model: 'zai/glm-5',
      inputTokens: 5000,
      outputTokens: 2000,
    });

    const report = manager.generateReport(7);

    expect(report.totalCost).toBeGreaterThan(0);
    expect(report.byAgent.size).toBe(2);
    expect(report.byModel.size).toBe(2);
  });

  it('should check budget', () => {
    const check = manager.checkBudget();
    
    expect(check.exceeded).toBe(false);
    expect(check.usage).toBe(0);
    expect(check.remaining).toBe(budget.daily);
  });

  it('should detect budget exceeded', () => {
    // 记录大量 token 消耗
    manager.recordCost({
      agentId: 'agent-1',
      model: 'claude-opus-4',
      inputTokens: 500000,
      outputTokens: 200000,
    });

    const check = manager.checkBudget();
    expect(check.exceeded).toBe(true);
  });

  it('should calculate optimization suggestions', () => {
    const agents: Agent[] = [
      {
        id: 'agent-1',
        name: 'Expensive Agent',
        model: 'claude-opus-4',
        runtime: 'acp',
        status: 'idle',
        skills: ['coding'],
        stats: {
          tasksCompleted: 10,
          successRate: 0.9,
          avgQuality: 8,
          tokensUsed: 100000,
          totalWorkTime: 100000,
        },
        createdAt: new Date(),
      },
    ];

    const suggestions = manager.getOptimizationSuggestions(agents);
    
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('should handle different models', () => {
    const claudeCost = manager.recordCost({
      agentId: 'a1',
      model: 'claude-sonnet-4',
      inputTokens: 1000,
      outputTokens: 500,
    });

    const glmCost = manager.recordCost({
      agentId: 'a2',
      model: 'zai/glm-5',
      inputTokens: 1000,
      outputTokens: 500,
    });

    // GLM should be cheaper
    expect(glmCost.cost).toBeLessThan(claudeCost.cost);
  });
});
