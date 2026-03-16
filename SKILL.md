---
name: mission-control
description: 'Manage 100+ AI Agent digital employees. Use for: hiring agents, assigning tasks, scheduling work, monitoring status, or running a digital workforce.'
metadata:
  {
    "openclaw": { "emoji": "🎯", "requires": {} },
  }
---

# Mission Control Skill

管理 100+ AI Agent 数字员工

## 安装

```bash
npm install mission-control
```

## 快速开始

```typescript
import { MissionControl } from 'mission-control';

const mc = new MissionControl();

// 招聘员工
const dev = mc.hire('frontend-dev', 'worker', ['react']);
const reviewer = mc.hire('code-reviewer', 'reviewer', ['eslint']);

// 分配任务
await mc.assign(dev.id, {
  id: 'task-1',
  description: '实现登录页面',
  priority: 10,
  skills: ['react'],
  status: 'pending',
});

// 查看状态
console.log(mc.getStatus());
```

## 使用示例

### 示例 1: 招聘和管理团队

```typescript
import { MissionControl } from 'mission-control';

const mc = new MissionControl();

// 创建项目空间
mc.createWorkspace('myapp', '/path/to/myapp');

// 招聘团队成员
const frontend = mc.hire('frontend-dev', 'worker', ['react', 'typescript']);
const backend = mc.hire('backend-dev', 'worker', ['nodejs', 'express']);
const tester = mc.hire('qa-tester', 'reviewer', ['vitest', 'playwright']);
const coordinator = mc.hire('pm', 'coordinator', []);

// 查看团队
const agents = mc.getAgents();
console.log(agents.map(a => `${a.name}: ${a.status}`));

// 开除员工
mc.fire(frontend.id);
```

### 示例 2: 分配任务

```typescript
import { MissionControl } from 'mission-control';

const mc = new MissionControl();
const dev = mc.hire('worker1', 'worker', ['nodejs']);

// 分配具体任务
await mc.assign(dev.id, {
  id: 'task-api',
  description: '实现用户登录 API',
  priority: 10,
  skills: ['nodejs', 'express'],
  status: 'pending',
});

// 或让系统自动分配给最合适的 agent
await mc.assignBest({
  id: 'task-ui',
  description: '实现登录页面',
  priority: 8,
  skills: ['react'],
});
```

### 示例 3: 定时任务

```typescript
import { MissionControl, TaskScheduler } from 'mission-control';

const mc = new MissionControl();

// 添加定时任务
mc.schedule({
  id: 'daily-build',
  name: '每日构建',
  command: 'npm run build && npm run test',
  schedule: '0 2 * * *', // 每天凌晨 2 点
  enabled: true,
});

// 添加每小时任务
mc.schedule({
  id: 'hourly-check',
  name: '健康检查',
  command: 'npm run health-check',
  schedule: '0 * * * *', // 每小时
  enabled: true,
});

// 查看定时任务
const tasks = mc.getScheduledTasks();
console.log(tasks.map(t => `${t.name}: ${t.schedule}`));
```

### 示例 4: 记忆和学习

```typescript
import { AgentMemory } from 'mission-control';

const memory = new AgentMemory('/path/to/workspace/.mc');

// 记录错误学习
await memory.learnError(
  'agent-frontend',
  'React useEffect 无限循环',
  '添加依赖数组或使用 useCallback'
);

// 记住偏好
await memory.rememberPreference(
  'agent-frontend',
  'preferredLib',
  'react-query'
);

// 获取重要学习
const learnings = await memory.getLearnings('agent-frontend');
console.log(learnings);

// 查看统计
const stats = await memory.getStats();
console.log(stats);
```

### 示例 5: 通知系统

```typescript
import { NotificationSystem } from 'mission-control';

const notif = new NotificationSystem();

// 配置 Slack
notif.configureChannel('slack', 'slack', {
  url: 'https://hooks.slack.com/services/xxx',
});

// 发送通知
notif.notify('success', '构建完成', '所有测试通过');
notif.notify('error', '部署失败', '连接超时');
notif.notify('warning', '磁盘空间不足', '剩余 10%');

// 查看通知
const unread = notif.get(10, true); // 未读
console.log(unread);
```

### 示例 6: 工作流引擎

```typescript
import { WorkflowEngine } from 'mission-control';

const workflow = new WorkflowEngine();

// 注册工作流
workflow.register({
  id: 'ci-cd',
  name: 'CI/CD 流程',
  description: '构建、测试、部署',
  startAt: 'install',
  variables: {},
  steps: [
    {
      id: 'install',
      name: '安装依赖',
      type: 'task',
      config: {
        task: { agent: 'worker', description: 'npm ci' }
      },
      onSuccess: 'lint',
    },
    {
      id: 'lint',
      name: '代码检查',
      type: 'task',
      config: {
        task: { agent: 'reviewer', description: 'npm run lint' }
      },
      onSuccess: 'test',
    },
    {
      id: 'test',
      name: '测试',
      type: 'task',
      config: {
        task: { agent: 'worker', description: 'npm test' }
      },
    },
  ],
});

// 执行工作流
const result = await workflow.execute('ci-cd', {
  branch: 'main',
});

console.log(result.status); // 'completed' | 'failed'
```

### 示例 7: REST API

```typescript
import { createAPIServer, MissionControl } from 'mission-control';

const mc = new MissionControl();
const server = await createAPIServer(mc, 3000);

console.log('API 服务器运行在 http://localhost:3000');

// API 端点:
// GET  /api/status          - 系统状态
// GET  /api/agents          - 列出所有 Agent
// POST /api/agents          - 招聘新 Agent
// DELETE /api/agents/:id   - 开除 Agent
// POST /api/tasks          - 创建任务
// GET  /api/metrics         - 指标
// POST /api/webhook         - Webhook 入口
```

### 示例 8: 完整项目示例

```typescript
import { MissionControl } from 'mission-control';

async function main() {
  // 1. 初始化
  const mc = new MissionControl();
  
  // 2. 创建项目
  mc.createWorkspace('my-saas', '/projects/my-saas');
  
  // 3. 招聘团队
  const team = {
    frontend: mc.hire('frontend-dev', 'worker', ['react', 'typescript']),
    backend: mc.hire('backend-dev', 'worker', ['nodejs', 'postgresql']),
    tester: mc.hire('qa', 'reviewer', ['vitest', 'playwright']),
    researcher: mc.hire('tech-researcher', 'researcher', []),
  };
  
  // 4. 设置定时任务
  mc.schedule({
    id: 'nightly',
    name: '每日构建',
    command: 'npm run build && npm run test',
    schedule: '0 2 * * *',
    enabled: true,
  });
  
  // 5. 分配任务
  await mc.assign(team.frontend.id, {
    id: 'task-1',
    description: '实现用户管理界面',
    priority: 10,
    skills: ['react'],
  });
  
  // 6. 查看状态
  console.log(mc.getStatus());
}

main();
```

## CLI 命令

```bash
# 安装
npm install -g mission-control

# 列出所有 Agent
mc list

# 招聘新 Agent
mc hire frontend-dev worker react typescript
mc hire backend-api worker nodejs express
mc hire code-reviewer reviewer eslint

# 开除 Agent
mc fire frontend-dev

# 查看状态
mc status

# 定时任务
mc schedule list

# 工作流
mc run ci-cd
mc workflows

# 发送通知
mc notify success "构建完成" "全部测试通过"
```

## 核心模块

| 模块 | 功能 |
|------|------|
| **AgentPool** | 招聘/解雇/任务分配 |
| **TaskScheduler** | 定时任务/模板 |
| **AgentMemory** | 记忆学习/错误记录 |
| **Notification** | Slack/Discord/邮件通知 |
| **Metrics** | 指标追踪/统计分析 |
| **Workflow** | 复杂工作流引擎 |
| **Webhook** | 外部集成 |
| **APIServer** | REST API |

## Agent 类型

| 类型 | 用途 | 并发 |
|------|------|------|
| **worker** | 日常执行 | 5 |
| **reviewer** | 代码审查 | 3 |
| **coordinator** | 任务协调 | 1 |
| **researcher** | 调研分析 | 3 |
| **monitor** | 监控告警 | 1 |

## 规模化

| 阶段 | Agent 数量 | 管理方式 |
|------|-----------|----------|
| Start | 1-5 | 手动 |
| Scale | 5-20 | 分组 |
| Grow | 20-50 | 部门化 |
| Enterprise | 100+ | 自治化 |

---

*让 100 个数字员工为你干活*
