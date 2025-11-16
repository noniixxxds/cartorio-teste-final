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
            text: "Atue como um sistema de OCR profissional para cartórios. Transcreva TODO o texto contido nesta imagem com exatidão, mantendo a formatação original. Se houver tabelas, mantenha a estrutura. Se houver carimbos, selos ou assinaturas ilegíveis, indique entre colchetes ex: [Assinatura Ilegível], [Selo Digital: XYZ]. Não faça resumos, transcreva ipsis litteris.",
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
 * Extracts structured entities and risks based on Brazilian Law.
 */
export const analyzeLegalText = async (text: string): Promise<ExtractedData> => {
  try {
    // Using Gemini 2.5 Pro for deep reasoning capability
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Você é um Tabelião Substituto AI especializado em Direito Notarial e Registral Brasileiro (Lei 6.015/73, Lei 8.935/94, Código Civil 2002 e Provimentos do CNJ).
      
      Analise o seguinte teor de documento extraído via OCR:
      
      """
      ${text.substring(0, 45000)}
      """ 
      
      TAREFA:
      1. Identifique a Natureza do Ato (ex: Escritura de Compra e Venda, Procuração, Certidão de Nascimento).
      2. Qualifique as Partes (Nomes, CPFs/CNPJs se visíveis).
      3. ANÁLISE DE CONFORMIDADE (CRÍTICO): Verifique se o documento atende aos requisitos formais.
         - Ex: Uma escritura de imóvel cita o ITBI? Cita as CNDs? Tem outorga uxória se casado for? Tem menção ao selo digital?
      4. ANÁLISE DE RISCO: Identifique cláusulas abusivas, erros materiais (datas impossíveis, nomes divergentes) ou riscos de nulidade.
      
      Retorne APENAS JSON seguindo este schema:`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rawText: { type: Type.STRING, description: "O texto original analisado." },
            summary: { type: Type.STRING, description: "Resumo técnico-jurídico formal do ato." },
            documentType: { type: Type.STRING, description: "Classificação jurídica precisa do documento." },
            parties: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista das partes qualificadas (Ex: 'Fulano de Tal (Outorgante)')." 
            },
            dates: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Datas relevantes encontradas (assinatura, validade, expedição)."
            },
            missingRequirements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de requisitos legais OBRIGATÓRIOS que parecem estar ausentes ou não mencionados (ex: 'Ausência de menção ao recolhimento de ITBI', 'Falta reconhecimento de firma', 'Não consta selo de fiscalização')."
            },
            riskFactors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
                  description: { type: Type.STRING, description: "Descrição detalhada do risco jurídico." },
                  location: { type: Type.STRING, description: "Trecho ou cláusula onde o risco reside." }
                }
              },
              description: "Fatores de risco, vícios de vontade ou erros materiais."
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Resposta vazia da análise.");
    
    const data = JSON.parse(jsonText) as ExtractedData;
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
      model: 'gemini-2.5-flash', // Using Flash for faster search integration
      contents: `Você é um Jurista Pesquisador Sênior.
      
      Contexto do Documento:
      "${context.substring(0, 1500)}..."
      
      Dúvida Jurídica: "${query}"
      
      Realize uma pesquisa profunda. Busque por:
      1. Artigos de Lei (Código Civil, CPC, Leis Especiais).
      2. Jurisprudência consolidada (STJ, STF) ou Enunciados de Câmaras Registrais.
      3. Provimentos recentes do CNJ.
      
      Sua resposta deve ser técnica, fundamentada e direta.`,
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