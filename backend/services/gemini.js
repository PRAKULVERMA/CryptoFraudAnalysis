import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateFraudInsight(prompt) {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text || null;
  } catch (error) {
    console.error('Gemini generation error:', error);
    return null;
  }
}

export async function analyzeTransactionPattern(transactions) {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const prompt = `You are a blockchain forensic analyst. Analyze the following transaction patterns for fraud indicators:
${JSON.stringify(transactions, null, 2)}

Provide a concise forensic summary with risk level and recommended actions.`;

  return generateFraudInsight(prompt);
}
