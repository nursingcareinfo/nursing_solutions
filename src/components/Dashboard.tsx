import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Activity, 
  TrendingUp, 
  Star, 
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle
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
  const [dataIssues, setDataIssues] = useState<{ staff: number; patients: number }>({ staff: 0, patients: 0 });
  const [recentStaff, setRecentStaff] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardStats() {
      // 1. Total Staff
      const { count: totalStaff } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });

      // Check for data issues in staff
      const { count: badStaff } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .or('phone_primary.not.ilike.03%,area_town.is.null');

      const { count: badPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .or('mobile_number.not.ilike.03%,area_town.is.null');

      setDataIssues({ staff: badStaff || 0, patients: badPatients || 0 });

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

      // 6. Recent Staff
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (staffData) setRecentStaff(staffData);
    }

    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Date Health Alert */}
      {(dataIssues.staff > 0 || dataIssues.patients > 0) && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-amber-900">Data Integrity Alert</h4>
            <p className="text-sm text-amber-700">
              Found <span className="font-bold">{dataIssues.staff} staff</span> and <span className="font-bold">{dataIssues.patients} patients</span> with formatting issues (invalid phones or missing areas).
            </p>
            <button className="mt-2 text-xs font-bold text-amber-600 underline hover:text-amber-800">
              Run AI Auto-Clean
            </button>
          </div>
        </div>
      )}

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

      {/* Recent Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-lg text-slate-800">Recently Added Staff</h3>
          <button className="text-xs font-bold text-blue-600 hover:underline">View All Directory</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Staff Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Area</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentStaff.length > 0 ? (
                recentStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {staff.full_name?.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900">{staff.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase">
                        {staff.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{staff.area_town}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          staff.status === 'Available' ? 'bg-green-500' : 'bg-amber-500'
                        }`} />
                        <span className="text-sm text-slate-600">{staff.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">{staff.phone_primary}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No staff records found in database
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
