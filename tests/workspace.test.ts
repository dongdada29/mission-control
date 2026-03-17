import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceManager } from '../src/workspace.js';

describe('WorkspaceManager', () => {
  let manager: WorkspaceManager;

  beforeEach(() => {
    manager = new WorkspaceManager();
  });

  it('should create a workspace', () => {
    const workspace = manager.create({
      id: 'frontend-team',
      name: 'Frontend Team',
      description: 'Frontend development department',
      skills: ['react', 'typescript'],
    });

    expect(workspace.id).toBe('frontend-team');
    expect(workspace.name).toBe('Frontend Team');
    expect(workspace.skills).toContain('react');
  });

  it('should delete a workspace', () => {
    manager.create({
      id: 'temp-team',
      name: 'Temp Team',
    });

    expect(manager.delete('temp-team')).toBe(true);
    expect(manager.get('temp-team')).toBeUndefined();
  });

  it('should hire agents to workspace', () => {
    manager.create({
      id: 'dev-team',
      name: 'Dev Team',
    });

    const agent = manager.hireAgent('dev-team', {
      id: 'dev-1',
      name: 'Developer 1',
      skills: ['typescript'],
      model: 'claude-sonnet-4',
    });

    expect(agent).toBeDefined();
    expect(agent?.id).toBe('dev-1');

    const workspace = manager.get('dev-team');
    expect(workspace?.agents.has('dev-1')).toBe(true);
  });

  it('should fire agents from workspace', () => {
    manager.create({
      id: 'dev-team',
      name: 'Dev Team',
    });

    manager.hireAgent('dev-team', {
      id: 'dev-1',
      name: 'Developer 1',
      skills: [],
      model: 'claude',
    });

    expect(manager.fireAgent('dev-team', 'dev-1')).toBe(true);

    const workspace = manager.get('dev-team');
    expect(workspace?.agents.has('dev-1')).toBe(false);
  });

  it('should get workspace stats', () => {
    manager.create({
      id: 'team',
      name: 'Team',
    });

    manager.hireAgent('team', {
      id: 'a1',
      name: 'A1',
      skills: [],
      model: 'claude',
    });

    manager.hireAgent('team', {
      id: 'a2',
      name: 'A2',
      skills: [],
      model: 'glm',
    });

    const stats = manager.getStats('team');

    expect(stats?.total).toBe(2);
    expect(stats?.idle).toBe(2);
  });

  it('should export and import workspace', () => {
    manager.create({
      id: 'team',
      name: 'Team',
      skills: ['coding'],
    });

    manager.hireAgent('team', {
      id: 'dev-1',
      name: 'Developer',
      skills: ['typescript'],
      model: 'claude',
    });

    const exported = manager.export('team');

    expect(exported).toBeDefined();
    expect(exported?.workspace.name).toBe('Team');
    expect(exported?.agents).toHaveLength(1);

    // Import to new manager
    const newManager = new WorkspaceManager();
    newManager.import(exported!);

    expect(newManager.getAll()).toHaveLength(1);
    expect(newManager.get('team')?.name).toBe('Team');
  });

  it('should get all workspaces', () => {
    manager.create({ id: 'team-1', name: 'Team 1' });
    manager.create({ id: 'team-2', name: 'Team 2' });

    const workspaces = manager.getAll();

    expect(workspaces).toHaveLength(2);
  });
});
