import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ExtractedStaffData {
  full_name: string;
  cnic: string;
  father_husband_name?: string;
  date_of_birth?: string;
  gender?: string;
  religion?: string;
  complete_address: string;
  area_town: string;
  phone_primary: string;
  whatsapp_number?: string;
  category: string;
  experience_years: number;
  expected_salary?: number;
  shift_preference?: string;
}

export const extractStaffInfo = async (images: { data: string; mimeType: string }[]): Promise<ExtractedStaffData> => {
  const model = "gemini-3-flash-preview";

  const prompt = `Extract fields from this "Nursing Care Home Medical Services" registration form:
  - full_name: The applicant's name.
  - father_husband_name: LOOK SPECIFICALLY for the 'Father / Husband Name' field on the form.
  - cnic (format: XXXXX-XXXXXXX-X), date_of_birth (YYYY-MM-DD), gender, religion.
  - phone_primary: Extract and format strictly as 03XX-XXXXXXX. 
  - whatsapp_number: Extract and format strictly as 03XX-XXXXXXX.
  - complete_address.
  - area_town: Identify specific Karachi area (e.g. Korangi, Gulshan, Malir, DHA, Clifton).
  - category: Choose one from [R/N, BSN, Aid Nurse, Midwife, DPT, ICU/Anes, Doctor, Attendant, Babysitter].
  - experience_years (Total Experience), expected_salary (Numerical), shift_preference (Day/Night/24hrs).
  
  Note: If age is mentioned instead of DOB, estimate year of birth (2026 - Age).
  Return ONLY a valid JSON object.`;

  const imageParts = images.map(img => ({
    inlineData: {
      data: img.data.split(',')[1] || img.data,
      mimeType: img.mimeType
    }
  }));

  const response = await ai.models.generateContent({
    model,
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
          complete_address: { type: Type.STRING },
          area_town: { type: Type.STRING },
          phone_primary: { type: Type.STRING },
          whatsapp_number: { type: Type.STRING },
          category: { type: Type.STRING },
          experience_years: { type: Type.NUMBER },
          expected_salary: { type: Type.NUMBER },
          shift_preference: { type: Type.STRING },
        },
        required: ["full_name", "cnic", "complete_address"]
      }
    }
  });

  const result = response.text;
  return JSON.parse(result || "{}");
};
