import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// ============================================
// CNIC VALIDATION & UTILITIES
// ============================================

/**
 * Validates Pakistan CNIC format: XXXXX-XXXXXXX-X (13 digits with dashes)
 * Also accepts compact format: 13 digits without dashes
 */
export const isValidCNIC = (cnic: string): boolean => {
  const compact = cnic.replace(/-/g, '');
  return /^\d{13}$/.test(compact);
};

/**
 * Formats CNIC to standard XXXXX-XXXXXXX-X format
 */
export const formatCNIC = (cnic: string): string => {
  const compact = cnic.replace(/\D/g, '');
  if (compact.length !== 13) return cnic;
  return `${compact.slice(0, 5)}-${compact.slice(5, 12)}-${compact.slice(12)}`;
};

/**
 * Extracts gender from CNIC check digit (last digit)
 * Odd digits = Male, Even digits = Female
 */
export const getGenderFromCNIC = (cnic: string): 'Male' | 'Female' | null => {
  const compact = cnic.replace(/\D/g, '');
  if (compact.length !== 13) return null;
  const lastDigit = parseInt(compact[12], 10);
  return lastDigit % 2 === 0 ? 'Female' : 'Male';
};

/**
 * Extracts province from CNIC first digit
 * 1=KPK, 2=FATA, 3=Punjab, 4=Sindh, 5=Balochistan, 6=Islamabad, 7=GB
 */
export const getProvinceFromCNIC = (cnic: string): string | null => {
  const compact = cnic.replace(/\D/g, '');
  if (compact.length < 1) return null;
  const provinceMap: Record<string, string> = {
    '1': 'KPK',
    '2': 'FATA',
    '3': 'Punjab',
    '4': 'Sindh',
    '5': 'Balochistan',
    '6': 'Islamabad',
    '7': 'Gilgit-Baltistan'
  };
  return provinceMap[compact[0]] || null;
};

// ============================================
// IMAGE PREPROCESSING (CNIC-SPECIFIC)
// ============================================

/**
 * Comprehensive CNIC preprocessing with glare reduction and contrast enhancement
 * Based on best practices for identity document OCR
 */
const preprocessCNICImage = (base64: string, attempt: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Base dimensions - higher for CNIC to ensure text clarity
      const sizes = [
        { width: 1200, height: 800, quality: 0.9 },   // Attempt 1: High quality
        { width: 1440, height: 960, quality: 0.95 },  // Attempt 2: Max quality
        { width: 1000, height: 666, quality: 0.85 }   // Attempt 3: Balanced
      ];
      const config = sizes[attempt - 1] || sizes[0];

      let width = img.width;
      let height = img.height;

      // Maintain aspect ratio
      const aspectRatio = width / height;
      if (aspectRatio > config.width / config.height) {
        width = config.width;
        height = Math.round(config.width / aspectRatio);
      } else {
        height = config.height;
        width = Math.round(config.height * aspectRatio);
      }

      canvas.width = width;
      canvas.height = height;

      // Clear and draw
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Get image data for enhancement
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Apply contrast enhancement
      const factor = 1.2; // Contrast factor (1.0 = no change)
      for (let i = 0; i < data.length; i += 4) {
        // Apply contrast to each channel
        data[i]     = Math.min(255, ((data[i] - 128) * factor) + 128);     // Red
        data[i + 1] = Math.min(255, ((data[i + 1] - 128) * factor) + 128); // Green
        data[i + 2] = Math.min(255, ((data[i + 2] - 128) * factor) + 128); // Blue
      }

      ctx.putImageData(imageData, 0, 0);

      // Special handling for CNIC glare (common issue with laminated cards)
      // Apply a subtle brightness boost to midtones
      if (attempt === 2) {
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
      }

      resolve(canvas.toDataURL('image/jpeg', config.quality));
    };

    img.onerror = () => resolve(base64);
  });
};

// ============================================
// RETRY LOGIC
// ============================================

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

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('All extraction attempts failed');
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

// ============================================
// MAIN EXTRACTION FUNCTION
// ============================================

export const extractStaffInfo = async (
  images: { data: string; mimeType: string }[],
  onProgress?: (stage: string, attempt: number) => void
): Promise<ExtractedStaffData> => {
  const modelId = "gemini-3-flash-preview";

  if (images.length === 0) {
    throw new Error('No images provided for extraction');
  }

  // Try different preprocessing strategies (CNIC-specific)
  let lastError: Error | undefined;
  let lastRawText: string = '';

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      onProgress?.(`Preprocessing images - strategy ${attempt}/3...`, attempt);

      const processedImages = await Promise.all(
        images.map(img => preprocessCNICImage(img.data, attempt))
      );

      onProgress?.(`Reading document with AI...`, attempt);

      // Enhanced prompt tuned for Pakistani CNIC documents
      const prompt = `You are a specialized OCR assistant trained on Pakistani Computerized National Identity Cards (CNIC) and Karachi Home Care staff registration forms.

PAKISTAN CNIC STRUCTURE (CRITICAL):
- CNIC format: XXXXX-XXXXXXX-X (13 digits, with hyphens)
- Front side contains: Full Name (English + Urdu), Father/Husband Name, Gender (M/F/Transgender), Date of Birth (DD/MM/YYYY or DD-MM-YYYY), CNIC Number, Date of Issue/Expiry
- Back side contains: Present Address, Permanent Address
- Gender from CNIC: Last digit odd = Male, even = Female
- Names are often bilingual: English + Urdu (e.g., "محمد" or "Muhammad")
- Addresses are in Pakistani format: House/Flat #, Street, Area, Karachi

DOCUMENT TYPES TO HANDLE:
1. Old CNIC (with Urdu text prominently)
2. Smart CNIC (English + Urdu, hologram)
3. NICOP (for overseas Pakistanis - contains "NICOP")
4. Staff registration forms (if CNIC not visible)

EXTRACTION RULES:
1. NAME: Extract full name as written (e.g., "Muhammad Ahmed Khan"). Include both English and Urdu versions if both present, prefer English.
2. FATHER/HUSBAND NAME: Often labeled "Father's Name" or "Husband Name". Extract full name.
3. CNIC: Must be exactly 13 digits with dashes. Common patterns:
   - With dashes: 35202-1234567-1
   - Compact: 3520212345678
   Extract and format as XXXXX-XXXXXXX-X
4. DATE OF BIRTH: Format as YYYY-MM-DD. CNIC uses DD/MM/YYYY or DD-MM-YYYY.
5. GENDER: Extract from CNIC last digit if available. Also look for "M", "Male", "Female", "F", "X", "Transgender" on card.
6. PHONE: Pakistan mobile format: 03XX-XXXXXXX (11 digits starting with 03). WhatsApp often same as phone.
7. ADDRESS: Complete Karachi address including house number, street, area/town. Look for "Address", "Present Address", "Permanent Address".
8. AREA/TOWN: From address, identify Karachi town (e.g., Gulshan-e-Iqbal, Orangi, Nazimabad, Korangi, Malir, Saddar, Clifton, DHA, etc.). Use known Karachi towns list.
9. CATEGORY: Staff role - look for "Designation", "Position", "Category". Common: Nurse, Registered Nurse, Attendant, Doctor, Physiotherapist, Midwife, Baby Sitter, Nursing Assistant, ICU Tech, Admin, Office Boy.
10. EXPERIENCE: Look for "Experience", "Exp", years of service.
11. SALARY: Expected or current salary (numeric).
12. SHIFT: Morning, Evening, Night, 12-hour, etc.

TEXT EXTRACTION TIPS:
- Urdu is written right-to-left. Numbers are always left-to-right.
- Common label translations:
  * "نام" = Name
  * "والد/شوہر کا نام" = Father/Husband Name
  * "_historyImage" = CNIC Number
  * "تاریخِ پیدائش" = Date of Birth
  * "جنس" = Gender
  * "پتّہ" = Address
  * "شہر" = City (should be Karachi)
- Laminated cards may have glare - use contrast from preprocessing.
- UrNAMEs often follow: [Given Name] [Father's Name] [Family Name/Surname]
  e.g., "Muhammad Ali Khan" where "Muhammad" is given, "Ali" is father, "Khan" is family.

RETURN VALID JSON ONLY (no markdown, no explanations):
{
  "full_name": "string or empty",
  "father_husband_name": "string or null",
  "cnic": "string in format XXXXX-XXXXXXX-X or empty",
  "date_of_birth": "YYYY-MM-DD or null",
  "gender": "Male/Female/Other or null",
  "religion": "string or null (usually Muslim/Islam)",
  "marital_status": "string or null",
  "guarantor_name": "string or null",
  "guarantor_contact": "03XX-XXXXXXX or null",
  "phone_primary": "03XX-XXXXXXX or empty",
  "whatsapp_number": "03XX-XXXXXXX or null",
  "complete_address": "full address string or empty",
  "area_town": "Karachi town name (e.g., Gulshan-e-Iqbal, Orangi, Nazimabad) or empty",
  "category": "staff category string",
  "experience_years": number or null,
  "expected_salary": number or null,
  "shift_preference": "string or null"
}`;

      const imageParts = processedImages.map((data, index) => ({
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
        1500  // Longer base delay for CNIC processing
      );

      const text = response.text;
      if (!text) {
        throw new Error("No response received from AI");
      }

      // Store raw text for fallback parsing
      lastRawText = text;

      let result: ExtractedStaffData;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse AI response:', text);
        throw new Error('Invalid response format from AI extraction');
      }

      // Critical field validation
      if (!result.full_name || !result.cnic || !result.complete_address) {
        console.warn('Missing required fields, attempting fallback parsing...');
        throw new Error('Missing required fields in extracted data');
      }

      // CNIC post-processing: validate and format
      if (result.cnic && !isValidCNIC(result.cnic)) {
        console.warn('Invalid CNIC format detected, attempting correction...');
        // Try to extract 13 digits from the string
        const digits = result.cnic.replace(/\D/g, '');
        if (digits.length === 13) {
          result.cnic = formatCNIC(digits);
        } else {
          console.error('CNIC digit count invalid:', digits.length, result.cnic);
          // Don't throw - let user correct it manually
        }
      }

      // Gender inference from CNIC if missing
      if (!result.gender && result.cnic) {
        const inferredGender = getGenderFromCNIC(result.cnic);
        if (inferredGender) {
          result.gender = inferredGender;
        }
      }

      // Province-based area refinement
      if (!result.area_town && result.cnic) {
        const province = getProvinceFromCNIC(result.cnic);
        if (province === 'Sindh') {
          result.area_town = 'Unknown (Sindh Province - needs manual verification)';
        }
      }

      return result;

    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ CNIC extraction attempt ${attempt} failed:`, error);

      if (attempt < 3) {
        await new Promise(resolve =>
          setTimeout(resolve, 1500 * attempt)
        );
      }
    }
  }

  // All retries exhausted - try regex fallback on last raw text
  if (lastRawText) {
    const fallbackResult = extractWithRegex(lastRawText);
    if (fallbackResult && fallbackResult.cnic) {
      console.log('✅ Recovered data using regex fallback');
      return fallbackResult as ExtractedStaffData;
    }
  }

  throw lastError || new Error('All extraction attempts failed');
};

// ============================================
// FALLBACK REGEX PARSER
// ============================================

/**
 * Regex-based fallback parser for when AI extraction fails
 * Uses patterns found in research for Pakistan documents
 */
const extractWithRegex = (text: string): Partial<ExtractedStaffData> | null => {
  const result: Partial<ExtractedStaffData> = { experience_years: 0 };

  // CNIC extraction - formats: 35202-1234567-1 or 3520212345678
  const cnicPatterns = [
    /(\d{5}-\d{7}-\d)/g,      // With dashes
    /(\d{13})/g               // Compact
  ];

  for (const pattern of cnicPatterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      result.cnic = formatCNIC(match[0]);
      break;
    }
  }

  // Phone extraction - 03XX-XXXXXXX or 03XXXXXXXXXX
  const phonePattern = /(0\d{2,3}[-\s]?\d{7,8})/g;
  const phoneMatch = text.match(phonePattern);
  if (phoneMatch) {
    const rawPhone = phoneMatch[0].replace(/\s/g, '');
    // Ensure proper format: strip non-digits, ensure 11 digits starting with 03
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('03')) {
      result.phone_primary = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
  }

  // Date extraction - multiple formats
  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    const rawDate = dateMatch[0];
    const parts = rawDate.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let day = parts[0].padStart(2, '0');
      let month = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) year = `20${year}`; // Assume 20xx for YY format
      result.date_of_birth = `${year}-${month}-${day}`;
    }
  }

  // Name extraction - look for "Name:" or similar labels
  const namePatterns = [
    /Name\s*[:\-]\s*([A-Za-z\s]+)/i,
    /نام\s*[:\-]?\s*([\u0600-\u06FF\s]+)/,
    /Full Name\s*[:\-]\s*([A-Za-z\s]+)/i
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.full_name = match[1].trim();
      break;
    }
  }

  // Father/Husband name
  const fatherPatterns = [
    /Father'?s Name\s*[:\-]\s*([A-Za-z\s]+)/i,
    /Father Name\s*[:\-]\s*([A-Za-z\s]+)/i,
    /Husband Name\s*[:\-]\s*([A-Za-z\s]+)/i,
    /والد\s*کا\s*نام\s*[:\-]?\s*([\u0600-\u06FF\s]+)/
  ];

  for (const pattern of fatherPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.father_husband_name = match[1].trim();
      break;
    }
  }

  // Gender from CNIC check digit
  if (result.cnic) {
    const gender = getGenderFromCNIC(result.cnic);
    if (gender) result.gender = gender;
  }

  // Address/Area extraction for Karachi
  const addressPatterns = [
    /Address\s*[:\-]\s*([^\n]+)/i,
    /Present Address\s*[:\-]\s*([^\n]+)/i,
    /Permanent Address\s*[:\-]\s*([^\n]+)/i,
    /پتّہ\s*[:\-]?\s*([^\n]+)/
  ];

  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.complete_address = match[1].trim();
      break;
    }
  }

  // Karachi area detection from address
  if (result.complete_address) {
    result.area_town = detectKarachiArea(result.complete_address);
  }

  return result.cnic ? result : null;
};

// ============================================
// KARACHI AREA DETECTION
// ============================================

/**
 * Comprehensive Karachi area/town detection from address text
 * Based on Union Councils and Towns of Karachi (246 UCs, 25 towns)
 */
export const detectKarachiArea = (address: string): string => {
  const lowerAddress = address.toLowerCase();

  // Comprehensive Karachi area mappings
  const areaMappings: Record<string, string[]> = {
    // District Central (5 towns)
    'nazimabad': ['nazimabad', 'north nazimabad', 'gulberg', 'liaquatabad', 'new karachi'],

    // District East (2 towns)
    'gulshan': ['gulshan-e-iqbal', 'gulshan town', 'gulzar-e-hijri', 'jamshed town', 'jamshed quarters'],

    // District South (1 town)
    'saddar': ['saddar', 'civil lines', 'garden', 'clifton', 'aram bagh', 'boat basin'],

    // District West (2 towns)
    'lyari': ['lyari'],
    'orangi': ['orangi', 'mominabad', 'manghopir'],

    // Kemari District (4 towns)
    'kemari': ['kemari', 'keamari'],
    'site': ['site', 'sindh industrial', 'baldia'],
    'baldia': ['baldia town'],
    ' harbour': ['harbour', 'moriro'],

    // Korangi District (4 towns)
    'korangi': ['korangi', 'korangi town', 'model colony'],
    'shah faisal': ['shah faisal', 'shah faisal colony'],
    'landhi': ['landhi', 'landhi colony'],

    // Malir District (3 towns)
    'malir': ['malir'],
    'gadap': ['gadap'],
    'bin qasim': ['bin qasim', 'bin qasim town'],

    // Premium/Defence areas
    'defence': ['defence', 'dha', 'defence housing'],
    'pecks': ['pecks', 'p.e.c.h.s', 'pechs'],
    'federal b': ['federal b', 'fb area', 'f.b. area'],

    // Airport/Shahra-e-Faisal corridor
    'shahrah-e-faisal': ['shahrah-e-faisal', 'shahra-e-faisal', 'airport', 'jinnah international'],

    // Other major localities
    'surjani': ['surjani', 'surjani town'],
    'gulistan-e-johar': ['gulistan-e-johar', 'johar'],
    'bahria': ['bahria town'],
    'north karachi': ['north karachi', 'buffer zone']
  };

  for (const [key, variants] of Object.entries(areaMappings)) {
    for (const variant of variants) {
      if (lowerAddress.includes(variant)) {
        // Return canonical town name
        if (key === 'gulshan') return 'Gulshan-e-Iqbal';
        if (key === 'saddar') return 'Saddar';
        if (key === 'kemari') return 'Kemari';
        if (key === 'site') return 'SITE';
        if (key === 'baldia') return 'Baldia';
        if (key === 'shah faisal') return 'Shah Faisal';
        if (key === 'malir') return 'Malir';
        if (key === 'gadap') return 'Gadap';
        if (key === 'bin qasim') return 'Bin Qasim';
        if (key === 'korangi') return 'Korangi';
        if (key === 'landhi') return 'Landhi';
        if (key === 'orangi') return 'Orangi';
        if (key === 'lyari') return 'Lyari';
        if (key === 'nazimabad') return 'Nazimabad';
        if (key === 'gulshan') return 'Gulshan-e-Iqbal';
        return key.charAt(0).toUpperCase() + key.slice(1);
      }
    }
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
