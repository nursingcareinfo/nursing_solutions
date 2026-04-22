import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  MapPin, 
  Phone, 
  Clock, 
  User,
  HeartPulse,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';
import { supabase, Patient } from '../lib/supabase';
import { KARACHI_TOWNS } from '../constants';
import { cn, formatPhoneNumber } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const SERVICE_TYPES = ["Nursing care", "Patient Attendant", "Caretaker", "Baby Sitter", "Physiotherapy", "Doctor Visit"];
const SHIFT_TYPES = ["12 Hours (Day)", "12 Hours (Night)", "24 Hours", "Short Visit (2-4 hrs)", "Weekly"];

export default function PatientManagement() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Patient>>({
    full_name: '',
    mobile_number: '',
    area_town: KARACHI_TOWNS[0],
    service_type: SERVICE_TYPES[0],
    shift_type: SHIFT_TYPES[0],
    status: 'Pending',
    primary_diagnosis: '',
    complete_address: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('patients')
        .insert([formData]);

      if (error) throw error;
      setIsAddModalOpen(false);
      setFormData({
        full_name: '',
        mobile_number: '',
        area_town: KARACHI_TOWNS[0],
        service_type: SERVICE_TYPES[0],
        shift_type: SHIFT_TYPES[0],
        status: 'Pending',
        primary_diagnosis: '',
        complete_address: '',
      });
      fetchPatients();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save patient. Please check your Supabase table schema.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.area_town?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mobile_number?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search patients by name, area or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            New Patient Registration
          </button>
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          ))
        ) : filteredPatients.length > 0 ? (
          filteredPatients.map(patient => (
            <div key={patient.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{patient.full_name}</h3>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full block mt-1 w-fit",
                      patient.status === 'Active' ? "bg-green-50 text-green-600" :
                      patient.status === 'Pending' ? "bg-amber-50 text-amber-600" :
                      "bg-slate-50 text-slate-500"
                    )}>
                      {patient.status}
                    </span>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <HeartPulse className="w-4 h-4 text-slate-400" />
                  <span>{patient.primary_diagnosis || 'No diagnosis recorded'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{patient.service_type} • {patient.shift_type}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{patient.area_town}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{patient.mobile_number}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[11px] text-slate-400 uppercase tracking-wide">Registered {new Date(patient.created_at).toLocaleDateString()}</span>
                <button className="text-xs font-bold text-blue-600 hover:underline">View Medical Chart</button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
            <HeartPulse className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No patient records found</p>
            <p className="text-sm">Start by adding your first patient case.</p>
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">New Patient Registration</h3>
                    <p className="text-xs text-slate-500 tracking-wide">Enter case details for Karachi placement</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-600 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Full Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      placeholder="e.g. Mrs. Shamim Akhter"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile Number</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      placeholder="03XX-XXXXXXX"
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({...formData, mobile_number: formatPhoneNumber(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service Type Required</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      value={formData.service_type}
                      onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                    >
                      {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shift Duration</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      value={formData.shift_type}
                      onChange={(e) => setFormData({...formData, shift_type: e.target.value})}
                    >
                      {SHIFT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Karachi Area/Town</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      value={formData.area_town}
                      onChange={(e) => setFormData({...formData, area_town: e.target.value})}
                    >
                      {KARACHI_TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Initial Status</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="Pending">Pending Assignment</option>
                      <option value="Active">Active Case</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primary Diagnosis / Medical Needs</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none min-h-[80px]"
                      placeholder="e.g. Chronic Kidney Disease, needs dialysis support twice a week."
                      value={formData.primary_diagnosis}
                      onChange={(e) => setFormData({...formData, primary_diagnosis: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Complete Home Address</label>
                    <textarea 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none min-h-[80px]"
                      placeholder="Floor, House #, Building, Street..."
                      value={formData.complete_address}
                      onChange={(e) => setFormData({...formData, complete_address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-[2] px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving to Database...
                      </>
                    ) : (
                      'Register Patient'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
