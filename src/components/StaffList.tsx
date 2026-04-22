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
      // Fallback to sample data for demo
      const sample: Partial<Staff>[] = [
        { id: '1', full_name: 'Ahmed Khan', category: 'Nurse', area_town: 'Gulshan', rating: 4.8, is_available: true, is_verified: true, phone_primary: '+923001234567', created_at: new Date().toISOString() },
        { id: '2', full_name: 'Sara Malik', category: 'Caretaker', area_town: 'Clifton', rating: 4.5, is_available: false, is_verified: true, phone_primary: '+923117654321', created_at: new Date().toISOString() },
        { id: '3', full_name: 'Mohammad Ali', category: 'Doctor', area_town: 'DHA', rating: 5.0, is_available: true, is_verified: true, phone_primary: '+923229876543', created_at: new Date().toISOString() },
        { id: '4', full_name: 'Fatima Siddiqui', category: 'Attendant', area_town: 'Malir', rating: 4.2, is_available: true, is_verified: false, phone_primary: '+923334567890', created_at: new Date().toISOString() },
      ];
      setStaff(sample as Staff[]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.area_town.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Area', 'Phone', 'Rating', 'Status'];
    const rows = filteredStaff.map(s => [
      s.full_name,
      s.category,
      s.area_town,
      s.phone_primary,
      s.rating,
      s.is_available ? 'Available' : 'Assigned'
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, category or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Staff Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Verification</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Loading staff records...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No staff found matching your search.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase text-sm">
                          {person.full_name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-none mb-1">{person.full_name}</p>
                          <p className="text-xs text-slate-500">{person.phone_primary}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700">
                        {person.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 font-medium">{person.area_town}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Circle className={cn("w-2 h-2 fill-current", person.is_available ? "text-green-500" : "text-amber-500")} />
                        <span className="text-sm font-medium">
                          {person.is_available ? 'Available' : 'On Shift'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                        <span className="text-sm font-bold text-slate-700">{person.rating || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {person.is_verified ? (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 opacity-0 group-hover:opacity-100 bg-white border border-slate-100 rounded-lg shadow-sm hover:bg-slate-50 transition-all">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
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
