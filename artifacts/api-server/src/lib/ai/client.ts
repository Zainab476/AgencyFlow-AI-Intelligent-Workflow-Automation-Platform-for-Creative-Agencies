import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

export const ai = new GoogleGenAI({ apiKey });

export const FLASH_MODEL = "gemini-2.0-flash";
export const PRO_MODEL = "gemini-2.0-flash";
