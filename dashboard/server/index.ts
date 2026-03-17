import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Mock data
const workspaces = [
  { id: 'frontend', name: 'Frontend Team', agents: 5, tasks: 128 },
  { id: 'backend', name: 'Backend Team', agents: 4, tasks: 96 },
  { id: 'devops', name: 'DevOps Team', agents: 3, tasks: 45 },
];

const agents = [
  { id: 'claude-1', name: 'Claude Developer', model: 'claude-sonnet-4', status: 'busy', tasks: 42, success: 0.95, workspaceId: 'frontend' },
  { id: 'glm-1', name: 'GLM Assistant', model: 'zai/glm-5', status: 'idle', tasks: 38, success: 0.92, workspaceId: 'backend' },
  { id: 'claude-2', name: 'Claude Reviewer', model: 'claude-sonnet-4', status: 'idle', tasks: 31, success: 0.97, workspaceId: 'frontend' },
  { id: 'deepseek-1', name: 'DeepSeek Coder', model: 'deepseek-v3', status: 'busy', tasks: 25, success: 0.89, workspaceId: 'backend' },
];

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Workspaces
app.get('/api/workspaces', (req, res) => {
  res.json(workspaces);
});

app.get('/api/workspaces/:id', (req, res) => {
  const ws = workspaces.find(w => w.id === req.params.id);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });
  res.json(ws);
});

app.post('/api/workspaces', (req, res) => {
  const { name } = req.body;
  const ws = { id: name.toLowerCase().replace(/\s+/g, '-'), name, agents: 0, tasks: 0 };
  workspaces.push(ws);
  res.status(201).json(ws);
});

// Agents
app.get('/api/agents', (req, res) => {
  const { workspaceId, status } = req.query;
  let filtered = agents;
  if (workspaceId) filtered = filtered.filter(a => a.workspaceId === workspaceId);
  if (status) filtered = filtered.filter(a => a.status === status);
  res.json(filtered);
});

app.get('/api/agents/:id', (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// Stats
app.get('/api/stats', (req, res) => {
  const totalAgents = agents.length;
  const busyAgents = agents.filter(a => a.status === 'busy').length;
  const totalTasks = agents.reduce((sum, a) => sum + a.tasks, 0);
  const avgSuccess = agents.reduce((sum, a) => sum + a.success, 0) / totalAgents;

  res.json({
    totalAgents,
    busyAgents,
    idleAgents: totalAgents - busyAgents,
    totalWorkspaces: workspaces.length,
    totalTasks,
    avgSuccess: avgSuccess.toFixed(3),
  });
});

// Performance (mock historical data)
app.get('/api/performance', (req, res) => {
  res.json([
    { name: 'Mon', tasks: 45, success: 42, avgTime: 3200 },
    { name: 'Tue', tasks: 52, success: 50, avgTime: 2800 },
    { name: 'Wed', tasks: 48, success: 46, avgTime: 3100 },
    { name: 'Thu', tasks: 61, success: 58, avgTime: 2900 },
    { name: 'Fri', tasks: 55, success: 53, avgTime: 2700 },
    { name: 'Sat', tasks: 23, success: 22, avgTime: 3500 },
    { name: 'Sun', tasks: 18, success: 17, avgTime: 3800 },
  ]);
});

// Cost (mock data)
app.get('/api/costs', (req, res) => {
  res.json({
    today: 16.60,
    week: 82.30,
    month: 312.50,
    budgetUsed: 78,
    byModel: [
      { name: 'Claude', cost: 12.50, tokens: 125000 },
      { name: 'GLM', cost: 2.30, tokens: 230000 },
      { name: 'DeepSeek', cost: 1.80, tokens: 180000 },
    ],
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Mission Control API running on http://localhost:${PORT}`);
});
