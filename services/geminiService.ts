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
            text: "Atue como um sistema de OCR profissional para cartórios. Transcreva TODO o texto contido nesta imagem com exatidão. Se houver tabelas, tente manter a estrutura. Se houver carimbos, selos ou assinaturas ilegíveis, indique entre colchetes ex: [Assinatura Ilegível], [Selo do Cartório]. Não faça resumos, quero a transcrição completa.",
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
      contents: `Você é um Tabelião AI especializado em Direito Notarial e Registral Brasileiro.
      Analise o seguinte texto extraído de um documento:
      
      "${text.substring(0, 40000)}..." 
      
      Objetivo: Identificar a natureza do ato, as partes, riscos jurídicos e conformidade com o Código Civil e normas da Corregedoria (CNJ).
      
      Gere um JSON seguindo estritamente este schema:
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rawText: { type: Type.STRING, description: "O texto original analisado." },
            summary: { type: Type.STRING, description: "Resumo técnico-jurídico do ato notarial." },
            documentType: { type: Type.STRING, description: "Classificação do documento (ex: Escritura Pública de Compra e Venda, Procuração Ad Judicia, Certidão de Inteiro Teor)." },
            parties: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Qualificação completa das partes (Outorgante, Outorgado, Comprador, Vendedor, Tabelião)." 
            },
            dates: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Datas de assinatura, expedição ou validade encontradas."
            },
            missingRequirements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de requisitos formais ou documentos acessórios que aparentam estar ausentes ou não citados (ex: Certidão Negativa de Débitos, Recolhimento de ITBI, Reconhecimento de Firma, DOI)."
            },
            riskFactors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
                  description: { type: Type.STRING },
                  location: { type: Type.STRING, description: "Cláusula ou trecho específico." }
                }
              },
              description: "Cláusulas abusivas, erros materiais, vícios de consentimento aparentes ou falta de clareza."
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Resposta vazia da análise.");
    
    const data = JSON.parse(jsonText) as ExtractedData;
    // Ensure rawText is the full text passed in
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
      contents: `Você é um assistente de pesquisa jurídica para cartórios.
      
      Contexto do Documento Analisado:
      "${context.substring(0, 2000)}..."
      
      Pergunta do Usuário: "${query}"
      
      Realize uma pesquisa para responder com base na Legislação Brasileira (Código Civil, Leis de Registros Públicos) e Jurisprudência recente (STJ/STF).
      Forneça uma resposta fundamentada.`,
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