import React, { useState, useEffect, useCallback } from 'react';
import { UploadArea } from './UploadArea';
import { DocumentContext, AnalysisStatus, ResearchResult } from '../types';
import { performOCR, analyzeLegalText, performDeepResearch } from '../services/geminiService';
import { Loader2, AlertTriangle, CheckCircle, Search, FileText, Bot, ChevronRight, ExternalLink, ZoomIn, BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const Workspace: React.FC = () => {
  const [docContext, setDocContext] = useState<DocumentContext | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'RESEARCH'>('ANALYSIS');
  const [researchQuery, setResearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Helper to read file as Base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/xyz;base64, prefix for Gemini API if raw needed, 
        // but for display we keep it. Gemini Helper typically needs raw base64 data part.
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file: File) => {
    try {
      const base64Full = await readFileAsBase64(file);
      const base64Data = base64Full.split(',')[1];
      
      setDocContext({
        id: Date.now().toString(),
        fileName: file.name,
        fileType: file.type,
        imageBase64: base64Full,
        createdAt: Date.now()
      });

      setStatus(AnalysisStatus.PROCESSING_OCR);
      setStatusMessage("Realizando OCR (Extração de Texto)...");

      // 1. OCR
      const extractedText = await performOCR(base64Data, file.type);
      
      setStatus(AnalysisStatus.PROCESSING_ANALYSIS);
      setStatusMessage("Analisando cláusulas e identificando entidades...");

      // 2. Analysis
      const analysis = await analyzeLegalText(extractedText);

      setDocContext(prev => prev ? { ...prev, extractedData: analysis } : null);
      setStatus(AnalysisStatus.COMPLETED);
      setStatusMessage("");

    } catch (error) {
      console.error(error);
      setStatus(AnalysisStatus.ERROR);
      setStatusMessage("Ocorreu um erro ao processar o documento. Verifique o console.");
    }
  };

  const handleResearch = async () => {
    if (!docContext?.extractedData || !researchQuery.trim()) return;

    setStatus(AnalysisStatus.PROCESSING_RESEARCH);
    setStatusMessage("Consultando bases jurídicas e jurisprudência...");

    try {
      const result = await performDeepResearch(researchQuery, docContext.extractedData.rawText);
      
      setDocContext(prev => {
        if (!prev) return null;
        const currentResearch = prev.research || [];
        return { ...prev, research: [result, ...currentResearch] };
      });
      setResearchQuery('');
    } catch (e) {
      console.error(e);
    } finally {
      setStatus(AnalysisStatus.COMPLETED);
      setStatusMessage("");
    }
  };

  if (!docContext) {
    return <UploadArea onFileSelected={processFile} />;
  }

  return (
    <div className="flex h-full overflow-hidden bg-white">
      {/* Left Panel: Document Preview & Raw Text */}
      <div className="w-1/2 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="h-1/2 p-4 border-b border-slate-200 overflow-auto relative group">
             <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
                Original
             </div>
            <img 
              src={docContext.imageBase64} 
              alt="Original Document" 
              className="max-w-full rounded shadow-sm mx-auto border border-slate-200" 
            />
        </div>
        <div className="h-1/2 flex flex-col">
            <div className="px-4 py-2 bg-white border-b border-slate-200 font-semibold text-slate-700 text-sm flex justify-between items-center">
                <span>Texto Reconhecido (OCR)</span>
                <span className="text-xs text-slate-400 font-normal">Editável</span>
            </div>
            <textarea 
                className="flex-1 p-4 resize-none focus:outline-none font-mono text-sm text-slate-600 bg-white"
                value={docContext.extractedData?.rawText || "Aguardando OCR..."}
                readOnly={status === AnalysisStatus.PROCESSING_OCR}
            />
        </div>
      </div>

      {/* Right Panel: Intelligence */}
      <div className="w-1/2 flex flex-col bg-white">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
            <button 
                onClick={() => setActiveTab('ANALYSIS')}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'ANALYSIS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <BrainCircuit className="w-4 h-4" /> Análise Jurídica
            </button>
            <button 
                onClick={() => setActiveTab('RESEARCH')}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'RESEARCH' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Search className="w-4 h-4" /> Pesquisa Profunda
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative">
            
            {status !== AnalysisStatus.IDLE && status !== AnalysisStatus.COMPLETED && status !== AnalysisStatus.ERROR && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <p className="text-slate-600 font-medium animate-pulse">{statusMessage}</p>
                </div>
            )}

            {activeTab === 'ANALYSIS' && docContext.extractedData && (
                <div className="space-y-6">
                    
                    {/* Document Header */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h2 className="text-lg font-bold text-blue-900 mb-1">{docContext.extractedData.documentType || "Documento Não Identificado"}</h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {docContext.extractedData.parties.map((party, idx) => (
                                <span key={idx} className="px-2 py-1 bg-white text-blue-700 text-xs font-semibold rounded border border-blue-200">
                                    {party}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Resumo Executivo
                        </h3>
                        <p className="text-slate-600 leading-relaxed text-sm bg-slate-50 p-4 rounded-lg">
                            {docContext.extractedData.summary}
                        </p>
                    </div>

                    {/* Risks */}
                    <div>
                         <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Fatores de Risco & Atenção
                        </h3>
                        <div className="space-y-3">
                            {docContext.extractedData.riskFactors.length === 0 && (
                                <p className="text-sm text-slate-500 italic">Nenhum risco evidente detectado.</p>
                            )}
                            {docContext.extractedData.riskFactors.map((risk, i) => (
                                <div key={i} className={`p-3 rounded-lg border-l-4 ${
                                    risk.severity === 'HIGH' ? 'border-red-500 bg-red-50' :
                                    risk.severity === 'MEDIUM' ? 'border-amber-500 bg-amber-50' :
                                    'border-blue-500 bg-blue-50'
                                }`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                            risk.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                                            risk.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>{risk.severity === 'HIGH' ? 'ALTO RISCO' : risk.severity === 'MEDIUM' ? 'ATENÇÃO' : 'OBSERVAÇÃO'}</span>
                                    </div>
                                    <p className="text-sm text-slate-800 font-medium">{risk.description}</p>
                                    <p className="text-xs text-slate-500 mt-1 font-mono">"{risk.location}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'RESEARCH' && (
                <div className="flex flex-col h-full">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pesquisa Avançada (Grounding)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={researchQuery}
                                onChange={(e) => setResearchQuery(e.target.value)}
                                placeholder="Ex: Validade jurídica de cláusula de renúncia de benfeitorias..."
                                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                            />
                            <button 
                                onClick={handleResearch}
                                disabled={!researchQuery.trim() || status === AnalysisStatus.PROCESSING_RESEARCH}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                <Search className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto pb-20">
                        {(!docContext.research || docContext.research.length === 0) && (
                            <div className="text-center py-10 text-slate-400">
                                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Utilize a barra acima para pesquisar jurisprudência ou validar cláusulas usando o contexto do documento.</p>
                            </div>
                        )}

                        {docContext.research?.map((res, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-xl p-5 border border-slate-200 animate-fadeIn">
                                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{docContext.research!.length - idx}</span>
                                    {res.query}
                                </h4>
                                <div className="prose prose-sm prose-slate max-w-none mb-4 text-slate-700">
                                    <ReactMarkdown>{res.findings}</ReactMarkdown>
                                </div>
                                {res.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Fontes Citadas</p>
                                        <ul className="space-y-1">
                                            {res.sources.map((src, sIdx) => (
                                                <li key={sIdx}>
                                                    <a href={src.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline truncate">
                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                        {src.title || src.uri}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};