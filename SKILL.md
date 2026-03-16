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

## 概念

```
1 Workspace = 1 部门
1 Agent = 1 员工
1 Skill = 1 项技能

你 = Commander (CEO / 包工头)
```

## 架构

```
MissionControl
├── AgentPool      - 员工池 (招聘、解雇、状态)
├── TaskScheduler  - 定时任务
├── AgentMemory    - 记忆学习
└── Notification  - 通知系统
```

## Agent 类型

| 类型 | 用途 | 并发 |
|------|------|------|
| **worker** | 日常执行 | 5 |
| **reviewer** | 代码审查 | 3 |
| **coordinator** | 任务协调 | 1 |
| **researcher** | 调研分析 | 3 |
| **monitor** | 监控告警 | 1 |

## 核心模块

### AgentPool

```typescript
import { MissionControl, AgentPool, Agent } from 'mission-control';

// 初始化
const mc = new MissionControl();

// 招聘员工
const dev = mc.hire('frontend-dev', 'worker', ['react', 'typescript']);
const reviewer = mc.hire('code-reviewer', 'reviewer', ['eslint', 'security']);

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

### TaskScheduler

```typescript
// 定时任务
mc.schedule({
  id: 'daily-build',
  name: '每日构建',
  command: 'npm run build',
  schedule: '0 2 * * *', // 每天凌晨2点
  enabled: true,
});

// 或使用模板
const task = scheduler.createFromTemplate('daily-build', {
  projectPath: '/path/to/project',
});
```

### AgentMemory

```typescript
const memory = new AgentMemory('/path/to/workspace/.mc');

// 记录错误学习
await memory.learnError('agent-1', 'API timeout', 'Add retry with backoff');

// 记住偏好
await memory.rememberPreference('agent-1', 'preferredLib', 'react-query');

// 获取重要学习
const learnings = await memory.getLearnings('agent-1');
```

### Notification

```typescript
const notif = new NotificationSystem();

// 配置 Slack
notif.configureChannel('slack', 'slack', {
  url: 'https://hooks.slack.com/xxx',
});

// 发送通知
notif.notify('success', '构建完成', '项目构建成功');
notif.notify('error', '构建失败', '单元测试失败');
```

## CLI 命令

```bash
# 列出所有 Agent
missionctl list

# 招聘新 Agent
missionctl add frontend-dev worker

# 分配任务
missionctl assign frontend-dev "实现登录功能"

# 查看状态
missionctl status

# 查看定时任务
missionctl schedule list

# 查看通知
missionctl notifications
```

## 完整示例

```typescript
import { MissionControl } from 'mission-control';

// 1. 初始化
const mc = new MissionControl();

// 2. 创建项目空间
mc.createWorkspace('myapp', '/path/to/myapp');

// 3. 招聘团队
const frontend = mc.hire('frontend', 'worker', ['react']);
const backend = mc.hire('backend', 'worker', ['nodejs']);
const tester = mc.hire('tester', 'reviewer', ['vitest']);

// 4. 分配任务
await mc.assignBest({
  id: 'task-1',
  description: '实现 REST API',
  priority: 10,
  skills: ['nodejs'],
});

// 5. 设置定时任务
mc.schedule({
  id: 'nightly',
  name: 'Nightly Build',
  command: 'npm run build && npm run test',
  schedule: '0 2 * * *',
  enabled: true,
});

// 6. 查看状态
console.log(mc.getStatus());
```

## 任务流程

```
1. 接收任务
   ↓
2. 理解需求 → 拆分 → 规划
   ↓
3. 分配给合适的 Agent
   ↓
4. Agent 执行 (可并行)
   ↓
5. Reviewer 自检
   ↓
6. 返回结果
   ↓
7. 你验收 (通过/返工)
```

## 规模化

| 阶段 | Agent 数量 | 管理方式 |
|------|-----------|----------|
| Start | 1-5 | 手动 |
| Scale | 5-20 | 分组 |
| Grow | 20-50 | 部门化 |
| Enterprise | 100+ | 自治化 |

## 最佳实践

1. **任务要具体**: "实现登录" 比 "做前端" 好
2. **技能要匹配**: 让对的 Agent 做对的事
3. **及时验收**: 差的 Agent 要淘汰
4. **善用记忆**: 让 Agent 从错误中学习
5. **自动化**: 重复任务设定时

---

*让 100 个数字员工为你干活*
