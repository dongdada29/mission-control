/**
 * Agent Memory - Persistent memory for agents
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import log from 'electron-log';

export interface MemoryEntry {
  id: string;
  agentId: string;
  type: 'session' | 'learning' | 'preference' | 'error';
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  importance: number; // 0-10
}

export interface MemoryQuery {
  agentId?: string;
  type?: string;
  tags?: string[];
  limit?: number;
}

export class AgentMemory {
  private basePath: string;
  private cache: Map<string, MemoryEntry[]> = new Map();

  constructor(basePath: string = '.missioncontrol/memory') {
    this.basePath = basePath;
  }

  /**
   * Initialize storage
   */
  async init(): Promise<void> {
    const dir = join(this.basePath, 'agents');
    await mkdir(dir, { recursive: true });
    log.info('[AgentMemory] Initialized at', this.basePath);
  }

  /**
   * Store memory
   */
  async store(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryEntry> {
    const fullEntry: MemoryEntry = {
      ...entry,
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const filePath = join(this.basePath, 'agents', `${entry.agentId}.json`);
    
    let entries = await this.loadAgent(entry.agentId);
    entries.push(fullEntry);
    
    // Keep only last 1000 entries per agent
    if (entries.length > 1000) {
      entries = entries.slice(-1000);
    }

    await writeFile(filePath, JSON.stringify(entries, null, 2));
    this.cache.set(entry.agentId, entries);

    log.info(`[AgentMemory] Stored: ${fullEntry.id} for agent ${entry.agentId}`);
    return fullEntry;
  }

  /**
   * Query memories
   */
  async query(query: MemoryQuery): Promise<MemoryEntry[]> {
    const agentId = query.agentId || 'default';
    const entries = await this.loadAgent(agentId);

    let results = entries;

    if (query.type) {
      results = results.filter(e => e.type === query.type);
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(e => 
        query.tags!.some(t => e.tags.includes(t))
      );
    }

    // Sort by importance and time
    results.sort((a, b) => {
      if (b.importance !== a.importance) {
        return b.importance - a.importance;
      }
      return b.updatedAt - a.updatedAt;
    });

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Learn from error
   */
  async learnError(agentId: string, error: string, fix: string): Promise<void> {
    await this.store({
      agentId,
      type: 'error',
      content: `Error: ${error}\nFix: ${fix}`,
      tags: ['error', 'learned'],
      importance: 8,
    });
  }

  /**
   * Remember preference
   */
  async rememberPreference(agentId: string, key: string, value: string): Promise<void> {
    await this.store({
      agentId,
      type: 'preference',
      content: `${key}: ${value}`,
      tags: ['preference', key],
      importance: 7,
    });
  }

  /**
   * Get important learnings
   */
  async getLearnings(agentId: string, limit: number = 10): Promise<MemoryEntry[]> {
    return this.query({
      agentId,
      type: 'error',
      limit,
    });
  }

  /**
   * Load agent memories
   */
  private async loadAgent(agentId: string): Promise<MemoryEntry[]> {
    if (this.cache.has(agentId)) {
      return this.cache.get(agentId)!;
    }

    const filePath = join(this.basePath, 'agents', `${agentId}.json`);
    
    if (!existsSync(filePath)) {
      return [];
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const entries = JSON.parse(content);
      this.cache.set(agentId, entries);
      return entries;
    } catch (error) {
      log.error('[AgentMemory] Error loading:', error);
      return [];
    }
  }

  /**
   * Export all memories
   */
  async export(): Promise<Record<string, MemoryEntry[]>> {
    const agentsDir = join(this.basePath, 'agents');
    const { readdir } = await import('fs/promises');
    
    const files = await readdir(agentsDir);
    const result: Record<string, MemoryEntry[]> = {};

    for (const file of files) {
      if (file.endsWith('.json')) {
        const agentId = file.replace('.json', '');
        result[agentId] = await this.loadAgent(agentId);
      }
    }

    return result;
  }

  /**
   * Clear agent memory
   */
  async clear(agentId: string): Promise<void> {
    this.cache.delete(agentId);
    const filePath = join(this.basePath, 'agents', `${agentId}.json`);
    const { rm } = await import('fs/promises');
    
    try {
      await rm(filePath);
      log.info(`[AgentMemory] Cleared memory for agent ${agentId}`);
    } catch {
      // File didn't exist
    }
  }

  /**
   * Get stats
   */
  async getStats(): Promise<{
    totalEntries: number;
    byType: Record<string, number>;
    byAgent: Record<string, number>;
  }> {
    const all = await this.export();
    
    const byType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    let totalEntries = 0;

    for (const [agentId, entries] of Object.entries(all)) {
      byAgent[agentId] = entries.length;
      totalEntries += entries.length;

      for (const entry of entries) {
        byType[entry.type] = (byType[entry.type] || 0) + 1;
      }
    }

    return { totalEntries, byType, byAgent };
  }
}
