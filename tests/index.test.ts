import { describe, it, expect, beforeEach } from 'vitest';
import { MissionControl, createMissionControl } from '../src/index.js';

describe('MissionControl', () => {
  let mc: MissionControl;

  beforeEach(() => {
    mc = createMissionControl();
  });

  it('should create workspace', () => {
    const ws = mc.createWorkspace({
      id: 'frontend',
      name: 'Frontend Team',
    });

    expect(ws.id).toBe('frontend');
  });

  it('should hire agent', () => {
    mc.createWorkspace({ id: 'team', name: 'Team' });

    const agent = mc.hireAgent('team', {
      id: 'dev-1',
      name: 'Developer',
      skills: ['typescript'],
      model: 'claude',
    });

    expect(agent).toBeDefined();
    expect(agent?.name).toBe('Developer');
  });

  it('should get stats', () => {
    mc.createWorkspace({ id: 'team', name: 'Team' });

    mc.hireAgent('team', {
      id: 'a1',
      name: 'A1',
      skills: [],
      model: 'claude',
    });

    const stats = mc.getStats('team');

    expect(stats?.total).toBe(1);
  });

  it('should export and import', () => {
    mc.createWorkspace({ id: 'team', name: 'Team' });
    mc.hireAgent('team', {
      id: 'dev',
      name: 'Dev',
      skills: [],
      model: 'claude',
    });

    const exported = mc.export();

    const newMc = createMissionControl();
    newMc.import(exported as any);

    expect(newMc.getWorkspaces()).toHaveLength(1);
    expect(newMc.getStats('team')?.total).toBe(1);
  });

  it('should manage multiple workspaces', () => {
    mc.createWorkspace({ id: 'frontend', name: 'Frontend' });
    mc.createWorkspace({ id: 'backend', name: 'Backend' });

    mc.hireAgent('frontend', {
      id: 'fe-dev',
      name: 'FE Dev',
      skills: ['react'],
      model: 'claude',
    });

    mc.hireAgent('backend', {
      id: 'be-dev',
      name: 'BE Dev',
      skills: ['rust'],
      model: 'glm',
    });

    const workspaces = mc.getWorkspaces();
    expect(workspaces).toHaveLength(2);

    expect(mc.getStats('frontend')?.total).toBe(1);
    expect(mc.getStats('backend')?.total).toBe(1);
  });
});
