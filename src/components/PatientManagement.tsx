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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cat-overlay0" />
          <input 
            type="text" 
            placeholder="Search patients by name, area or phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-cat-mantle border border-cat-surface0 rounded-2xl text-sm focus:ring-2 focus:ring-cat-blue transition-all outline-none text-cat-text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-cat-mantle border border-cat-surface0 rounded-xl text-sm font-bold text-cat-subtext0 hover:bg-cat-surface0 transition-all uppercase tracking-widest">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-cat-blue text-cat-base rounded-xl text-sm font-bold hover:bg-cat-lavender transition-all shadow-lg shadow-cat-blue/20 uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            New Case
          </button>
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-cat-surface0 rounded-3xl animate-pulse" />
          ))
        ) : filteredPatients.length > 0 ? (
          filteredPatients.map(patient => (
            <div key={patient.id} className="bg-cat-mantle p-6 rounded-3xl border border-cat-surface0 shadow-sm hover:shadow-md transition-all relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-cat-mavue/10 rounded-2xl flex items-center justify-center text-cat-mauve">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-cat-text tracking-tight">{patient.full_name}</h3>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full block mt-1 w-fit",
                      patient.status === 'Active' ? "bg-cat-green/10 text-cat-green" :
                      patient.status === 'Pending' ? "bg-cat-yellow/10 text-cat-yellow" :
                      "bg-cat-surface0 text-cat-overlay2"
                    )}>
                      {patient.status}
                    </span>
                  </div>
                </div>
                <button className="text-cat-overlay0 hover:text-cat-text transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-cat-subtext0 font-medium tracking-tight">
                  <HeartPulse className="w-4 h-4 text-cat-peach" />
                  <span>{patient.primary_diagnosis || 'No diagnosis recorded'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-cat-subtext0 font-medium tracking-tight">
                  <Clock className="w-4 h-4 text-cat-sky" />
                  <span>{patient.service_type} • {patient.shift_type}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-cat-subtext0 font-medium tracking-tight">
                  <MapPin className="w-4 h-4 text-cat-red" />
                  <span>{patient.area_town}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-cat-blue font-bold font-mono tracking-tight">
                  <Phone className="w-4 h-4 text-cat-blue" />
                  <span>{formatPhoneNumber(patient.mobile_number || '')}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-cat-surface0 flex justify-between items-center">
                <span className="text-[10px] text-cat-overlay1 uppercase tracking-widest font-bold">Ref: {patient.id.slice(0, 8)}</span>
                <button className="text-xs font-bold text-cat-blue hover:text-cat-lavender transition-colors uppercase tracking-tighter">View Chart</button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-cat-overlay0">
            <HeartPulse className="w-20 h-20 mb-6 opacity-10" />
            <p className="text-xl font-bold text-cat-text">No Patient Cases</p>
            <p className="text-cat-subtext0 text-sm mt-1">Start by registering your first patient placement.</p>
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
              className="absolute inset-0 bg-cat-base/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-cat-mantle w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-cat-surface0"
            >
              <div className="p-6 border-b border-cat-surface0 flex justify-between items-center bg-cat-crust/50">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-cat-blue rounded-xl flex items-center justify-center text-cat-base shadow-lg shadow-cat-blue/20">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-cat-text text-lg tracking-tight">New Patient Registration</h3>
                    <p className="text-[10px] text-cat-subtext0 font-bold uppercase tracking-widest">Karachi Home Care Case</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center text-cat-overlay2 hover:bg-cat-surface0 hover:text-cat-text rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 max-h-[70vh] overflow-y-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 font-sans">
                    <label className="text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest ml-1">Patient Full Name</label>
                    <input 
                      required
                      type="text" 
                      className={cn(
                        "w-full px-4 py-3 border rounded-xl text-sm transition-all outline-none",
                        !formData.full_name 
                          ? "bg-cat-red/5 border-cat-red/30 focus:ring-2 focus:ring-cat-red" 
                          : "bg-cat-crust border-cat-surface1 text-cat-text focus:bg-cat-mantle focus:ring-2 focus:ring-cat-blue"
                      )}
                      placeholder="e.g. Mrs. Shamim Akhter"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest ml-1">Mobile Number</label>
                    <input 
                      required
                      type="text" 
                      className={cn(
                        "w-full px-4 py-3 border rounded-xl text-sm transition-all outline-none",
                        !formData.mobile_number 
                          ? "bg-cat-red/5 border-cat-red/30 focus:ring-2 focus:ring-cat-red" 
                          : "bg-cat-crust border-cat-surface1 text-cat-text focus:bg-cat-mantle focus:ring-2 focus:ring-cat-blue"
                      )}
                      placeholder="03XX-XXXXXXX"
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({...formData, mobile_number: formatPhoneNumber(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest ml-1">Service Type</label>
                    <select 
                      className="w-full px-4 py-3 bg-cat-crust border border-cat-surface1 rounded-xl text-sm focus:bg-cat-mantle focus:ring-2 focus:ring-cat-blue transition-all outline-none text-cat-text"
                      value={formData.service_type}
                      onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                    >
                      {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest ml-1">Shift Duration</label>
                    <select 
                      className="w-full px-4 py-3 bg-cat-crust border border-cat-surface1 rounded-xl text-sm focus:bg-cat-mantle focus:ring-2 focus:ring-cat-blue transition-all outline-none text-cat-text"
                      value={formData.shift_type}
                      onChange={(e) => setFormData({...formData, shift_type: e.target.value})}
                    >
                      {SHIFT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest ml-1">Karachi Area/Town</label>
                    <select 
                      className="w-full px-4 py-3 bg-cat-crust border border-cat-surface1 rounded-xl text-sm focus:bg-cat-mantle focus:ring-2 focus:ring-cat-blue transition-all outline-none text-cat-text"
                      value={formData.area_town}
                      onChange={(e) => setFormData({...formData, area_town: e.target.value})}
                    >
                      {KARACHI_TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest ml-1">Status</label>
                    <select 
                      className="w-full px-4 py-3 bg-cat-crust border border-cat-surface1 rounded-xl text-sm focus:bg-cat-mantle focus:ring-2 focus:ring-cat-blue transition-all outline-none text-cat-text"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="Pending">Pending Assignment</option>
                      <option value="Active">Active Case</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest ml-1">Medical Diagnosis</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-cat-crust border border-cat-surface1 rounded-xl text-sm focus:bg-cat-mantle focus:ring-2 focus:ring-cat-blue transition-all outline-none min-h-[80px] resize-none text-cat-text"
                      placeholder="Describe medical needs..."
                      value={formData.primary_diagnosis}
                      onChange={(e) => setFormData({...formData, primary_diagnosis: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest ml-1">Complete Address</label>
                    <textarea 
                      required
                      className={cn(
                        "w-full px-4 py-3 border rounded-xl text-sm transition-all outline-none min-h-[80px] resize-none",
                        !formData.complete_address 
                          ? "bg-cat-red/5 border-cat-red/30 focus:ring-2 focus:ring-cat-red" 
                          : "bg-cat-crust border-cat-surface1 text-cat-text focus:bg-cat-mantle focus:ring-2 focus:ring-cat-blue"
                      )}
                      placeholder="Floor, House #, Building, Street..."
                      value={formData.complete_address}
                      onChange={(e) => setFormData({...formData, complete_address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-6 py-3.5 border border-cat-surface1 text-cat-subtext1 rounded-2xl font-bold text-sm hover:bg-cat-surface0 transition-all uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-[2] px-6 py-3.5 bg-cat-blue text-cat-base rounded-2xl font-bold text-sm hover:bg-cat-lavender transition-all flex items-center justify-center gap-2 shadow-xl shadow-cat-blue/20 uppercase tracking-widest"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Register Case'
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
