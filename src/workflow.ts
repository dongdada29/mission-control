/**
 * Workflow Engine - Define and execute complex workflows
 */

import { EventEmitter } from 'events';
import log from 'electron-log';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'task' | 'condition' | 'parallel' | 'wait' | 'transform';
  config: StepConfig;
  onSuccess?: string; // Next step ID
  onFailure?: string; // Next step ID on failure
}

export interface StepConfig {
  task?: {
    agent: string;
    description: string;
    skills?: string[];
    timeout?: number;
  };
  condition?: {
    expression: string;
    onTrue?: string;
    onFalse?: string;
  };
  parallel?: {
    steps: string[]; // Step IDs
    waitForAll?: boolean;
  };
  wait?: {
    duration: number; // ms
  };
  transform?: {
    template: string;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  startAt?: string; // Start step ID
  variables: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  variables: Record<string, any>;
  results: Record<string, any>;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private stepResults: Map<string, any> = new Map();

  constructor() {
    super();
    log.info('[WorkflowEngine] Initialized');
  }

  /**
   * Register workflow
   */
  register(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
    log.info(`[WorkflowEngine] Registered: ${workflow.name}`);
    this.emit('workflow:registered', workflow);
  }

  /**
   * Get workflow
   */
  get(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  /**
   * Get all workflows
   */
  getAll(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Execute workflow
   */
  async execute(workflowId: string, initialVars: Record<string, any> = {}): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}`,
      workflowId,
      status: 'running',
      variables: { ...workflow.variables, ...initialVars },
      results: {},
      startedAt: Date.now(),
    };

    this.executions.set(execution.id, execution);
    this.stepResults.clear();
    
    log.info(`[WorkflowEngine] Starting: ${workflow.name} (${execution.id})`);
    this.emit('execution:started', execution);

    try {
      await this.runSteps(workflow, execution);
      execution.status = 'completed';
      execution.completedAt = Date.now();
      
      log.info(`[WorkflowEngine] Completed: ${workflow.name} in ${execution.completedAt - execution.startedAt}ms`);
      this.emit('execution:completed', execution);
    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = Date.now();
      
      log.error(`[WorkflowEngine] Failed: ${workflow.name}`, error);
      this.emit('execution:failed', execution, error);
    }

    return execution;
  }

  /**
   * Run workflow steps
   */
  private async runSteps(workflow: Workflow, execution: WorkflowExecution): Promise<void> {
    let currentStepId = workflow.startAt || workflow.steps[0]?.id;
    
    while (currentStepId) {
      const step = workflow.steps.find(s => s.id === currentStepId);
      if (!step) break;

      execution.currentStep = currentStepId;
      this.emit('step:started', execution, step);

      try {
        const result = await this.executeStep(step, execution);
        this.stepResults.set(step.id, result);
        execution.results[step.id] = result;
        
        this.emit('step:completed', execution, step, result);
        
        // Determine next step
        currentStepId = step.onSuccess;
      } catch (error: any) {
        this.emit('step:failed', execution, step, error);
        
        if (step.onFailure) {
          currentStepId = step.onFailure;
        } else {
          throw error;
        }
      }

      // Check if workflow should stop
      if (execution.status !== 'running') break;
    }
  }

  /**
   * Execute single step
   */
  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const { type, config } = step;

    switch (type) {
      case 'task':
        return await this.executeTask(step, execution);
      
      case 'condition':
        return await this.executeCondition(step, execution);
      
      case 'parallel':
        return await this.executeParallel(step, execution);
      
      case 'wait':
        return await this.executeWait(step, execution);
      
      case 'transform':
        return this.executeTransform(step, execution);
      
      default:
        throw new Error(`Unknown step type: ${type}`);
    }
  }

  /**
   * Execute task step
   */
  private async executeTask(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const { task } = step.config;
    if (!task) throw new Error('Task config missing');

    // Simulate task execution
    log.info(`[WorkflowEngine] Executing task: ${task.description}`);
    
    // In real implementation, this would spawn an agent
    return {
      status: 'success',
      description: task.description,
      agent: task.agent,
    };
  }

  /**
   * Execute condition step
   */
  private async executeCondition(step: WorkflowStep, execution: WorkflowExecution): Promise<boolean> {
    const { condition } = step.config;
    if (!condition) throw new Error('Condition config missing');

    // Simple expression evaluation
    const vars = execution.variables;
    let expression = condition.expression;
    
    // Replace variables
    for (const [key, value] of Object.entries(vars)) {
      expression = expression.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), JSON.stringify(value));
    }

    const result = eval(expression); // Simple eval - in production use safer parser
    
    log.info(`[WorkflowEngine] Condition ${expression} = ${result}`);
    return result;
  }

  /**
   * Execute parallel steps
   */
  private async executeParallel(step: WorkflowStep, execution: WorkflowExecution): Promise<any[]> {
    const { parallel } = step.config;
    if (!parallel) throw new Error('Parallel config missing');

    const workflow = this.workflows.get(execution.workflowId)!;
    const steps = workflow.steps.filter(s => parallel.steps.includes(s.id));

    const promises = steps.map(s => this.executeStep(s, execution));
    const results = await Promise.all(promises);

    return results;
  }

  /**
   * Execute wait step
   */
  private async executeWait(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const { wait } = step.config;
    if (!wait) throw new Error('Wait config missing');

    log.info(`[WorkflowEngine] Waiting ${wait.duration}ms`);
    await new Promise(resolve => setTimeout(resolve, wait.duration));
  }

  /**
   * Execute transform step
   */
  private executeTransform(step: WorkflowStep, execution: WorkflowExecution): any {
    const { transform } = step.config;
    if (!transform) throw new Error('Transform config missing');

    let template = transform.template;
    const vars = { ...execution.variables, ...execution.results };

    // Replace variables in template
    for (const [key, value] of Object.entries(vars)) {
      template = template.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), JSON.stringify(value));
    }

    return JSON.parse(template);
  }

  /**
   * Cancel execution
   */
  cancel(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) return false;

    execution.status = 'cancelled';
    execution.completedAt = Date.now();
    
    log.info(`[WorkflowEngine] Cancelled: ${executionId}`);
    this.emit('execution:cancelled', execution);

    return true;
  }

  /**
   * Get execution
   */
  getExecution(id: string): WorkflowExecution | undefined {
    return this.executions.get(id);
  }

  /**
   * Get execution history
   */
  getHistory(workflowId?: string, limit: number = 20): WorkflowExecution[] {
    let executions = Array.from(this.executions.values());
    
    if (workflowId) {
      executions = executions.filter(e => e.workflowId === workflowId);
    }

    return executions
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }

  /**
   * Get stats
   */
  getStats(): {
    totalWorkflows: number;
    totalExecutions: number;
    running: number;
    completed: number;
    failed: number;
  } {
    const executions = Array.from(this.executions.values());
    
    return {
      totalWorkflows: this.workflows.size,
      totalExecutions: executions.length,
      running: executions.filter(e => e.status === 'running').length,
      completed: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
    };
  }

  /**
   * Delete workflow
   */
  delete(id: string): boolean {
    return this.workflows.delete(id);
  }
}

// Example workflows
export const EXAMPLE_WORKFLOWS: Workflow[] = [
  {
    id: 'ci-cd',
    name: 'CI/CD Pipeline',
    description: 'Build, test, and deploy',
    startAt: 'install',
    variables: {},
    steps: [
      {
        id: 'install',
        name: 'Install Dependencies',
        type: 'task',
        config: {
          task: { agent: 'worker', description: 'npm ci', timeout: 300000 },
        },
        onSuccess: 'lint',
      },
      {
        id: 'lint',
        name: 'Lint Code',
        type: 'task',
        config: {
          task: { agent: 'reviewer', description: 'npm run lint', timeout: 120000 },
        },
        onSuccess: 'test',
      },
      {
        id: 'test',
        name: 'Run Tests',
        type: 'task',
        config: {
          task: { agent: 'tester', description: 'npm test', timeout: 300000 },
        },
        onSuccess: 'build',
      },
      {
        id: 'build',
        name: 'Build',
        type: 'task',
        config: {
          task: { agent: 'worker', description: 'npm run build', timeout: 300000 },
        },
        onSuccess: 'deploy',
      },
      {
        id: 'deploy',
        name: 'Deploy',
        type: 'task',
        config: {
          task: { agent: 'worker', description: 'Deploy to production', timeout: 600000 },
        },
      },
    ],
  },
];
