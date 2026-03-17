import { describe, it, expect, beforeEach } from 'vitest';
import { LoadBalancer } from '../src/loadbalancer.js';
import type { Agent } from '../src/types.js';

describe('LoadBalancer', () => {
  let balancer: LoadBalancer;
  let agents: Agent[];

  beforeEach(() => {
    balancer = new LoadBalancer('least-tasks');
    agents = [
      {
        id: 'agent-1',
        name: 'Agent 1',
        skills: ['react', 'typescript'],
        model: 'claude-sonnet-4',
        runtime: 'acp',
        status: 'idle',
        stats: { tasksCompleted: 10, successRate: 0.9, avgQuality: 8, tokensUsed: 10000, totalWorkTime: 100000 },
        createdAt: new Date(),
      },
      {
        id: 'agent-2',
        name: 'Agent 2',
        skills: ['rust', 'backend'],
        model: 'glm',
        runtime: 'acp',
        status: 'idle',
        stats: { tasksCompleted: 5, successRate: 0.85, avgQuality: 7, tokensUsed: 5000, totalWorkTime: 50000 },
        createdAt: new Date(),
      },
      {
        id: 'agent-3',
        name: 'Agent 3',
        skills: ['react', 'testing'],
        model: 'claude-sonnet-4',
        runtime: 'acp',
        status: 'busy',
        stats: { tasksCompleted: 20, successRate: 0.95, avgQuality: 9, tokensUsed: 20000, totalWorkTime: 200000 },
        createdAt: new Date(),
      },
    ];
  });

  it('should select agent with least tasks', () => {
    const selected = balancer.selectAgent(agents);
    expect(selected?.id).toBe('agent-2'); // 5 tasks
  });

  it('should filter by skill', () => {
    const selected = balancer.selectAgent(agents, 'react');
    expect(selected?.skills).toContain('react');
  });

  it('should prefer idle agents', () => {
    const selected = balancer.selectAgent(agents);
    expect(selected?.status).toBe('idle');
  });

  it('should support round-robin', () => {
    balancer.setStrategy('round-robin');
    
    const first = balancer.selectAgent(agents);
    const second = balancer.selectAgent(agents);
    const third = balancer.selectAgent(agents);
    
    // Should cycle through idle agents
    expect(first).toBeDefined();
    expect(second).toBeDefined();
  });

  it('should get load distribution', () => {
    const distribution = balancer.getLoadDistribution(agents);
    
    expect(distribution).toHaveLength(3);
    expect(distribution[0].load).toBeGreaterThanOrEqual(0);
    expect(distribution[0].load).toBeLessThanOrEqual(1);
  });

  it('should get idle agents', () => {
    const idle = balancer.getIdleAgents(agents);
    expect(idle).toHaveLength(2);
    expect(idle.every(a => a.status === 'idle')).toBe(true);
  });

  it('should get busy agents', () => {
    const busy = balancer.getBusyAgents(agents);
    expect(busy).toHaveLength(1);
    expect(busy[0].status).toBe('busy');
  });

  it('should detect scaling need', () => {
    // 2/3 idle = 0.67 < 0.8
    expect(balancer.needsScaling(agents, 0.8)).toBe(false);
    
    // Mark 2 as busy
    agents[1].status = 'busy';
    agents[0].status = 'busy';
    
    // 2/3 busy = 0.67, threshold 0.5
    expect(balancer.needsScaling(agents, 0.5)).toBe(true);
  });
});
