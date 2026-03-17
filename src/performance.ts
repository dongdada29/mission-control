/**
 * Performance - Agent 绩效考核
 */

import type { Agent, AgentStats } from './types.js';

/**
 * 绩效报告
 */
export interface PerformanceReport {
  agentId: string;
  agentName: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    tasksCompleted: number;
    successRate: number;
    avgQuality: number;
    avgDuration: number;
    totalDuration: number;
  };
  rating: 'excellent' | 'good' | 'average' | 'poor';
  score: number; // 0-100
  recommendations: string[];
}

/**
 * 绩效管理器
 */
export class PerformanceManager {
  private history: Map<string, AgentStats[]> = new Map();

  /**
   * 记录快照
   */
  recordSnapshot(agent: Agent): void {
    const snapshots = this.history.get(agent.id) || [];
    snapshots.push({ ...agent.stats });
    this.history.set(agent.id, snapshots);
  }

  /**
   * 生成绩效报告
   */
  generateReport(agent: Agent, periodDays: number = 7): PerformanceReport {
    const end = new Date();
    const start = new Date(end.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const stats = agent.stats;
    
    // 计算评分
    const score = this.calculateScore(stats);
    
    // 生成评级
    let rating: PerformanceReport['rating'];
    if (score >= 90) rating = 'excellent';
    else if (score >= 70) rating = 'good';
    else if (score >= 50) rating = 'average';
    else rating = 'poor';

    // 生成建议
    const recommendations = this.generateRecommendations(stats, rating);

    return {
      agentId: agent.id,
      agentName: agent.name,
      period: { start, end },
      metrics: {
        tasksCompleted: stats.tasksCompleted,
        successRate: stats.successRate,
        avgQuality: stats.avgQuality,
        avgDuration: stats.tasksCompleted > 0 
          ? stats.totalWorkTime / stats.tasksCompleted 
          : 0,
        totalDuration: stats.totalWorkTime,
      },
      rating,
      score,
      recommendations,
    };
  }

  /**
   * 计算评分 (0-100)
   */
  private calculateScore(stats: AgentStats): number {
    let score = 0;

    // 成功率权重 40%
    score += stats.successRate * 40;

    // 质量分权重 30%
    score += (stats.avgQuality / 10) * 30;

    // 完成任务数权重 20% (对数缩放)
    const taskScore = Math.min(20, Math.log10(stats.tasksCompleted + 1) * 10);
    score += taskScore;

    // 效率权重 10% (假设平均每个任务 < 5min 为高效)
    if (stats.tasksCompleted > 0) {
      const avgDuration = stats.totalWorkTime / stats.tasksCompleted;
      const efficiency = Math.max(0, 10 - (avgDuration / 30000)); // 30s per task baseline
      score += efficiency;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(
    stats: AgentStats, 
    rating: PerformanceReport['rating']
  ): string[] {
    const recommendations: string[] = [];

    if (stats.successRate < 0.8) {
      recommendations.push('成功率较低，建议检查任务分配是否匹配技能');
    }

    if (stats.avgQuality < 6) {
      recommendations.push('质量分偏低，建议增加代码审查环节');
    }

    if (stats.tasksCompleted < 5) {
      recommendations.push('完成任务数较少，可能工作负载不足');
    }

    if (stats.tasksCompleted > 50 && stats.successRate > 0.9) {
      recommendations.push('表现优秀，可考虑分配更复杂的任务');
    }

    if (rating === 'poor') {
      recommendations.push('整体表现不佳，建议进行技能培训或调整岗位');
    }

    return recommendations;
  }

  /**
   * 生成团队报告
   */
  generateTeamReport(agents: Agent[]): {
    avgScore: number;
    topPerformers: string[];
    needsImprovement: string[];
    totalTasks: number;
    avgSuccessRate: number;
  } {
    if (agents.length === 0) {
      return {
        avgScore: 0,
        topPerformers: [],
        needsImprovement: [],
        totalTasks: 0,
        avgSuccessRate: 0,
      };
    }

    const scores = agents.map(a => ({
      id: a.id,
      name: a.name,
      score: this.calculateScore(a.stats),
    }));

    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const topPerformers = sorted.slice(0, 3).map(s => s.name);
    const needsImprovement = sorted.filter(s => s.score < 50).map(s => s.name);

    const totalTasks = agents.reduce((sum, a) => sum + a.stats.tasksCompleted, 0);
    const avgSuccessRate = agents.reduce((sum, a) => sum + a.stats.successRate, 0) / agents.length;

    return {
      avgScore,
      topPerformers,
      needsImprovement,
      totalTasks,
      avgSuccessRate,
    };
  }

  /**
   * 获取历史趋势
   */
  getHistory(agentId: string): AgentStats[] {
    return this.history.get(agentId) || [];
  }

  /**
   * 清除历史
   */
  clearHistory(agentId?: string): void {
    if (agentId) {
      this.history.delete(agentId);
    } else {
      this.history.clear();
    }
  }
}
