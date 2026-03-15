#!/usr/bin/env node

/**
 * Mission Control CLI
 * 管理 100 个数字员工
 */

import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

const CONFIG_DIR = join(homedir(), '.missioncontrol');

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(msg: string, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function error(msg: string) {
  log(`Error: ${msg}`, 'red');
}

// Config
interface AgentConfig {
  name: string;
  type: string;
  runtime: string;
  model: string;
  skills: string[];
  status: 'active' | 'idle' | 'busy';
  tasks: number;
  createdAt: number;
}

interface MissionConfig {
  version: string;
  agents: Record<string, AgentConfig>;
  workspaces: Record<string, string>;
}

async function loadConfig(): Promise<MissionConfig> {
  const configPath = join(CONFIG_DIR, 'config.json');
  
  if (!existsSync(configPath)) {
    await mkdir(CONFIG_DIR, { recursive: true });
    const defaultConfig: MissionConfig = {
      version: '1.0',
      agents: {},
      workspaces: {},
    };
    await writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  
  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content);
}

async function saveConfig(config: MissionConfig): Promise<void> {
  const configPath = join(CONFIG_DIR, 'config.json');
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

// Commands
async function cmdList(args: string[]) {
  const config = await loadConfig();
  
  log('\n🎯 Mission Control Agents\n', 'cyan');
  log('═'.repeat(60), 'dim');
  
  if (Object.keys(config.agents).length === 0) {
    log('No agents yet. Use "missionctl add <name>" to hire one.\n', 'yellow');
    return;
  }
  
  for (const [name, agent] of Object.entries(config.agents)) {
    const statusColor = agent.status === 'active' ? 'green' : agent.status === 'busy' ? 'yellow' : 'dim';
    const statusIcon = agent.status === 'active' ? '🟢' : agent.status === 'busy' ? '🟡' : '⚪';
    
    log(`\n${statusIcon} ${name}`, 'bright');
    log(`   Type: ${agent.type}`, 'dim');
    log(`   Model: ${agent.model}`, 'dim');
    log(`   Status: ${agent.status}`, statusColor);
    log(`   Tasks: ${agent.tasks}`, 'dim');
    log(`   Skills: ${agent.skills.join(', ') || 'none'}`, 'dim');
  }
  
  log('\n' + '═'.repeat(60) + '\n', 'dim');
  log(`Total: ${Object.keys(config.agents).length} agents\n`, 'cyan');
}

async function cmdAdd(args: string[]) {
  const name = args[0];
  if (!name) {
    error('Usage: missionctl add <name> [type]');
    return;
  }
  
  const type = args[1] || 'worker';
  const config = await loadConfig();
  
  if (config.agents[name]) {
    error(`Agent "${name}" already exists`);
    return;
  }
  
  config.agents[name] = {
    name,
    type,
    runtime: 'acp',
    model: 'claude-sonnet-4',
    skills: [],
    status: 'idle',
    tasks: 0,
    createdAt: Date.now(),
  };
  
  await saveConfig(config);
  log(`✅ Hired new ${type}: ${name}`, 'green');
}

async function cmdRemove(args: string[]) {
  const name = args[0];
  if (!name) {
    error('Usage: missionctl remove <name>');
    return;
  }
  
  const config = await loadConfig();
  
  if (!config.agents[name]) {
    error(`Agent "${name}" not found`);
    return;
  }
  
  delete config.agents[name];
  await saveConfig(config);
  log(`❌ Fired agent: ${name}`, 'red');
}

async function cmdAssign(args: string[]) {
  const name = args[0];
  const task = args.slice(1).join(' ');
  
  if (!name || !task) {
    error('Usage: missionctl assign <agent> <task>');
    return;
  }
  
  const config = await loadConfig();
  
  if (!config.agents[name]) {
    error(`Agent "${name}" not found`);
    return;
  }
  
  config.agents[name].status = 'busy';
  config.agents[name].tasks++;
  await saveConfig(config);
  
  log(`📋 Assigned to ${name}: ${task}`, 'cyan');
  log(`   Agent is working...`, 'dim');
  
  // Simulate work (in real implementation, this would spawn the agent)
  setTimeout(async () => {
    config.agents[name].status = 'idle';
    await saveConfig(config);
    log(`✅ ${name} completed the task!`, 'green');
  }, 3000);
}

async function cmdStatus() {
  const config = await loadConfig();
  
  const agents = Object.values(config.agents);
  const active = agents.filter(a => a.status === 'active').length;
  const busy = agents.filter(a => a.status === 'busy').length;
  const idle = agents.filter(a => a.status === 'idle').length;
  const totalTasks = agents.reduce((sum, a) => sum + a.tasks, 0);
  
  log('\n📊 Mission Control Status\n', 'cyan');
  log('═'.repeat(40), 'dim');
  log(`   Total Agents: ${agents.length}`, 'bright');
  log(`   🟢 Active: ${active}`, 'green');
  log(`   🟡 Busy: ${busy}`, 'yellow');
  log(`   ⚪ Idle: ${idle}`, 'dim');
  log(`   Total Tasks: ${totalTasks}`, 'dim');
  log('═'.repeat(40) + '\n', 'dim');
}

async function cmdHelp() {
  log(`
🎯 Mission Control CLI

Usage: missionctl <command> [options]

Commands:
  list, ls              List all agents
  add <name> [type]     Hire a new agent
  remove <name>         Fire an agent
  assign <name> <task>  Assign a task to agent
  status                Show status overview
  help, --help          Show this help

Examples:
  missionctl list
  missionctl add frontend-dev worker
  missionctl assign frontend-dev "Fix the login bug"
  missionctl remove frontend-dev
  missionctl status

Alias: mc
`, 'cyan');
}

// Main
const commands: Record<string, (args: string[]) => Promise<void>> = {
  list: cmdList,
  ls: cmdList,
  add: cmdAdd,
  remove: cmdRemove,
  rm: cmdRemove,
  assign: cmdAssign,
  status: cmdStatus,
  help: cmdHelp,
};

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'help';
  
  if (cmd === 'mc') {
    // Alias
    await commands[args[1]]?.(args.slice(2)) || cmdHelp();
  } else {
    await commands[cmd]?.(args.slice(1)) || cmdHelp();
  }
}

main().catch(console.error);
