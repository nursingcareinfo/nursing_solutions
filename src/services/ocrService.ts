// OpenRouter configuration
const OPENROUTER_API_KEY = process.env.VITE_OPENAI_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Model for OCR - gpt-4o-mini supports vision, available on OpenRouter
const OCR_MODEL = 'openai/gpt-4o-mini';

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
 * Extracts staff data from CNIC/Form images using OpenRouter API
 * Uses gpt-4o-mini for vision-capable OCR extraction
 */
export const extractStaffInfo = async (
  images: { data: string; mimeType: string }[],
  onProgress?: (stage: string, attempt: number) => void
): Promise<ExtractedStaffData> => {

  if (images.length === 0) {
    throw new Error('No images provided. Please upload CNIC photos.');
  }

  // Convert images to proper format
  const imageParts = images.map(img => {
    const base64 = img.data.includes(',') ? img.data.split(',')[1] : img.data;
    return {
      type: 'image_url' as const,
      image_url: `data:${img.mimeType || 'image/jpeg'};base64,${base64}`
    };
  });

  // Optimized prompt - short and token-efficient
  const prompt = `Extract CNIC data. Return ONLY JSON:
{
  "full_name": "",
  "father_name": "",
  "cnic": "",
  "date_of_birth": "",
  "gender": "",
  "religion": "",
  "marital_status": "",
  "guarantor_name": "",
  "guarantor_contact": "",
  "complete_address": "",
  "area_town": "",
  "phone_primary": "",
  "whatsapp_number": "",
  "category": "",
  "experience_years": 0,
  "expected_salary": 0,
  "shift_preference": ""
}
CNIC: XXXXX-XXXXXXX-X. Phone: 03XX-XXXXXXX. Skip unclear fields.`;

  try {
    onProgress?.('Extracting with AI...', 1);

    // Build the request body
    const requestBody = {
      model: OCR_MODEL,
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
      max_tokens: 1500
    };

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    const text = result.choices?.[0]?.message?.content || '';

    if (!text) {
      throw new Error('No response from AI model');
    }

    // Parse JSON
    let data: ExtractionResult;
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      data = JSON.parse(cleaned);
    } catch {
      console.error('Raw response from AI:', text);
      throw new Error('AI returned invalid format');
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
    console.error('OCR extraction failed:', error);
    throw error;
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
