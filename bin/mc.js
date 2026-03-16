#!/usr/bin/env node

/**
 * Mission Control CLI
 * Full-featured command line interface
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { MissionControl, Agent } from '../src/index.js';
import { Metrics } from '../src/metrics.js';
import { NotificationSystem } from '../src/notification.js';
import { WorkflowEngine, EXAMPLE_WORKFLOWS } from '../src/workflow.js';

// Colors
const colors: Record<string, string> = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(msg: string, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function error(msg: string) {
  log(`Error: ${msg}`, 'red');
}

function success(msg: string) {
  log(msg, 'green');
}

// State
const CONFIG_DIR = join(homedir(), '.missioncontrol');
let mc: MissionControl;
let metrics: Metrics;
let notif: NotificationSystem;
let workflow: WorkflowEngine;

// Initialize
async function init() {
  await mkdir(CONFIG_DIR, { recursive: true });
  
  mc = new MissionControl();
  metrics = new Metrics();
  notif = new NotificationSystem();
  workflow = new WorkflowEngine();
  
  // Register example workflows
  for (const wf of EXAMPLE_WORKFLOWS) {
    workflow.register(wf);
  }
  
  log('🎯 Mission Control Ready\n', 'cyan');
}

// Commands
const commands: Record<string, (args: string[]) => Promise<void>> = {
  // Agent commands
  async hire(args) {
    const name = args[0];
    const type = (args[1] || 'worker') as Agent['type'];
    const skills = args.slice(2);
    
    const agent = mc.hire(name, type, skills);
    success(`✅ Hired: ${name} (${type})`);
    
    log(`   ID: ${agent.id}`, 'dim');
    log(`   Skills: ${skills.join(', ') || 'none'}`, 'dim');
  },
  
  async fire(args) {
    const name = args[0];
    const agents = mc.getAgents();
    const agent = agents.find(a => a.name === name);
    
    if (!agent) {
      error(`Agent not found: ${name}`);
      return;
    }
    
    mc.fire(agent.id);
    success(`❌ Fired: ${name}`);
  },
  
  async list(args) {
    const agents = mc.getAgents();
    
    log('\n🎯 Agents\n', 'cyan');
    log('═'.repeat(60), 'dim');
    
    if (agents.length === 0) {
      log('No agents. Use "mc hire <name> <type>" to hire one.\n', 'yellow');
      return;
    }
    
    for (const agent of agents) {
      const statusIcon = agent.status === 'idle' ? '⚪' : agent.status === 'busy' ? '🟡' : '🔴';
      const statusColor = agent.status === 'idle' ? 'dim' : agent.status === 'busy' ? 'yellow' : 'red';
      
      log(`\n${statusIcon} ${agent.name}`, 'bright');
      log(`   Type: ${agent.type}`, 'dim');
      log(`   Status: ${agent.status}`, statusColor);
      log(`   Skills: ${agent.skills.join(', ') || 'none'}`, 'dim');
      log(`   Tasks: ${agent.metrics.tasksCompleted} completed, ${agent.metrics.tasksFailed} failed`, 'dim');
    }
    
    log('\n' + '═'.repeat(60), 'dim');
    log(`Total: ${agents.length} agents\n`, 'cyan');
  },
  
  async status(args) {
    const status = mc.getStatus();
    
    log('\n📊 Status\n', 'cyan');
    log('═'.repeat(40), 'dim');
    
    log(`\n🧑 Agents`, 'bright');
    log(`   Total: ${status.pool.total}`, 'dim');
    log(`   Idle: ${status.pool.idle}`, 'green');
    log(`   Busy: ${status.pool.busy}`, 'yellow');
    
    log(`\n📅 Scheduled Tasks`, 'bright');
    log(`   Total: ${status.scheduler.total}`, 'dim');
    log(`   Enabled: ${status.scheduler.enabled}`, 'dim');
    
    log(`\n🏢 Workspaces: ${status.workspaces}`, 'dim');
    
    log('\n' + '═'.repeat(40) + '\n', 'dim');
  },
  
  // Task commands
  async schedule(args) {
    const subcmd = args[0];
    
    if (subcmd === 'list') {
      const tasks = mc.getScheduledTasks();
      
      log('\n📅 Scheduled Tasks\n', 'cyan');
      log('═'.repeat(50), 'dim');
      
      for (const task of tasks) {
        log(`\n${task.enabled ? '✅' : '❌'} ${task.name}`, 'bright');
        log(`   Command: ${task.command}`, 'dim');
        log(`   Schedule: ${task.schedule}`, 'dim');
        log(`   Status: ${task.status}`, 'dim');
      }
      
      log('\n' + '═'.repeat(50) + '\n', 'dim');
    } else {
      log('Usage: mc schedule list\n', 'dim');
    }
  },
  
  // Workflow commands
  async run(args) {
    const workflowId = args[0];
    
    if (!workflowId) {
      error('Usage: mc run <workflow-id>');
      return;
    }
    
    log(`🚀 Running workflow: ${workflowId}...`, 'cyan');
    
    const result = await workflow.execute(workflowId);
    
    if (result.status === 'completed') {
      success(`✅ Completed in ${result.completedAt! - result.startedAt}ms`);
    } else {
      error(`❌ Failed: ${result.error}`);
    }
  },
  
  async workflows(args) {
    const all = workflow.getAll();
    
    log('\n🔄 Workflows\n', 'cyan');
    log('═'.repeat(50), 'dim');
    
    for (const wf of all) {
      log(`\n📋 ${wf.name}`, 'bright');
      log(`   ${wf.description}`, 'dim');
      log(`   Steps: ${wf.steps.length}`, 'dim');
    }
    
    log('\n' + '═'.repeat(50) + '\n', 'dim');
  },
  
  // Metrics commands
  async metrics_cmd(args) {
    const subcmd = args[0];
    
    if (!subcmd || subcmd === 'list') {
      const summary = metrics.getSummary();
      
      log('\n📈 Metrics\n', 'cyan');
      log('═'.repeat(40), 'dim');
      
      for (const [name, value] of Object.entries(summary)) {
        log(`   ${name}: ${value}`, 'dim');
      }
      
      log('\n' + '═'.repeat(40) + '\n', 'dim');
    }
  },
  
  // Notification commands
  async notify(args) {
    const type = (args[0] || 'info') as 'info' | 'success' | 'warning' | 'error';
    const title = args[1] || 'Notification';
    const message = args.slice(2).join(' ') || 'No message';
    
    notif.notify(type, title, message);
    success(`📢 Notified: ${title}`);
  },
  
  // Help
  async help(args) {
    log(`
🎯 Mission Control CLI

Usage: mc <command> [options]

Commands:
  hire <name> [type] [skills...]   Hire a new agent
  fire <name>                       Fire an agent
  list, ls                          List all agents
  status                            Show status overview
  
  schedule list                     List scheduled tasks
  
  run <workflow-id>                Run a workflow
  workflows                        List workflows
  
  metrics list                      Show metrics
  notify <type> <title> <msg>     Send notification
  
  help                              Show this help

Examples:
  mc hire frontend-dev worker react typescript
  mc hire backend-api worker nodejs express
  mc hire code-reviewer reviewer eslint
  mc list
  mc status
  mc run ci-cd
  mc notify success "Build Complete" "All tests passed"

Types: worker, reviewer, coordinator, researcher, monitor
    `, 'cyan');
  },
};

// Parse and run
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'help';
  
  await init();
  
  if (commands[cmd]) {
    await commands[cmd](args.slice(1));
  } else {
    error(`Unknown command: ${cmd}`);
    log('Run "mc help" for usage\n', 'dim');
    process.exit(1);
  }
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});
