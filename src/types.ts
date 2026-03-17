/**
 * Mission Control - Digital Employee Management System
 * 
 * 让一个人类指挥官管理 100+ AI Agent 数字员工
 */

/**
 * Task definition
 */
export interface Task {
  id: string;
  agent: string;
  task: string;
  files: string[];
  priority?: 'high' | 'normal' | 'low';
  deps?: string[];
}

/**
 * Result from task execution
 */
export interface Result {
  taskId: string;
  success: boolean;
  output?: string;
  filesModified?: string[];
  tokensUsed?: number;
  duration?: number;
}

/**
 * Agent (员工) 配置
 */
export interface Agent {
  /** 员工 ID */
  id: string;
  /** 员工名称 */
  name: string;
  /** 技能标签 */
  skills: string[];
  /** 模型配置 */
  model: string;
  /** 运行时 */
  runtime: 'acp' | 'subagent';
  /** 状态 */
  status: 'idle' | 'busy' | 'offline';
  /** 当前任务 */
  currentTask?: string;
  /** 绩效统计 */
  stats: AgentStats;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * Agent 绩效统计
 */
export interface AgentStats {
  /** 完成任务数 */
  tasksCompleted: number;
  /** 成功率 */
  successRate: number;
  /** 平均质量分 */
  avgQuality: number;
  /** Token 消耗 */
  tokensUsed: number;
  /** 总工作时长 (ms) */
  totalWorkTime: number;
}

/**
 * Workspace (部门) 配置
 */
export interface Workspace {
  /** 部门 ID */
  id: string;
  /** 部门名称 */
  name: string;
  /** 部门描述 */
  description?: string;
  /** 部门员工 */
  agents: Map<string, Agent>;
  /** 部门技能库 */
  skills: string[];
  /** 部门知识库路径 */
  memoryPath?: string;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 任务分配选项
 */
export interface AssignOptions {
  /** 指定员工 ID */
  agentId?: string;
  /** 按技能匹配 */
  skill?: string;
  /** 选择工作负载最低的 */
  lowestWorkload?: boolean;
  /** 优先级 */
  priority?: 'high' | 'normal' | 'low';
}
