import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Users, Briefcase, DollarSign, TrendingUp, Activity } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

// Types
interface Workspace {
  id: string;
  name: string;
  agents: number;
  tasks: number;
}

interface Agent {
  id: string;
  name: string;
  model: string;
  status: 'idle' | 'busy' | 'offline';
  tasks: number;
  success: number;
  workspaceId?: string;
}

interface Stats {
  totalAgents: number;
  busyAgents: number;
  idleAgents: number;
  totalWorkspaces: number;
  totalTasks: number;
  avgSuccess: string;
}

interface Performance {
  name: string;
  tasks: number;
  success: number;
  avgTime: number;
}

interface CostData {
  today: number;
  week: number;
  month: number;
  budgetUsed: number;
  byModel: { name: string; cost: number; tokens: number }[];
}

const statusColors: Record<string, string> = {
  idle: '#10b981',
  busy: '#f59e0b',
  offline: '#ef4444',
};

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

// Custom hook for API calls
function useApi<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}${endpoint}`)
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [endpoint]);

  return { data, loading, error };
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: stats } = useApi<Stats>('/stats');
  const { data: workspaces } = useApi<Workspace[]>('/workspaces');
  const { data: agents } = useApi<Agent[]>('/agents');
  const { data: performance } = useApi<Performance[]>('/performance');
  const { data: costs } = useApi<CostData>('/costs');

  if (!stats || !workspaces || !agents || !performance || !costs) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const totalTasks = agents.reduce((sum, a) => sum + a.tasks, 0);
  const avgSuccess = agents.reduce((sum, a) => sum + a.success, 0) / agents.length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-400">🚀 Mission Control</h1>
          <div className="flex gap-4">
            <span className="text-sm text-gray-400">Digital Employee Management</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 px-6">
        <div className="flex gap-6">
          {['overview', 'workspaces', 'agents', 'performance', 'cost'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Users className="w-6 h-6" />}
                label="Total Agents"
                value={stats.totalAgents}
                subtext={`${stats.busyAgents} busy`}
                color="indigo"
              />
              <StatCard
                icon={<Briefcase className="w-6 h-6" />}
                label="Workspaces"
                value={workspaces.length}
                subtext="departments"
                color="purple"
              />
              <StatCard
                icon={<Activity className="w-6 h-6" />}
                label="Tasks Completed"
                value={totalTasks}
                subtext="this week"
                color="green"
              />
              <StatCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Success Rate"
                value={`${(avgSuccess * 100).toFixed(1)}%`}
                subtext="average"
                color="yellow"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Tasks per Day">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                    <Bar dataKey="tasks" fill="#6366f1" name="Total" />
                    <Bar dataKey="success" fill="#10b981" name="Success" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Cost by Model">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costs.byModel}
                      dataKey="cost"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {costs.byModel.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Active Agents */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Active Agents</h3>
              <div className="space-y-3">
                {agents.map(agent => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: statusColors[agent.status] }}
                      />
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-sm text-gray-400">{agent.model}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{agent.tasks} tasks</p>
                      <p className="text-sm text-green-400">{(agent.success * 100).toFixed(0)}% success</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workspaces' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map(ws => (
              <div key={ws.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
                <h3 className="text-xl font-semibold mb-2">{ws.name}</h3>
                <p className="text-gray-400 mb-4">{ws.id}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{ws.agents} agents</span>
                  <span className="text-indigo-400">{ws.tasks} tasks</span>
                </div>
              </div>
            ))}
            <button className="bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-lg p-6 flex items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-400 transition-colors">
              + Add Workspace
            </button>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Model</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Tasks</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Success</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {agents.map(agent => (
                  <tr key={agent.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4">{agent.name}</td>
                    <td className="px-6 py-4 text-gray-400">{agent.model}</td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${statusColors[agent.status]}20`,
                          color: statusColors[agent.status],
                        }}
                      >
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{agent.tasks}</td>
                    <td className="px-6 py-4 text-green-400">{(agent.success * 100).toFixed(0)}%</td>
                    <td className="px-6 py-4">
                      <button className="text-indigo-400 hover:text-indigo-300 text-sm">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Weekly Performance</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                  <Legend />
                  <Line type="monotone" dataKey="tasks" stroke="#6366f1" name="Tasks" strokeWidth={2} />
                  <Line type="monotone" dataKey="success" stroke="#10b981" name="Success" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Top Performer</h4>
                <p className="text-2xl font-bold text-green-400">Claude Developer</p>
                <p className="text-sm text-gray-400">95% success rate</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Avg Response Time</h4>
                <p className="text-2xl font-bold text-yellow-400">3.1s</p>
                <p className="text-sm text-gray-400">per task</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Needs Improvement</h4>
                <p className="text-2xl font-bold text-red-400">0 agents</p>
                <p className="text-sm text-gray-400">below threshold</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cost' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-6">
                <DollarSign className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-sm text-gray-400">Today</p>
                <p className="text-2xl font-bold">${costs.today.toFixed(2)}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <p className="text-sm text-gray-400">This Week</p>
                <p className="text-2xl font-bold">${costs.week.toFixed(2)}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <p className="text-sm text-gray-400">This Month</p>
                <p className="text-2xl font-bold">${costs.month.toFixed(2)}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <p className="text-sm text-gray-400">Budget Used</p>
                <p className="text-2xl font-bold text-yellow-400">{costs.budgetUsed}%</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Cost by Model</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costs.byModel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                  <Bar dataKey="cost" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Optimization Suggestions</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-yellow-400">
                  <span>•</span>
                  <span>Consider using GLM-5 for simple tasks to reduce costs by 60%</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <span>•</span>
                  <span>Claude Opus usage is within budget limits</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Helper Components
function StatCard({ icon, label, value, subtext, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    indigo: 'text-indigo-400 bg-indigo-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    green: 'text-green-400 bg-green-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colorClasses[color]}`}>
        {icon}
      </div>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtext}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
