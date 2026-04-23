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
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState<Array<{
    label: string;
    value: string;
    trend: string;
    type: string;
    icon: any;
    color: string;
  }>>([
    { label: 'Total Active Staff', value: '0', trend: '0%', type: 'neutral', icon: Users, color: 'blue' },
    { label: 'Available Now', value: '0', trend: '0%', type: 'neutral', icon: UserCheck, color: 'green' },
    { label: 'Active Patients', value: '0', trend: '0%', type: 'neutral', icon: Activity, color: 'mauve' },
    { label: 'Fulfillment Rate', value: '0%', trend: '0%', type: 'neutral', icon: Zap, color: 'peach' },
  ]);

  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [areaData, setAreaData] = useState<any[]>([]);
  const [dataIssues, setDataIssues] = useState<{ staff: number; patients: number }>({ staff: 0, patients: 0 });
  const [recentStaff, setRecentStaff] = useState<any[]>([]);
  const [aiQuota, setAiQuota] = useState({ used: 0, total: 1500 });

  useEffect(() => {
    async function fetchDashboardStats() {
      // 1. Total Staff
      const { count: totalStaffRaw } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });
      const totalStaff = Number(totalStaffRaw) || 0;

      // 2. Available Staff
      const { count: availableStaffRaw } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Available');
      const availableStaff = Number(availableStaffRaw) || 0;

      // 3. Active Patients
      const { count: activePatientsRaw } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');
      const activePatients = Number(activePatientsRaw) || 0;

      // 4. AI Quota (staff created today as proxy)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: aiUsedRaw } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      const aiUsed = Number(aiUsedRaw) || 0;

      setAiQuota({ used: aiUsed, total: 1500 });

      setStats([
        { label: 'Total Active Staff', value: totalStaff.toLocaleString(), trend: '+0%', type: 'up' as const, icon: Users, color: 'blue' },
        { label: 'Available Now', value: availableStaff.toLocaleString(), trend: '0%', type: 'neutral' as const, icon: UserCheck, color: 'green' },
        { label: 'Active Patients', value: activePatients.toLocaleString(), trend: '+0%', type: 'up' as const, icon: Activity, color: 'mauve' },
        { label: 'Fulfillment Rate', value: '0%', trend: '0%', type: 'neutral' as const, icon: Zap, color: 'peach' },
      ]);

      // 5. Data Integrity Check
      const { count: badStaffRaw } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .or('phone_primary.not.ilike.03%,area_town.is.null');
      const { count: badPatientsRaw } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .or('mobile_number.not.ilike.03%,area_town.is.null');

      setDataIssues({ staff: Number(badStaffRaw) || 0, patients: Number(badPatientsRaw) || 0 });

      // 6. Category Distribution (client-side aggregation)
      const { data: allStaff } = await supabase
        .from('staff')
        .select('category');

      if (allStaff) {
        const catCounts: Record<string, number> = {};
        allStaff.forEach(s => {
          const cat = s.category || 'Unknown';
          catCounts[cat] = (catCounts[cat] || 0) + 1;
        });
        const total = allStaff.length || 1;
        const catChartData = Object.entries(catCounts).map(([name, value]) => ({
          name,
          value,
          percentage: Math.round((value / total) * 100)
        })).sort((a, b) => b.value - a.value);
        setCategoryData(catChartData);
      }

      // 7. Area Distribution (client-side aggregation)
      const { data: allAreas } = await supabase
        .from('staff')
        .select('area_town')
        .not('area_town', 'is', null)
        .neq('area_town', '');

      if (allAreas) {
        const areaCounts: Record<string, number> = {};
        allAreas.forEach(s => {
          const area = s.area_town || 'Unknown';
          areaCounts[area] = (areaCounts[area] || 0) + 1;
        });
        const total = allAreas.length || 1;
        const areaChartData = Object.entries(areaCounts).map(([name, value]) => ({
          name,
          value,
          percentage: Math.round((value / total) * 100)
        })).sort((a, b) => b.value - a.value);
        setAreaData(areaChartData);
      }

      // 8. Recent Staff
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
      {/* AI Quota Indicator */}
      <div className="bg-cat-crust text-cat-text p-6 rounded-3xl overflow-hidden relative group border border-cat-surface0">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Zap className="w-32 h-32 text-cat-peach" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cat-peach">
              <Zap className="w-4 h-4 fill-current" />
              <span className="text-xs font-bold uppercase tracking-widest">Gemini 1.5 Flash Quota</span>
            </div>
            <h3 className="text-2xl font-bold">Remaining Daily Extractions</h3>
            <p className="text-cat-subtext0 text-sm">You have used {aiQuota.used} out of your {aiQuota.total} free daily OCR extractions.</p>
          </div>
          
          <div className="flex-1 max-w-md w-full space-y-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-cat-subtext1">{Math.round(((aiQuota.total - aiQuota.used) / aiQuota.total) * 100)}% Available</span>
              <span className="text-cat-overlay0">{aiQuota.total - aiQuota.used} left</span>
            </div>
            <div className="h-3 bg-cat-surface0 rounded-full overflow-hidden border border-cat-surface1/50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${((aiQuota.total - aiQuota.used) / aiQuota.total) * 100}%` }}
                className="h-full bg-gradient-to-r from-cat-peach to-cat-yellow rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Health Alert */}
      {(dataIssues.staff > 0 || dataIssues.patients > 0) && (
        <div className="bg-cat-peach/10 border border-cat-peach/20 p-4 rounded-2xl flex items-start gap-4">
          <div className="p-2 bg-cat-peach/20 rounded-xl text-cat-peach">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-cat-text">Data Integrity Alert</h4>
            <p className="text-sm text-cat-subtext0">
              Found <span className="font-bold text-cat-peach">{dataIssues.staff} staff</span> and <span className="font-bold text-cat-peach">{dataIssues.patients} patients</span> with formatting issues (invalid phones or missing areas).
            </p>
            <button className="mt-2 text-xs font-bold text-cat-blue underline hover:text-cat-lavender">
              Run AI Auto-Clean
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-cat-mantle p-6 rounded-3xl border border-cat-surface0 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2.5 rounded-2xl bg-cat-${stat.color}/20 text-cat-${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className={`text-xs font-bold uppercase tracking-widest ${
                stat.type === 'up' ? 'text-cat-green' : 
                stat.type === 'down' ? 'text-cat-red' : 'text-cat-overlay0'
              } px-2.5 py-1 rounded-full`}>
                {stat.trend}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-cat-subtext0 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-bold text-cat-text tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Staff by Category */}
        <div className="bg-cat-mantle p-6 rounded-3xl border border-cat-surface0 shadow-sm">
          <h3 className="font-bold text-lg text-cat-text mb-8">Staff Distribution</h3>
          <div className="h-[300px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                  >
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#1e66f5', '#8839ef', '#179287', '#ea76cb', '#fe640b'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    wrapperStyle={{ outline: 'none' }} 
                    contentStyle={{ backgroundColor: '#e6e9ef', border: '1px solid #ccd0da', borderRadius: '12px', fontWeight: 'bold' }} 
                    formatter={(value: any, name: any) => `${name}: ${value} (${categoryData.find(d => d.name === name)?.percentage || 0}%)`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-cat-overlay0 italic">
                No staff data yet
              </div>
            )}
          </div>
        </div>

        {/* Area Distribution */}
        <div className="bg-cat-mantle p-6 rounded-3xl border border-cat-surface0 shadow-sm">
          <h3 className="font-bold text-lg text-cat-text mb-8">Area Distribution (Karachi)</h3>
          <div className="h-[300px]">
            {areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccd0da" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#6c6f85', fontWeight: 'bold' }} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#6c6f85', fontWeight: 'bold' }} />
                  <Tooltip wrapperStyle={{ outline: 'none' }} contentStyle={{ backgroundColor: '#e6e9ef', border: '1px solid #ccd0da', borderRadius: '12px' }} cursor={{ fill: 'rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" fill="#1e66f5" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-cat-overlay0 italic">
                No area data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Staff Table */}
      <div className="bg-cat-mantle rounded-3xl border border-cat-surface0 shadow-sm overflow-hidden mb-12">
        <div className="p-6 border-b border-cat-surface0 flex items-center justify-between bg-cat-crust/50">
          <h3 className="font-bold text-lg text-cat-text">Recently Added Staff</h3>
          <button className="text-xs font-bold text-cat-blue hover:text-cat-lavender uppercase tracking-widest transition-colors">Directory</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-cat-crust/30">
                <th className="px-6 py-4 text-[10px] font-bold text-cat-subtext0 uppercase tracking-widest">Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-cat-subtext0 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-cat-subtext0 uppercase tracking-widest">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold text-cat-subtext0 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-cat-subtext0 uppercase tracking-widest">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cat-surface0">
              {recentStaff.length > 0 ? (
                recentStaff.map((staff: any) => (
                  <tr key={staff.id} className="hover:bg-cat-surface0/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cat-lavender/20 text-cat-lavender flex items-center justify-center font-bold text-xs shadow-sm">
                          {staff.full_name?.charAt(0)}
                        </div>
                        <span className="font-bold text-cat-text text-sm tracking-tight">{staff.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-cat-surface0 rounded-lg text-[10px] font-bold text-cat-subtext1 uppercase tracking-tighter">
                        {staff.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-cat-subtext0 font-medium">{staff.area_town}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          staff.status === 'Available' ? 'bg-cat-green shadow-[0_0_8px_rgba(64,160,43,0.4)]' : 'bg-cat-peach'
                        }`} />
                        <span className="text-xs font-bold text-cat-subtext1 uppercase tracking-tighter">{staff.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-cat-blue font-mono font-medium tracking-tight">{staff.phone_primary}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-cat-overlay0 italic text-sm">
                    No records found
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
