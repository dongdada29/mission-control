import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceManager } from '../src/performance.js';
import type { Agent } from '../src/types.js';

describe('PerformanceManager', () => {
  let manager: PerformanceManager;
  let mockAgent: Agent;

  beforeEach(() => {
    manager = new PerformanceManager();
    mockAgent = {
      id: 'agent-1',
      name: 'Test Agent',
      skills: ['coding'],
      model: 'claude-sonnet-4',
      runtime: 'acp',
      status: 'idle',
      stats: {
        tasksCompleted: 10,
        successRate: 0.9,
        avgQuality: 8,
        tokensUsed: 50000,
        totalWorkTime: 300000,
      },
      createdAt: new Date(),
    };
  });

  it('should generate performance report', () => {
    const report = manager.generateReport(mockAgent);

    expect(report.agentId).toBe('agent-1');
    expect(report.agentName).toBe('Test Agent');
    expect(report.rating).toBeDefined();
    expect(report.score).toBeGreaterThan(0);
    expect(report.recommendations).toBeDefined();
  });

  it('should calculate score correctly', () => {
    const report = manager.generateReport(mockAgent);

    // 成功率 90% * 40 = 36
    // 质量 8/10 * 30 = 24
    // 任务数 log10(11) * 10 ≈ 10.4
    // 总分应该 > 60
    expect(report.score).toBeGreaterThan(60);
  });

  it('should rate excellent for high performers', () => {
    mockAgent.stats = {
      tasksCompleted: 100,
      successRate: 0.98,
      avgQuality: 9.5,
      tokensUsed: 500000,
      totalWorkTime: 2000000,
    };

    const report = manager.generateReport(mockAgent);
    expect(report.rating).toBe('excellent');
  });

  it('should rate poor for low performers', () => {
    mockAgent.stats = {
      tasksCompleted: 5,
      successRate: 0.5,
      avgQuality: 4,
      tokensUsed: 10000,
      totalWorkTime: 100000,
    };

    const report = manager.generateReport(mockAgent);
    expect(report.rating).toBe('poor');
  });

  it('should generate team report', () => {
    const agents: Agent[] = [
      mockAgent,
      { ...mockAgent, id: 'agent-2', name: 'Agent 2', stats: { ...mockAgent.stats, tasksCompleted: 20 } },
    ];

    const report = manager.generateTeamReport(agents);

    expect(report.totalTasks).toBe(30);
    expect(report.topPerformers.length).toBeGreaterThan(0);
    expect(report.avgSuccessRate).toBeGreaterThan(0);
  });

  it('should record history', () => {
    manager.recordSnapshot(mockAgent);
    
    mockAgent.stats.tasksCompleted = 15;
    manager.recordSnapshot(mockAgent);

    const history = manager.getHistory('agent-1');
    expect(history).toHaveLength(2);
  });

  it('should generate recommendations', () => {
    mockAgent.stats.successRate = 0.7;
    mockAgent.stats.avgQuality = 5;

    const report = manager.generateReport(mockAgent);
    
    expect(report.recommendations.length).toBeGreaterThan(0);
  });
});
