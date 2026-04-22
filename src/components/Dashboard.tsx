import React from 'react';
import { 
  Users, 
  UserCheck, 
  ClipboardList, 
  TrendingUp, 
  Star, 
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

const MOCK_STATS = [
  { label: 'Total Active Staff', value: '1,157', trend: '+12%', type: 'up', icon: Users, color: 'blue' },
  { label: 'Available Now', value: '432', trend: '37%', type: 'neutral', icon: UserCheck, color: 'green' },
  { label: 'Active Patients', value: '842', trend: '+5%', type: 'up', icon: Activity, color: 'purple' },
  { label: 'Fulfillment Rate', value: '94.2%', trend: '+2%', type: 'up', icon: Zap, color: 'orange' },
];

const CATEGORY_DATA = [
  { name: 'Nurse', value: 450, color: '#2563eb' },
  { name: 'Attendant', value: 380, color: '#7c3aed' },
  { name: 'Caretaker', value: 210, color: '#0891b2' },
  { name: 'Baby Sitter', value: 85, color: '#db2777' },
  { name: 'Doctor', value: 32, color: '#ea580c' },
];

const AREA_DATA = [
  { area: 'Korangi', count: 180 },
  { area: 'Gulshan', count: 145 },
  { area: 'Malir', count: 120 },
  { area: 'Clifton', count: 95 },
  { area: 'North Nazimabad', count: 110 },
  { area: 'DHA', count: 85 },
];

const TREND_DATA = [
  { day: 'Mon', active: 780, pending: 45 },
  { day: 'Tue', active: 810, pending: 52 },
  { day: 'Wed', active: 805, pending: 38 },
  { day: 'Thu', active: 835, pending: 41 },
  { day: 'Fri', active: 842, pending: 29 },
  { day: 'Sat', active: 838, pending: 32 },
  { day: 'Sun', active: 842, pending: 25 },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MOCK_STATS.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center text-xs font-medium ${
                stat.type === 'up' ? 'text-green-600 bg-green-50' : 
                stat.type === 'down' ? 'text-red-600 bg-red-50' : 
                'text-slate-500 bg-slate-50'
              } px-2 py-1 rounded-full`}>
                {stat.type === 'up' && <ArrowUpRight className="w-3 h-3 mr-1" />}
                {stat.type === 'down' && <ArrowDownRight className="w-3 h-3 mr-1" />}
                {stat.trend}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Staff by Category */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-semibold text-lg text-slate-800">Staff Distribution</h3>
            <select className="text-sm bg-slate-100 border-none rounded-lg py-1 px-3">
              <option>All Categories</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CATEGORY_DATA}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {CATEGORY_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {CATEGORY_DATA.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-xs text-slate-500">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-lg text-slate-800 mb-8">Area Distribution (Karachi)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={AREA_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="area" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F1F5F9' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patient Trends */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-semibold text-lg text-slate-800">Operational Trends</h3>
            <div className="flex gap-2">
              <button className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600">Weekly</button>
              <button className="text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100">Monthly</button>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND_DATA}>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="active" stroke="#2563eb" fillOpacity={1} fill="url(#colorActive)" />
                <Line type="monotone" dataKey="pending" stroke="#db2777" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component for charts if needed
function Activity() { return <Users /> }
