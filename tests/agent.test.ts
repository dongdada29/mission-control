import { describe, it, expect, beforeEach } from 'vitest';
import { AgentManager } from '../src/agent.js';

describe('AgentManager', () => {
  let manager: AgentManager;

  beforeEach(() => {
    manager = new AgentManager();
  });

  it('should hire an agent', () => {
    const agent = manager.hire({
      id: 'agent-1',
      name: 'Claude Coder',
      skills: ['typescript', 'react'],
      model: 'claude-sonnet-4',
    });

    expect(agent.id).toBe('agent-1');
    expect(agent.status).toBe('idle');
    expect(agent.skills).toContain('typescript');
  });

  it('should fire an agent', () => {
    manager.hire({
      id: 'agent-1',
      name: 'Test',
      skills: [],
      model: 'claude',
    });

    expect(manager.fire('agent-1')).toBe(true);
    expect(manager.get('agent-1')).toBeUndefined();
  });

  it('should find agents by skill', () => {
    manager.hire({
      id: 'frontend',
      name: 'Frontend Dev',
      skills: ['react', 'typescript'],
      model: 'claude',
    });

    manager.hire({
      id: 'backend',
      name: 'Backend Dev',
      skills: ['rust', 'python'],
      model: 'glm',
    });

    const reactDevs = manager.findBySkill('react');
    expect(reactDevs).toHaveLength(1);
    expect(reactDevs[0].id).toBe('frontend');
  });

  it('should get idle agents', () => {
    manager.hire({
      id: 'idle-agent',
      name: 'Idle',
      skills: [],
      model: 'claude',
    });

    manager.hire({
      id: 'busy-agent',
      name: 'Busy',
      skills: [],
      model: 'claude',
    });

    manager.updateStatus('busy-agent', 'busy');

    const idle = manager.getIdle();
    expect(idle).toHaveLength(1);
    expect(idle[0].id).toBe('idle-agent');
  });

  it('should update agent stats', () => {
    manager.hire({
      id: 'agent-1',
      name: 'Test',
      skills: [],
      model: 'claude',
    });

    manager.updateStats('agent-1', {
      success: true,
      quality: 8,
      tokens: 1000,
      duration: 5000,
    });

    const agent = manager.get('agent-1');
    expect(agent?.stats.tasksCompleted).toBe(1);
    expect(agent?.stats.tokensUsed).toBe(1000);
    expect(agent?.stats.totalWorkTime).toBe(5000);
  });

  it('should get team stats', () => {
    manager.hire({ id: 'a1', name: 'A1', skills: [], model: 'claude' });
    manager.hire({ id: 'a2', name: 'A2', skills: [], model: 'glm' });

    manager.updateStatus('a1', 'busy');

    const stats = manager.getTeamStats();

    expect(stats.total).toBe(2);
    expect(stats.idle).toBe(1);
    expect(stats.busy).toBe(1);
  });

  it('should export and import agents', () => {
    manager.hire({
      id: 'agent-1',
      name: 'Test',
      skills: ['coding'],
      model: 'claude',
    });

    const exported = manager.export();

    const newManager = new AgentManager();
    newManager.import(exported);

    expect(newManager.getAll()).toHaveLength(1);
    expect(newManager.get('agent-1')?.name).toBe('Test');
  });
});
