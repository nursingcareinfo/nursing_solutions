import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Helper to compress/resize image for faster transit and processing
const compressImage = (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8)); // 0.8 quality jpeg is perfect for OCR
    };
  });
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

export const extractStaffInfo = async (images: { data: string; mimeType: string }[]): Promise<ExtractedStaffData> => {
  const modelId = "gemini-3-flash-preview"; 

  // Optimize: Compress all images in parallel
  const compressedImages = await Promise.all(
    images.map(img => compressImage(img.data))
  );

  const prompt = `Extract staff info from the provided Karachi Home Care registration documents. Return JSON.
  Fields: full_name, father_husband_name, cnic (XXXXX-XXXXXXX-X), date_of_birth (YYYY-MM-DD), gender, religion, marital_status, guarantor_name, guarantor_contact, phone_primary (starts with 03), whatsapp_number, complete_address, area_town, category (Nurse, Attendant, Caretaker, Baby Sitter, Doctor), experience_years, expected_salary, shift_preference.`;

  const imageParts = compressedImages.map(data => ({
    inlineData: {
      data: data.split(',')[1],
      mimeType: "image/jpeg"
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
        required: ["full_name", "cnic", "complete_address"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text);
};
