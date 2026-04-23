import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
 * Extracts staff data from CNIC/Form images using Gemini
 *
 * IMPORTANT: This is a helper for clear, well-lit photos only.
 * For best results:
 * - Take photos in good lighting (daylight or bright room)
 * - Place CNIC on dark, flat surface
 * - Avoid glare from flash or lamps
 * - Capture front AND back sides together
 */
export const extractStaffInfo = async (
  images: { data: string; mimeType: string }[],
  onProgress?: (stage: string, attempt: number) => void
): Promise<ExtractedStaffData> => {
  const modelId = "gemini-2.0-flash-exp";

  if (images.length === 0) {
    throw new Error('No images provided. Please upload CNIC photos.');
  }

  // Quick quality check
  const qualityIssues = checkImageQuality(images[0].data);
  if (qualityIssues.length > 0) {
    console.warn('⚠️ Image quality issues detected:', qualityIssues);
    // Continue anyway, but warn user
  }

  // Single attempt — Gemini is fast enough; retries won't fix fundamental issues
  onProgress?.('Reading document with AI...', 1);

  const prompt = `You are extracting data from Pakistani CNIC/ID documents.

IMPORTANT: These are REAL-WORLD photos — you may see:
- Glare spots from laminated cards
- Urdu text mixed with English
- Slightly blurry text
- Cropped or angled photos

Do your best to read text even with these issues. Focus on CLEAR text only. Skip fields you cannot confidently read.

REQUIRED FIELD FORMATS:
- CNIC: XXXXX-XXXXXXX-X (13 digits total, with dashes)
- Phone: 03XX-XXXXXXX (11 digits starting with 03)
- Name: Full name in English letters
- Date of Birth: DD/MM/YYYY or DD-MM-YYYY
- Category: One of: Nurse, Registered Nurse, Attendant, Doctor, Physiotherapist, Midwife, Baby Sitter, Nursing Assistant, ICU Tech, Admin, Office Boy, Nursing Aid

PAKISTAN CNIC STRUCTURE:
Front: Name, Father's Name, Gender (M/F), DOB, CNIC#, Issue/Expiry dates
Back: Present Address, Permanent Address

Urdu-English reference:
- "نام" = Name
- "والد/شوہر کا نام" = Father/Husband Name
- "تاریخِ پیدائش" = Date of Birth
- "پتّہ" = Address

RETURN ONLY JSON (no markdown, no extra text):
{
  "full_name": " Muhammad Ahmed Khan" (REQUIRED),
  "father_husband_name": "Ahmed Khan" or null,
  "cnic": "35202-1234567-1" or empty string,
  "date_of_birth": "1990-05-15" or null,
  "gender": "Male" or "Female" or null,
  "religion": "Islam" or null,
  "marital_status": "Married" or null,
  "guarantor_name": null (usually not on CNIC),
  "guarantor_contact": null,
  "complete_address": "House 12, Street 5, Gulshan-e-Iqbal, Karachi" (REQUIRED),
  "area_town": "Gulshan-e-Iqbal" or null,
  "phone_primary": "0301-2345678" or empty,
  "whatsapp_number": null or same as phone,
  "category": "Nurse" or other from list,
  "experience_years": 5 or null,
  "expected_salary": 50000 or null,
  "shift_preference": "Morning" or null
}

If an image is too blurry or unreadable, leave the field empty string/null.`;

  try {
    const imageParts = images.map(img => ({
      inlineData: {
        data: img.data.split(',')[1],
        mimeType: img.mimeType || "image/jpeg"
      }
    }));

    const response = await ai.models.generateContent({
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
    });

    const text = response.text;
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

    // Validate fields
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
    throw new Error(
      `Could not read document. ${error.message}\n\n` +
      `Tips:\n` +
      `• Ensure good lighting (no glare on plastic)\n` +
      `• Place CNIC on dark flat surface\n` +
      `• Capture front AND back sides\n` +
      `• If still failing, use "Fill Manually" option.`
    );
  }
};

// ============================================
// QUALITY CHECK
// ============================================

const checkImageQuality = (base64: string): string[] => {
  const issues: string[] = [];
  // Basic checks — we can't do full OpenCV analysis in browser without heavy libs
  // Just return hints for user
  return issues; // Empty means pass
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
