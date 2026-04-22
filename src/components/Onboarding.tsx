import React, { useState, useCallback } from 'react';
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
  Save
} from 'lucide-react';
import { extractStaffInfo, ExtractedStaffData } from '../services/ocrService';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
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
      setTimeout(onComplete, 1500);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {!extractedData ? (
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Batch Staff Onboarding</h2>
            <p className="text-slate-500">Capture or upload 2-3 images (CNIC, Form, Bill) together to extract profile information.</p>
          </div>

          <div className="space-y-6">
            {/* Multi-file Dropzone */}
            <div 
              {...getRootProps()} 
              className={cn(
                "cursor-pointer rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-12 text-center transition-all",
                isDragActive ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
              )}
            >
              <input {...getInputProps({ capture: 'environment' } as any)} />
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Add Documents</h3>
              <p className="text-slate-400 mt-2 max-w-sm">Tap to snap photos or drag images of CNIC, Form, and Utility Bill here.</p>
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
          className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
        >
          <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">Review Extracted Data</h3>
              <p className="text-blue-100 text-sm">Please verify the details before saving to database.</p>
            </div>
            <button 
              onClick={() => setExtractedData(null)}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

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
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Staff Category</label>
              <select 
                value={extractedData.category}
                onChange={(e) => setExtractedData(prev => ({ ...prev!, category: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              >
                {STAFF_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <DataField 
              label="Phone (03XX-XXXXXXX)" 
              value={extractedData.phone_primary} 
              onChange={(v) => setExtractedData(prev => ({ ...prev!, phone_primary: v }))} 
            />
            <DataField 
              label="Gender" 
              value={extractedData.gender} 
              onChange={(v) => setExtractedData(prev => ({ ...prev!, gender: v }))} 
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              >
                {KARACHI_TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
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

          <div className="p-6 bg-slate-50 flex justify-end gap-4 border-t border-slate-100">
            <button 
              onClick={() => setExtractedData(null)}
              className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100"
            >
              Discard
            </button>
            <button 
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-all shadow-md active:scale-95"
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
    </div>
  );
}

function DataField({ label, value, onChange, isTextArea = false }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      {isTextArea ? (
        <textarea 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
        />
      ) : (
        <input 
          type="text" 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
        />
      )}
    </div>
  );
}
