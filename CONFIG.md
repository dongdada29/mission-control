# Mission Control 配置

## 目录结构

```
mission-control/
├── .missioncontrol/
│   ├── config.yaml           # 主配置
│   ├── agents/              # Agent 定义
│   │   ├── worker.yaml
│   │   ├── reviewer.yaml
│   │   └── coordinator.yaml
│   ├── skills/              # 技能库
│   ├── memory/              # 记忆
│   └── workspaces/         # 工作区
├── scripts/                 # 脚本
├── templates/               # 模板
└── docs/                   # 文档
```

## 主配置

```yaml
# .missioncontrol/config.yaml
version: "1.0"

# 系统配置
system:
  name: "Mission Control"
  maxAgents: 100
  defaultTimeout: 300000
  retryAttempts: 3

# Agent 配置
agents:
  defaultRuntime: "acp"
  defaultModel: "claude-sonnet-4"
  
  types:
    - name: "worker"
      runtime: "acp"
      maxConcurrent: 10
    - name: "reviewer"
      runtime: "acp"
      maxConcurrent: 5
    - name: "coordinator"
      runtime: "acp"
      maxConcurrent: 1

# 资源限制
limits:
  maxQueueSize: 1000
  maxConcurrentTasks: 50
  maxMemory: "16GB"

# 监控
monitoring:
  enabled: true
  interval: 60000
  alerts:
    - name: "high-failure-rate"
      threshold: 0.3
      action: "notify"
    - name: "agent-timeout"
      threshold: 300000
      action: "retry"

# 通知
notifications:
  slack:
    enabled: false
    webhook: ""
  discord:
    enabled: false
    webhook: ""
  email:
    enabled: false
    smtp: ""
```

## Agent 定义

```yaml
# .missioncontrol/agents/worker.yaml
name: "worker"
description: "执行任务的 Worker Agent"

runtime: "acp"
model: "claude-sonnet-4"

capabilities:
  - coding
  - testing
  - file操作

limits:
  maxConcurrent: 10
  timeout: 300000

skills:
  - coding-agent
  - github
  - docs

prompts:
  system: |
    你是一个高效的开发者。
    专注于完成任务，不要多说话。
    代码要简洁、可测试。
    
  task: |
    任务: {task}
    
    要求:
    1. 先理解需求
    2. 写代码
    3. 写测试
    4. 自检
    
    开始吧。
```

```yaml
# .missioncontrol/agents/reviewer.yaml
name: "reviewer"
description: "代码审查 Agent"

runtime: "acp"
model: "claude-sonnet-4"

capabilities:
  - code-review
  - lint
  - security-scan

limits:
  maxConcurrent: 5
  timeout: 120000

skills:
  - github

prompts:
  system: |
    你是一个严格的代码审查员。
    发现问题要明确指出。
    不要放水。
    
  checklist: |
    - [ ] 代码可编译
    - [ ] 单元测试通过
    - [ ] 无明显 bug
    - [ ] 无硬编码敏感信息
    - [ ] 错误处理完整
```

```yaml
# .missioncontrol/agents/coordinator.yaml
name: "coordinator"
description: "任务协调 Agent"

runtime: "acp"
model: "claude-sonnet-4-20250514"

capabilities:
  - planning
  - delegation
  - result-aggregation

limits:
  maxConcurrent: 1
  timeout: 600000

prompts:
  system: |
    你是一个项目经理。
    负责拆分任务、分发任务、汇总结果。
    要清晰、有条理。
```

## Workspace 配置

```yaml
# .missioncontrol/workspaces/myapp.yaml
name: "myapp"
path: "/path/to/myapp"

description: "我的 Web 应用项目"

team:
  lead: "coordinator"
  members:
    - worker-frontend
    - worker-backend
    - reviewer

workflows:
  - name: "daily-build"
    schedule: "0 2 * * *"
    steps:
      - name: "install"
        command: "npm ci"
      - name: "test"
        command: "npm run test"
      - name: "build"
        command: "npm run build"

notifications:
  onFailure:
    - discord
  onSuccess:
    - slack
```

## CLI 命令

### Agent 管理

```bash
# 招一个新 Agent
missionctl agent create worker --name "frontend-dev"

# 列出所有 Agent
missionctl agent list

# 查看 Agent 状态
missionctl agent status frontend-dev

# 开除 Agent
missionctl agent kill frontend-dev

# 给 Agent 派任务
missionctl task assign frontend-dev "修复这个 bug"
```

### Workspace 管理

```bash
# 创建 Workspace
missionctl workspace create myapp --path /path/to/myapp

# 列出 Workspaces
missionctl workspace list

# 进入 Workspace
missionctl workspace use myapp
```

### 任务管理

```bash
# 创建任务
missionctl task create "开发用户模块"

# 查看任务队列
missionctl task queue

# 取消任务
missionctl task cancel task-123

# 查看任务结果
missionctl task result task-123
```

### 监控

```bash
# 查看状态
missionctl status

# 查看指标
missionctl metrics

# 查看日志
missionctl logs --agent frontend-dev

# 告警历史
missionctl alerts
```

---

## API

### REST API

```
GET    /api/agents              # 列出 Agent
POST   /api/agents              # 创建 Agent
GET    /api/agents/:id          # Agent 详情
DELETE /api/agents/:id          # 删除 Agent

POST   /api/tasks               # 创建任务
GET    /api/tasks               # 任务列表
GET    /api/tasks/:id           # 任务详情

GET    /api/metrics             # 指标
GET    /api/health              # 健康检查
```

### WebSocket

```
ws://localhost:18789/ws
```

事件:
- `agent:started`
- `agent:completed`
- `agent:failed`
- `task:created`
- `task:completed`
- `task:failed`
- `alert`
```

---

## 集成

### CI/CD

```yaml
# .github/workflows/mission-control.yml
name: "Mission Control"

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: "Deploy with Mission Control"
        run: |
          missionctl workspace use myapp
          missionctl task create "部署到生产"
```

### Git Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash
missionctl task create "代码检查" --blocking
```

---

## 模板

### 新项目模板

```bash
# 创建新项目
missionctl init myproject \
  --template webapp \
  --agents "frontend,backend,tester"
```

生成:

```
myproject/
├── .missioncontrol/
│   ├── config.yaml
│   └── agents/
│       ├── frontend.yaml
│       ├── backend.yaml
│       └── tester.yaml
├── src/
├── tests/
└── package.json
```
