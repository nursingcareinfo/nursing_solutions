import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  ExternalLink,
  Star,
  Circle,
  RefreshCw,
  Zap,
  AlertCircle
} from 'lucide-react';
import { supabase, Staff } from '../lib/supabase';
import { cn, formatDate } from '../lib/utils';

export default function StaffList() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredStaff = staff.filter(person => {
    const matchesSearch = person.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         person.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         person.area_town?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || person.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Area', 'Phone', 'Rating', 'Status'];
    const rows = filteredStaff.map(s => [
      s.full_name,
      s.category,
      s.area_town,
      s.phone_primary,
      s.rating,
      s.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "karachi_staff_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cat-overlay0" />
          <input 
            type="text" 
            placeholder="Search by name, category or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-cat-mantle border border-cat-surface0 rounded-2xl text-sm focus:ring-2 focus:ring-cat-blue transition-all outline-none text-cat-text"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-cat-mantle border border-cat-surface0 rounded-xl text-sm font-bold text-cat-subtext0 outline-none focus:ring-2 focus:ring-cat-blue transition-all"
          >
            <option value="All">All Status</option>
            <option value="Available">Available</option>
            <option value="On Duty">On Duty</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-cat-blue text-cat-base rounded-xl text-sm font-bold hover:bg-cat-lavender transition-all shadow-lg shadow-cat-blue/20 uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      <div className="bg-cat-mantle rounded-3xl border border-cat-surface0 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-cat-crust border-b border-cat-surface0">
              <tr>
                <th className="px-6 py-5 text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest">Staff Details</th>
                <th className="px-6 py-5 text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest">Category</th>
                <th className="px-6 py-5 text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest">Location</th>
                <th className="px-6 py-5 text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest">Rating</th>
                <th className="px-6 py-5 text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest">Verification</th>
                <th className="px-6 py-5 text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cat-surface0">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-cat-overlay0">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-cat-blue" />
                    <p className="font-bold text-cat-subtext0 uppercase tracking-widest">Loading Records...</p>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-cat-overlay0">
                    <Zap className="w-10 h-10 mx-auto mb-4 opacity-20" />
                    No staff records found.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((person) => (
                  <tr key={person.id} className="hover:bg-cat-surface0/50 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-cat-blue/10 flex items-center justify-center font-bold text-cat-blue uppercase text-sm shadow-sm border border-cat-blue/10">
                          {person.full_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-cat-text tracking-tight">{person.full_name}</p>
                          <p className="text-xs text-cat-blue font-mono mt-0.5">{person.phone_primary}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-cat-lavender/10 text-cat-lavender uppercase tracking-widest">
                        {person.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-cat-subtext1 font-bold tracking-tight">{person.area_town}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Circle className={cn(
                          "w-2 h-2 fill-current", 
                          person.status === 'Available' ? "text-cat-green" : 
                          person.status === 'On Duty' ? "text-cat-blue" :
                          person.status === 'On Leave' ? "text-cat-yellow" :
                          "text-cat-overlay0"
                        )} />
                        <span className="text-sm font-bold text-cat-text">
                          {person.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-cat-yellow fill-current" />
                        <span className="text-sm font-bold text-cat-text">{person.rating || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {person.is_verified ? (
                        <div className="flex items-center gap-1.5 text-cat-green">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-cat-overlay1">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Pending</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 opacity-0 group-hover:opacity-100 bg-cat-mantle border border-cat-surface0 rounded-xl shadow-sm hover:bg-cat-surface0 transition-all text-cat-blue">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return <RefreshCw className={cn("animate-spin", className)} />;
}

function CheckCircle2({ className }: { className?: string }) {
  return <Zap className={className} />; 
}
