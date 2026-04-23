import { OpenAI } from 'openai';

// OpenRouter configuration
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENAI_API_KEY || '',
});

// ============================================
// CNIC VALIDATION & UTILITIES
// ============================================

export const isValidCNIC = (cnic: string): boolean => {
  const compact = cnic.replace(/-/g, '');
  return /^\d{13}$/.test(compact);
};

export const formatCNIC = (cnic: string): string => {
  const compact = cnic.replace(/\D/g, '');
  if (compact.length !== 13) return cnic;
  return `${compact.slice(0, 5)}-${compact.slice(5, 12)}-${compact.slice(12)}`;
};

export const getGenderFromCNIC = (cnic: string): 'Male' | 'Female' | null => {
  const compact = cnic.replace(/\D/g, '');
  if (compact.length !== 13) return null;
  const lastDigit = parseInt(compact[12], 10);
  return lastDigit % 2 === 0 ? 'Female' : 'Male';
};

// ============================================
// INTERFACE
// ============================================

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

interface ExtractionResult extends ExtractedStaffData {
  _confidence?: number;
  _errors?: string[];
  _warnings?: string[];
}

// ============================================
// MAIN EXTRACTION
// ============================================

/**
 * Extracts staff data from CNIC/Form images using OpenRouter (Gemini models)
 */
export const extractStaffInfo = async (
  images: { data: string; mimeType: string }[],
  onProgress?: (stage: string, attempt: number) => void
): Promise<ExtractedStaffData> => {
  
  if (images.length === 0) {
    throw new Error('No images provided. Please upload CNIC photos.');
  }

  onProgress?.('Reading document with AI...', 1);

  // Convert images to base64 properly (remove data:image/... prefix)
  const imageParts = images.map(img => {
    const base64 = img.data.includes(',') ? img.data.split(',')[1] : img.data;
    return {
      type: 'image_url' as const,
      image_url: { url: `data:${img.mimeType || 'image/jpeg'};base64,${base64}` }
    };
  });

  const prompt = `You are a Pakistani CNIC/ID document data extraction expert.

IMPORTANT: You are analyzing REAL-WORLD photos of:
- Pakistani CNIC (Computerized National Identity Card)
- Staff registration forms
- Utility bills for address verification

COMMON ISSUES IN PHOTOS:
- Glare spots from laminated plastic cards
- Urdu text mixed with English
- Blurry or angled text
- Shadows and poor lighting

Extract ONLY what you can clearly read. Skip unclear fields.

PAKISTANI CNIC STRUCTURE:
Front side: Name (English + Urdu), Father/Husband Name, Gender (M/F), Date of Birth (DD/MM/YYYY), CNIC Number, Issue/Expiry dates
Back side: Present Address, Permanent Address

DOCUMENT FIELD FORMATS:
- CNIC: XXXXX-XXXXXXX-X (13 digits with dashes)
- Phone: 03XX-XXXXXXX (11 digits starting with 03)
- Date of Birth: Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
- Category: One of: Nurse, Registered Nurse, Attendant, Doctor, Physiotherapist, Midwife, Baby Sitter, Nursing Assistant, ICU Tech, Admin, Office Boy, Nursing Aid

Urdu Translations:
- "نام" = Name
- "والد/شوہر کا نام" = Father/Husband Name
- "تاریخِ پیدائش" = Date of Birth
- "پتّہ" = Address

OUTPUT FORMAT: Return ONLY valid JSON (no markdown, no extra text):
{
  "full_name": "Muhammad Ahmed Khan" (REQUIRED),
  "father_husband_name": "Ahmed Khan" or null,
  "cnic": "35202-1234567-1" or "",
  "date_of_birth": "1990-05-15" or null,
  "gender": "Male" or "Female" or null,
  "religion": "Islam" or null,
  "marital_status": "Married" or null,
  "guarantor_name": null (usually not on CNIC),
  "guarantor_contact": null,
  "complete_address": "House 12, Street 5, Gulshan-e-Iqbal, Karachi" (REQUIRED),
  "area_town": "Gulshan-e-Iqbal" or null,
  "phone_primary": "0301-2345678" or "",
  "whatsapp_number": null or same as phone,
  "category": "Nurse" or other from list,
  "experience_years": 5 or null,
  "expected_salary": 50000 or null,
  "shift_preference": "Morning" or null
}

If image is too blurry, leave unclear fields as empty string/null.`;

  try {
    // Try Gemini 2.0 Flash via OpenRouter
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.0-flash-exp:free', // OpenRouter free tier
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...imageParts
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000
    });

    const text = response.choices?.[0]?.message?.content || '';
    
    if (!text) {
      throw new Error("No response from AI — image may be too blurry or unclear");
    }

    let data: ExtractionResult;
    try {
      // Clean markdown if present
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      data = JSON.parse(cleaned);
    } catch {
      console.error('Raw AI response:', text);
      throw new Error('AI returned invalid format. Try uploading a clearer image.');
    }

    // Validate and clean fields
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.full_name || data.full_name.trim().length < 2) {
      errors.push('Name not detected — please enter manually');
    }

    if (!data.cnic || !isValidCNIC(data.cnic)) {
      errors.push('CNIC not detected or invalid format — please enter 13-digit CNIC');
    } else {
      data.cnic = formatCNIC(data.cnic);
    }

    if (!data.complete_address || data.complete_address.trim().length < 5) {
      errors.push('Address not detected — please enter complete address');
    }

    if (!data.phone_primary || !/^03\d{2}-\d{7}$/.test(data.phone_primary)) {
      warnings.push('Phone number format incorrect — should be 03XX-XXXXXXX');
    }

    // Auto-detect area from address if missing
    if (!data.area_town && data.complete_address) {
      data.area_town = detectKarachiArea(data.complete_address);
    }

    // Infer gender from CNIC if missing
    if (!data.gender && data.cnic) {
      const inferred = getGenderFromCNIC(data.cnic);
      if (inferred) data.gender = inferred;
    }

    // Attach confidence/errors for UI
    (data as any)._confidence = estimateConfidence(data, errors);
    (data as any)._errors = errors;
    (data as any)._warnings = warnings;

    if (errors.length > 0) {
      console.warn('Extraction issues:', errors);
    }

    return data;

  } catch (error: any) {
    console.error('Extraction failed:', error);
    
    let msg = `Could not read document.`;
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      msg += ' API quota exceeded. Try again later.';
    } else if (error.message?.includes('invalid') || error.message?.includes('API')) {
      msg += ' API key issue. Contact admin.';
    } else {
      msg += `\n• Ensure good lighting (no glare on plastic)\n• Place CNIC on dark flat surface\n• Capture front AND back sides\n• If still failing, use "Fill Manually" option.`;
    }
    
    throw new Error(msg);
  }
};

// ============================================
// CONFIDENCE ESTIMATION
// ============================================

const estimateConfidence = (data: ExtractionResult, errors: string[]): number => {
  let score = 100;

  if (errors.length > 0) score -= errors.length * 30;
  if (!data.cnic) score -= 40;
  if (!data.phone_primary) score -= 20;
  if (!data.date_of_birth) score -= 10;
  if (!data.gender) score -= 10;

  return Math.max(0, score);
};

// ============================================
// KARACHI AREA DETECTION
// ============================================

export const detectKarachiArea = (address: string): string => {
  const lower = address.toLowerCase();

  const areaMap: Record<string, string> = {
    'gulshan': 'Gulshan-e-Iqbal',
    'gulshan-e-iqbal': 'Gulshan-e-Iqbal',
    'orangi': 'Orangi',
    'nazimabad': 'Nazimabad',
    'north nazimabad': 'North Nazimabad',
    'saddar': 'Saddar',
    'clifton': 'Clifton',
    'dha': 'DHA',
    'defence': 'DHA',
    'korangi': 'Korangi',
    'landhi': 'Landhi',
    'malir': 'Malir',
    'lyari': 'Lyari',
    'site': 'SITE',
    'baldia': 'Baldia',
    'pechs': 'PECHS',
    'federal b': 'FB Area',
    'fb area': 'FB Area',
    'shahrah-e-faisal': 'Shah Faisal',
    'shahra-e-faisal': 'Shah Faisal',
    'gulistan-e-johar': 'Gulistan-e-Johar',
    'johar': 'Gulistan-e-Johar',
    'surjani': 'Surjani'
  };

  for (const [key, town] of Object.entries(areaMap)) {
    if (lower.includes(key)) return town;
  }

  return 'Unknown';
};

// ============================================
// CATEGORY NORMALIZATION
// ============================================

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
    'dpt': 'Nursing Aid',
    'nursing aid': 'Nursing Aid'
  };

  return categoryMap[lower] || input;
};
