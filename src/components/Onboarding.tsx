import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  User, 
  CreditCard, 
  FileText, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Save,
  Plus,
  Clock
} from 'lucide-react';
import { extractStaffInfo, ExtractedStaffData } from '../services/ocrService';
import { supabase, Staff } from '../lib/supabase';
import { cn, formatPhoneNumber } from '../lib/utils';
import { KARACHI_TOWNS, STAFF_CATEGORIES } from '../constants';
import { motion } from 'motion/react';

interface OCRFile {
  file: File;
  preview: string;
  type: 'cnic' | 'form' | 'bill';
  status: 'pending' | 'extracting' | 'completed' | 'error';
}

export default function StaffOnboarding({ onComplete }: { onComplete: () => void }) {
  const [uploadedImages, setUploadedImages] = useState<OCRFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedStaffData | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentStaff, setRecentStaff] = useState<any[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [editingStaff, setEditingStaff] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Staff>>({});

  const fetchRecentStaff = async () => {
    setIsLoadingRecent(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentStaff(data || []);
    } catch (err) {
      console.error('Error fetching recent staff:', err);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleEditStaff = (staff: Staff) => {
    setEditingStaff(staff.id);
    setEditForm({ ...staff });
  };

  const handleSaveStaff = async () => {
    if (!editingStaff) return;

    try {
      const { error } = await supabase
        .from('staff')
        .update(editForm)
        .eq('id', editingStaff);

      if (error) throw error;
      setEditingStaff(null);
      setEditForm({});
      fetchRecentStaff(); // Refresh the table
    } catch (err) {
      console.error('Error updating staff:', err);
      alert('Failed to update staff member');
    }
  };

  const handleCancelEdit = () => {
    setEditingStaff(null);
    setEditForm({});
  };

  useEffect(() => {
    fetchRecentStaff();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImages(prev => [
          ...prev,
          {
            file,
            preview: reader.result as string,
            type: 'form', // Default type
            status: 'pending'
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'], 'application/pdf': ['.pdf'] },
    multiple: true 
  });

  const handleStartOCR = async () => {
    if (uploadedImages.length < 1) return;

    setIsProcessing(true);
    try {
      const imageData = uploadedImages.map(img => ({
        data: img.preview,
        mimeType: img.file.type
      }));

      const data = await extractStaffInfo(imageData);
      setExtractedData(data);
    } catch (error) {
      console.error('OCR Error:', error);
      alert('Failed to extract data. Please ensure the images are clear.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) return;
    setSaveStatus('saving');
    
    try {
      const { error } = await supabase.from('staff').insert([{
        full_name: extractedData.full_name,
        father_husband_name: extractedData.father_husband_name,
        cnic: extractedData.cnic,
        gender: extractedData.gender,
        religion: extractedData.religion,
        marital_status: extractedData.marital_status,
        guarantor_name: extractedData.guarantor_name,
        guarantor_contact: extractedData.guarantor_contact,
        category: extractedData.category || 'Nurse',
        designation: extractedData.category || 'Nurse',
        phone_primary: extractedData.phone_primary,
        whatsapp_number: extractedData.whatsapp_number,
        complete_address: extractedData.complete_address,
        area_town: (extractedData as any).area_town || 'Unknown',
        experience_years: extractedData.experience_years || 0,
        expected_salary: extractedData.expected_salary,
        shift_preference: extractedData.shift_preference,
        status: 'Available',
        is_verified: false,
        rating: 5.0
      }]);

      if (error) throw error;
      setSaveStatus('success');
      setErrorMessage(null);
      fetchRecentStaff(); // Refresh the table
      setTimeout(onComplete, 1500);
    } catch (error: any) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setErrorMessage(error.message || 'Unknown database error occurred.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {!extractedData ? (
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-cat-text">Batch Staff Onboarding</h2>
            <p className="text-cat-subtext0">Capture or upload 2-3 images (CNIC, Form, Bill) together to extract profile information.</p>
          </div>

          <div className="space-y-6">
            {/* Multi-file Dropzone */}
            <div 
              {...getRootProps()} 
              className={cn(
                "cursor-pointer rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-12 text-center transition-all",
                isDragActive ? "border-cat-blue bg-cat-blue/5" : "border-cat-surface1 bg-cat-mantle hover:border-cat-lavender hover:bg-cat-crust"
              )}
            >
              <input {...getInputProps({ capture: 'environment' } as any)} />
              <div className="w-16 h-16 bg-cat-lavender/20 rounded-2xl flex items-center justify-center text-cat-lavender mb-6">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-cat-text">Add Documents</h3>
              <p className="text-cat-overlay2 mt-2 max-w-sm">Tap to snap photos or drag images of CNIC, Form, and Utility Bill here.</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-cat-surface0" />
              <span className="text-xs font-bold text-cat-overlay0 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-cat-surface0" />
            </div>

            <div className="flex justify-center">
              <button 
                onClick={() => setExtractedData({
                  full_name: '',
                  cnic: '',
                  complete_address: '',
                  area_town: KARACHI_TOWNS[0],
                  phone_primary: '',
                  category: STAFF_CATEGORIES[0],
                  experience_years: 0
                } as any)}
                className="flex items-center gap-2 px-8 py-4 bg-cat-mantle border border-cat-surface0 text-cat-text rounded-2xl font-bold text-sm hover:bg-cat-crust transition-all shadow-sm shadow-cat-text/5"
              >
                <Plus className="w-5 h-5 text-cat-blue" />
                Fill Staff Form Manually
              </button>
            </div>

            {/* Preview Grid */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {uploadedImages.map((img, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={idx} 
                    className="relative aspect-square rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm group"
                  >
                    <img src={img.preview} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-[10px] text-white rounded-md font-bold uppercase">
                      Doc {idx + 1}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center pt-4">
            <button
              disabled={uploadedImages.length === 0 || isProcessing}
              onClick={handleStartOCR}
              className={cn(
                "flex items-center gap-2 px-10 py-4 rounded-2xl font-bold shadow-xl transition-all",
                uploadedImages.length > 0 && !isProcessing
                  ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Documents...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  Extract Staff Data
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-cat-mantle rounded-3xl border border-cat-surface0 shadow-xl overflow-hidden"
        >
          <div className="bg-cat-blue p-6 text-cat-base flex justify-between items-center shadow-lg shadow-cat-blue/20">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Review Extracted Data</h3>
              <p className="text-cat-base/80 text-sm font-medium">Please verify the details before saving to database.</p>
            </div>
            <button 
              onClick={() => setExtractedData(null)}
              className="w-10 h-10 flex items-center justify-center hover:bg-cat-base/10 rounded-xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="mx-8 mt-4 p-4 bg-cat-red/10 border border-cat-red/20 rounded-xl flex items-start gap-3 text-cat-red animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold uppercase tracking-tight">Database Error</p>
                <p className="font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField 
              label="Full Name" 
              value={extractedData.full_name} 
              onChange={(v) => setExtractedData(prev => ({ ...prev!, full_name: v }))} 
            />
            <DataField 
              label="Father / Husband Name" 
              value={extractedData.father_husband_name || ''} 
              onChange={(v) => setExtractedData(prev => ({ ...prev!, father_husband_name: v }))} 
            />
            <DataField 
              label="CNIC Number" 
              value={extractedData.cnic} 
              onChange={(v) => setExtractedData(prev => ({ ...prev!, cnic: v }))} 
            />
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest pl-1">Staff Category</label>
              <select 
                value={extractedData.category}
                onChange={(e) => setExtractedData(prev => ({ ...prev!, category: e.target.value }))}
                className={cn(
                  "w-full px-4 py-3 border rounded-xl text-sm transition-all outline-none",
                  (!extractedData.category || extractedData.category.toLowerCase() === 'unknown')
                    ? "bg-cat-red/5 border-cat-red/30 text-cat-red focus:ring-2 focus:ring-cat-red" 
                    : "bg-cat-crust border-cat-surface1 text-cat-text focus:bg-cat-mantle focus:ring-2 focus:ring-cat-lavender"
                )}
              >
                {STAFF_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(!extractedData.category || extractedData.category.toLowerCase() === 'unknown') && <p className="text-[10px] font-bold text-cat-red uppercase tracking-tighter pl-1 mt-1">* Required</p>}
            </div>
            <DataField
              label="Phone (03XX-XXXXXXX)"
              value={extractedData.phone_primary ? formatPhoneNumber(extractedData.phone_primary) : ''}
              onChange={(v: string) => setExtractedData(prev => ({ ...prev!, phone_primary: formatPhoneNumber(v) }))}
            />
            <DataField 
              label="Gender" 
              value={extractedData.gender} 
              onChange={(v) => setExtractedData(prev => ({ ...prev!, gender: v }))} 
            />
            <DataField 
              label="Religion" 
              value={extractedData.religion} 
              onChange={(v) => setExtractedData(prev => ({ ...prev!, religion: v }))} 
            />
            <DataField 
              label="Marital Status" 
              value={extractedData.marital_status} 
              onChange={(v) => setExtractedData(prev => ({ ...prev!, marital_status: v }))} 
            />
            <DataField
              label="Guarantor/Relative Name"
              value={extractedData.guarantor_name}
              onChange={(v) => setExtractedData(prev => ({ ...prev!, guarantor_name: v }))}
              optional={true}
            />
            <DataField
              label="Guarantor Contact (03XX-XXXXXXX)"
              value={extractedData.guarantor_contact ? formatPhoneNumber(extractedData.guarantor_contact) : ''}
              onChange={(v: string) => setExtractedData(prev => ({ ...prev!, guarantor_contact: formatPhoneNumber(v) }))}
              optional={true}
            />
            <DataField 
              label="Date of Birth" 
              value={extractedData.date_of_birth} 
              onChange={(v) => setExtractedData(prev => ({ ...prev!, date_of_birth: v }))} 
            />
            <DataField 
              label="Age" 
              value={extractedData.date_of_birth ? (new Date().getFullYear() - new Date(extractedData.date_of_birth).getFullYear()).toString() : ''} 
              onChange={() => {}} 
              disabled
            />
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Karachi Area/Town</label>
              <select 
                value={extractedData.area_town}
                onChange={(e) => setExtractedData(prev => ({ ...prev!, area_town: e.target.value }))}
                className={cn(
                  "w-full px-4 py-3 border rounded-xl text-sm transition-all outline-none",
                  (!extractedData.area_town || extractedData.area_town.toLowerCase() === 'unknown')
                    ? "bg-red-50 border-red-200 focus:ring-2 focus:ring-red-500" 
                    : "bg-slate-50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-500"
                )}
              >
                {KARACHI_TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {(!extractedData.area_town || extractedData.area_town.toLowerCase() === 'unknown') && <p className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">* Required</p>}
            </div>
            <div className="md:col-span-2">
              <DataField 
                label="Complete Address" 
                value={extractedData.complete_address} 
                onChange={(v) => setExtractedData(prev => ({ ...prev!, complete_address: v }))} 
                isTextArea
              />
            </div>
          </div>

          <div className="p-6 bg-cat-mantle/50 flex justify-end gap-4 border-t border-cat-surface0">
            <button 
              onClick={() => setExtractedData(null)}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-cat-subtext0 hover:bg-cat-surface0 hover:text-cat-text transition-all"
            >
              Discard
            </button>
            <button 
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={cn(
                "flex items-center gap-2 px-10 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95",
                saveStatus === 'success' ? "bg-cat-green text-cat-base" : "bg-cat-lavender text-cat-base hover:bg-cat-blue shadow-cat-lavender/20"
              )}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : saveStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Saved Successfully
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save to Database
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Recently Added Staff Table */}
      <div className="bg-cat-mantle rounded-3xl border border-cat-surface0 shadow-sm overflow-hidden mb-12">
        <div className="p-6 border-b border-cat-surface0 flex items-center justify-between bg-cat-crust/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cat-lavender/20 flex items-center justify-center text-cat-lavender">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-lg text-cat-text">Staff Records (Editable)</h3>
          </div>
          <button
            onClick={fetchRecentStaff}
            className="px-4 py-2 bg-cat-surface0 rounded-xl text-cat-text text-sm font-medium hover:bg-cat-surface1 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          {isLoadingRecent ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-cat-lavender" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cat-crust/30">
                  <th className="px-4 py-3 text-[10px] font-bold text-cat-subtext0 uppercase tracking-widest">Name</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-cat-subtext0 uppercase tracking-widest">CNIC</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-cat-subtext0 uppercase tracking-widest">Category</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-cat-subtext0 uppercase tracking-widest">Phone</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-cat-subtext0 uppercase tracking-widest">Area</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-cat-subtext0 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-cat-subtext0 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cat-surface0">
                {recentStaff.length > 0 ? (
                  recentStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-cat-surface0/30 transition-colors">
                      {editingStaff === staff.id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.full_name || ''}
                              onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                              className="w-full px-3 py-2 bg-cat-crust border border-cat-surface1 rounded-lg text-sm text-cat-text focus:ring-2 focus:ring-cat-blue outline-none"
                              placeholder="Full Name"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.cnic || ''}
                              onChange={(e) => setEditForm({...editForm, cnic: e.target.value})}
                              className="w-full px-3 py-2 bg-cat-crust border border-cat-surface1 rounded-lg text-sm text-cat-text focus:ring-2 focus:ring-cat-blue outline-none"
                              placeholder="CNIC"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={editForm.category || ''}
                              onChange={(e) => setEditForm({...editForm, category: e.target.value as Staff['category']})}
                              className="w-full px-3 py-2 bg-cat-crust border border-cat-surface1 rounded-lg text-sm text-cat-text focus:ring-2 focus:ring-cat-blue outline-none"
                            >
                              {STAFF_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.phone_primary || ''}
                              onChange={(e) => setEditForm({...editForm, phone_primary: formatPhoneNumber(e.target.value)})}
                              className="w-full px-3 py-2 bg-cat-crust border border-cat-surface1 rounded-lg text-sm text-cat-text focus:ring-2 focus:ring-cat-blue outline-none"
                              placeholder="03XX-XXXXXXX"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={editForm.area_town || ''}
                              onChange={(e) => setEditForm({...editForm, area_town: e.target.value})}
                              className="w-full px-3 py-2 bg-cat-crust border border-cat-surface1 rounded-lg text-sm text-cat-text focus:ring-2 focus:ring-cat-blue outline-none"
                            >
                              {KARACHI_TOWNS.map(town => (
                                <option key={town} value={town}>{town}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={editForm.status || ''}
                              onChange={(e) => setEditForm({...editForm, status: e.target.value as Staff['status']})}
                              className="w-full px-3 py-2 bg-cat-crust border border-cat-surface1 rounded-lg text-sm text-cat-text focus:ring-2 focus:ring-cat-blue outline-none"
                            >
                              <option value="Available">Available</option>
                              <option value="On Duty">On Duty</option>
                              <option value="On Leave">On Leave</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveStaff}
                                className="px-3 py-1 bg-cat-green text-cat-base rounded-lg text-xs font-bold hover:bg-cat-green/80 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 bg-cat-red text-cat-base rounded-lg text-xs font-bold hover:bg-cat-red/80 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-cat-text">{staff.full_name}</div>
                            <div className="text-[10px] text-cat-overlay1">{staff.father_husband_name}</div>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-cat-blue">{staff.cnic}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-cat-surface0 rounded text-xs font-bold text-cat-subtext1 uppercase">
                              {staff.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-cat-blue">
                            {formatPhoneNumber(staff.phone_primary || '')}
                          </td>
                          <td className="px-4 py-3 text-sm text-cat-subtext0">{staff.area_town}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                              staff.status === 'Available' ? 'bg-cat-green/20 text-cat-green' :
                              staff.status === 'On Duty' ? 'bg-cat-blue/20 text-cat-blue' :
                              staff.status === 'On Leave' ? 'bg-cat-yellow/20 text-cat-yellow' :
                              'bg-cat-red/20 text-cat-red'
                            }`}>
                              {staff.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleEditStaff(staff)}
                              className="px-3 py-1 bg-cat-lavender text-cat-base rounded-lg text-xs font-bold hover:bg-cat-blue transition-colors"
                            >
                              Edit
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-cat-overlay0 italic text-sm">
                      No staff records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function DataField({ label, value, onChange, isTextArea = false, disabled = false, optional = false }: any) {
  const isEmpty = !value || value.toString().trim() === '' || value.toString().toLowerCase() === 'unknown';

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-cat-overlay2 uppercase tracking-widest pl-1">{label}</label>
      {isTextArea ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={cn(
            "w-full px-4 py-3 border rounded-xl text-sm transition-all outline-none resize-none",
            isEmpty
              ? optional ? "bg-cat-surface0 border-cat-surface1 text-cat-subtext0" : "bg-cat-red/5 border-cat-red/30 text-cat-red focus:ring-2 focus:ring-cat-red"
              : "bg-cat-crust border-cat-surface1 text-cat-text focus:bg-cat-mantle focus:ring-2 focus:ring-cat-lavender"
          )}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full px-4 py-3 border rounded-xl text-sm transition-all outline-none",
            isEmpty
              ? optional ? "bg-cat-surface0 border-cat-surface1 text-cat-subtext0" : "bg-cat-red/5 border-cat-red/30 text-cat-red focus:ring-2 focus:ring-cat-red"
              : "bg-cat-crust border-cat-surface1 text-cat-text focus:bg-cat-mantle focus:ring-2 focus:ring-cat-lavender",
            disabled && "opacity-50 cursor-not-allowed bg-cat-mantle"
          )}
        />
      )}
      {isEmpty && (
        <p className={cn(
          "text-[10px] font-bold uppercase tracking-tighter pl-1 mt-1",
          optional ? "text-cat-subtext0" : "text-cat-red"
        )}>
          {optional ? "No Record" : "* Required / Missing Info"}
        </p>
      )}
    </div>
  );
}
