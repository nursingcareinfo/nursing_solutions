import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Activity, 
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
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState([
    { label: 'Total Active Staff', value: '0', trend: '0%', type: 'neutral', icon: Users, color: 'blue' },
    { label: 'Available Now', value: '0', trend: '0%', type: 'neutral', icon: UserCheck, color: 'green' },
    { label: 'Active Patients', value: '0', trend: '0%', type: 'neutral', icon: Activity, color: 'purple' },
    { label: 'Fulfillment Rate', value: '0%', trend: '0%', type: 'neutral', icon: Zap, color: 'orange' },
  ]);

  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [areaData, setAreaData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardStats() {
      // 1. Total Staff
      const { count: totalStaff } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });

      // 2. Available Staff
      const { count: availableStaff } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Available');

      // 3. Active Patients
      const { count: activePatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');

      setStats([
        { label: 'Total Active Staff', value: (totalStaff || 0).toLocaleString(), trend: '+0%', type: 'up', icon: Users, color: 'blue' },
        { label: 'Available Now', value: (availableStaff || 0).toLocaleString(), trend: '0%', type: 'neutral', icon: UserCheck, color: 'green' },
        { label: 'Active Patients', value: (activePatients || 0).toLocaleString(), trend: '+0%', type: 'up', icon: Activity, color: 'purple' },
        { label: 'Fulfillment Rate', value: '0%', trend: '0%', type: 'neutral', icon: Zap, color: 'orange' },
      ]);

      // 4. Category Distribution
      const { data: catData } = await supabase.rpc('get_staff_by_category'); 
      // Note: If RPC not defined, we'd do a group by in SQL or fetch all and group (not ideal for 1k records)
      // For now, let's just use empty or simple fetch if RPS is missing
      if (catData) setCategoryData(catData);

      // 5. Area Distribution
      const { data: locData } = await supabase.rpc('get_staff_by_area');
      if (locData) setAreaData(locData);
    }

    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-xl bg-blue-50 text-blue-600`}>
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
          </div>
          <div className="h-[300px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#2563eb', '#7c3aed', '#0891b2', '#db2777', '#ea580c'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 italic">
                No staff data yet
              </div>
            )}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-lg text-slate-800 mb-8">Area Distribution (Karachi)</h3>
          <div className="h-[300px]">
            {areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="area" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 italic">
                No area data yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
