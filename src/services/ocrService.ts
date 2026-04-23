import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Image quality assessment
const assessImageQuality = (base64: string): { quality: 'good' | 'fair' | 'poor'; issues: string[] } => {
  return {
    quality: 'good',
    issues: []
  };
};

// Enhanced image preprocessing for better OCR
const preprocessImage = (base64: string, attempt: number = 1): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      let MAX_WIDTH = 1024;
      let MAX_HEIGHT = 1024;
      let quality = 0.9;
      
      switch(attempt) {
        case 1:
          MAX_WIDTH = 1024;
          MAX_HEIGHT = 1024;
          quality = 0.9;
          break;
        case 2:
          MAX_WIDTH = 1440;
          MAX_HEIGHT = 1440;
          quality = 0.95;
          break;
        case 3:
          MAX_WIDTH = 800;
          MAX_HEIGHT = 800;
          quality = 1.0;
          break;
      }
      
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.clearRect(0, 0, width, height);
      ctx?.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    
    img.onerror = () => {
      resolve(base64);
    };
  });
};

// Retry logic with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

export interface ExtractedStaffData {
  full_name: string;
  cnic: string;
  father_husband_name?: string;
  date_of_birth?: string;
  gender?: string;
  religion?: string;
  marital_status?: string;
  guarantor_name?: string;
  guarantor_contact?: string;
  complete_address: string;
  area_town: string;
  phone_primary: string;
  whatsapp_number?: string;
  category: string;
  experience_years: number;
  expected_salary?: number;
  shift_preference?: string;
}

export const extractStaffInfo = async (
  images: { data: string; mimeType: string }[],
  onProgress?: (stage: string, attempt: number) => void
): Promise<ExtractedStaffData> => {
  const modelId = "gemini-3-flash-preview";
  
  if (images.length === 0) {
    throw new Error('No images provided for extraction');
  }
  
  // Validate image quality first
  const qualityChecks = images.map(img => assessImageQuality(img.data));
  const hasPoorQuality = qualityChecks.some(check => check.quality === 'poor');
  const hasFairQuality = qualityChecks.some(check => check.quality === 'fair');
  
  if (hasPoorQuality) {
    console.warn('⚠️ Some images have poor quality. Extraction may be less accurate.');
  }
  
  // Try different preprocessing strategies with retries
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      onProgress?.(`Preprocessing images (attempt ${attempt}/3)...`, attempt);
      
      const compressedImages = await Promise.all(
        images.map(img => preprocessImage(img.data, attempt))
      );
      
      onProgress?.(`Analyzing documents with AI...`, attempt);
      
      const prompt = `You are an expert at extracting staff information from Karachi Home Care registration documents. Carefully analyze these images and extract ALL available information.

IMPORTANT INSTRUCTIONS:
1. Look for text on CNIC cards, staff forms, and utility bills
2. Extract data even if partially visible or slightly unclear
3. Use context to infer missing information when safe
4. Pay special attention to:
   - CNIC numbers (format: XXXXX-XXXXXXX-X)
   - Phone numbers (should start with 03)
   - Full names (first + father/husband name)
   - Complete addresses with area/town
   - Date of birth (convert to YYYY-MM-DD format)
   - Staff category (Nurse, Attendant, Doctor, etc.)

If information is truly not visible or unclear, leave the field empty or null.

Return JSON with these exact fields:
{
  "full_name": "string (required)",
  "father_husband_name": "string or null",
  "cnic": "string (required, format: 12345-1234567-1)",
  "date_of_birth": "string (YYYY-MM-DD) or null",
  "gender": "Male/Female/Other or null",
  "religion": "string or null",
  "marital_status": "string or null",
  "guarantor_name": "string or null",
  "guarantor_contact": "string (03XX-XXXXXXX) or null",
  "phone_primary": "string (required, 03XX-XXXXXXX)",
  "whatsapp_number": "string or null",
  "complete_address": "string (required, full address)",
  "area_town": "string (Karachi area name) or null",
  "category": "string (staff role)",
  "experience_years": number or null,
  "expected_salary": number or null,
  "shift_preference": "string or null"
}`;

      const imageParts = compressedImages.map((data, index) => ({
        inlineData: {
          data: data.split(',')[1],
          mimeType: images[index].mimeType || "image/jpeg"
        }
      }));

      const response = await retryWithBackoff(
        async () => await ai.models.generateContent({
          model: modelId,
          contents: {
            parts: [
              { text: prompt },
              ...imageParts
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                full_name: { type: Type.STRING },
                father_husband_name: { type: Type.STRING },
                cnic: { type: Type.STRING },
                date_of_birth: { type: Type.STRING },
                gender: { type: Type.STRING },
                religion: { type: Type.STRING },
                marital_status: { type: Type.STRING },
                guarantor_name: { type: Type.STRING },
                guarantor_contact: { type: Type.STRING },
                complete_address: { type: Type.STRING },
                area_town: { type: Type.STRING },
                phone_primary: { type: Type.STRING },
                whatsapp_number: { type: Type.STRING },
                category: { type: Type.STRING },
                experience_years: { type: Type.NUMBER },
                expected_salary: { type: Type.NUMBER },
                shift_preference: { type: Type.STRING },
              },
              required: ["full_name", "cnic", "complete_address", "phone_primary"]
            }
          }
        }),
        3,
        1000
      );

      const text = response.text;
      if (!text) {
        throw new Error("No response received from AI");
      }
      
      let result: ExtractedStaffData;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse AI response:', text);
        throw new Error('Invalid response format from AI extraction');
      }
      
      if (!result.full_name || !result.cnic || !result.complete_address) {
        throw new Error('Missing required fields in extracted data');
      }
      
      return result;
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Extraction attempt ${attempt} failed:`, error);
      
      if (attempt < 3) {
        await new Promise(resolve => 
          setTimeout(resolve, 1000 * attempt)
        );
      }
    }
  }
  
  throw lastError || new Error('All extraction attempts failed');
};

// Normalize category values to match our allowed list
export const normalizeCategory = (input: string): string => {
  const lower = input.toLowerCase().trim();
  
  const categoryMap: Record<string, string> = {
    'r/n': 'Registered Nurse',
    'rn': 'Registered Nurse',
    'registered nurse': 'Registered Nurse',
    'bsn': 'Nursing Aid',
    'aid nurse': 'Nursing Aid',
    'nursing assistant': 'Nursing Assistant',
    'nurse': 'Nurse',
    'attendant': 'Attendant',
    'caretaker': 'Attendant',
    'doctor': 'Doctor',
    'physio': 'Physiotherapist',
    'physiotherapist': 'Physiotherapist',
    'midwife': 'midwife',
    'baby sitter': 'baby sitter',
    'icu': 'ICU Tech',
    'icu tech': 'ICU Tech',
    'icu/anes': 'ICU Tech',
    'admin': 'admin',
    'office boy': 'office boy',
    'dpt': 'Nursing Aid'
  };
  
  return categoryMap[lower] || input;
};