import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData, ResearchResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Step 1: Perform OCR using Gemini Flash (Multimodal)
 * Extracts text verbatim from the image.
 */
export const performOCR = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: "Atue como um sistema de OCR de alta precisão para cartórios brasileiros. Transcreva TODO o texto contido nesta imagem. Mantenha a formatação original onde possível. Não adicione comentários, apenas o texto transcrito.",
          },
        ],
      },
    });
    
    return response.text || "";
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Falha ao realizar OCR no documento.");
  }
};

/**
 * Step 2: Analyze Text using Gemini Pro (Reasoning)
 * Extracts structured entities and risks.
 */
export const analyzeLegalText = async (text: string): Promise<ExtractedData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Analise o seguinte texto jurídico extraído de um documento cartorário:
      
      "${text.substring(0, 30000)}..." 
      
      (Texto truncado se muito longo).
      
      Gere um resumo estruturado JSON.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rawText: { type: Type.STRING, description: "O texto original fornecido (ou um trecho dele)." },
            summary: { type: Type.STRING, description: "Um resumo jurídico executivo do documento." },
            documentType: { type: Type.STRING, description: "Tipo do documento (ex: Escritura, Procuração, Certidão)." },
            parties: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista das partes envolvidas (nomes completos)." 
            },
            dates: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Datas relevantes encontradas no documento."
            },
            riskFactors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
                  description: { type: Type.STRING },
                  location: { type: Type.STRING, description: "Citação do trecho ou cláusula relacionada." }
                }
              },
              description: "Fatores de risco jurídico, cláusulas abusivas ou atenção especial."
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Resposta vazia da análise.");
    
    const data = JSON.parse(jsonText) as ExtractedData;
    // Ensure rawText is the full text passed in, as the model might truncate it in output
    data.rawText = text; 
    return data;

  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("Falha na análise jurídica do texto.");
  }
};

/**
 * Step 3: Deep Research with Grounding
 * Uses Google Search to validate clauses or check jurisprudence.
 */
export const performDeepResearch = async (query: string, context: string): Promise<ResearchResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Contexto do documento: "${context.substring(0, 2000)}..."
      
      Pergunta de pesquisa do usuário: "${query}"
      
      Realize uma pesquisa profunda para responder a esta pergunta no contexto jurídico brasileiro. Cite fontes.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const findings = response.text || "Não foi possível realizar a pesquisa.";
    
    // Extract grounding metadata
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => {
        if (chunk.web) {
          return { title: chunk.web.title, uri: chunk.web.uri };
        }
        return null;
      })
      .filter((s: any) => s !== null) || [];

    return {
      query,
      findings,
      sources
    };

  } catch (error) {
    console.error("Research Error:", error);
    throw new Error("Falha na pesquisa aprofundada.");
  }
};