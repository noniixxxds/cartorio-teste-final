import React, { useState, useEffect, useCallback } from 'react';
import { UploadArea } from './UploadArea';
import { DocumentContext, AnalysisStatus, ResearchResult } from '../types';
import { performOCR, analyzeLegalText, performDeepResearch } from '../services/geminiService';
import { Loader2, AlertTriangle, CheckCircle, Search, FileText, Bot, ChevronRight, ExternalLink, ZoomIn, BrainCircuit, ShieldAlert } from 'lucide-react';
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
      setStatusMessage("Digitalizando e transcrevendo texto (OCR Gemini 2.5)...");

      // 1. OCR
      const extractedText = await performOCR(base64Data, file.type);
      
      setStatus(AnalysisStatus.PROCESSING_ANALYSIS);
      setStatusMessage("Auditando conformidade legal e identificando partes...");

      // 2. Analysis
      const analysis = await analyzeLegalText(extractedText);

      setDocContext(prev => prev ? { ...prev, extractedData: analysis } : null);
      setStatus(AnalysisStatus.COMPLETED);
      setStatusMessage("");

    } catch (error) {
      console.error(error);
      setStatus(AnalysisStatus.ERROR);
      setStatusMessage("Ocorreu um erro ao processar o documento. Tente novamente.");
    }
  };

  const handleResearch = async () => {
    if (!docContext?.extractedData || !researchQuery.trim()) return;

    setStatus(AnalysisStatus.PROCESSING_RESEARCH);
    setStatusMessage("Consultando bases jurídicas, leis e jurisprudência...");

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
        <div className="h-1/2 p-4 border-b border-slate-200 overflow-auto relative group bg-slate-100 flex items-center justify-center">
             <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity z-10">
                Visualização Original
             </div>
            <img 
              src={docContext.imageBase64} 
              alt="Original Document" 
              className="max-w-full max-h-full rounded shadow-md border border-slate-300 object-contain" 
            />
        </div>
        <div className="h-1/2 flex flex-col">
            <div className="px-4 py-3 bg-white border-b border-slate-200 font-semibold text-slate-700 text-sm flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Transcrição OCR (Gemini Flash)</span>
                </div>
                <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500">Editável</span>
            </div>
            <textarea 
                className="flex-1 p-6 resize-none focus:outline-none font-mono text-sm text-slate-700 bg-white leading-relaxed"
                value={docContext.extractedData?.rawText || "Processando transcrição..."}
                readOnly={status === AnalysisStatus.PROCESSING_OCR}
                spellCheck={false}
            />
        </div>
      </div>

      {/* Right Panel: Intelligence */}
      <div className="w-1/2 flex flex-col bg-white">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
            <button 
                onClick={() => setActiveTab('ANALYSIS')}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'ANALYSIS' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
                <BrainCircuit className="w-4 h-4" /> Análise Notarial
            </button>
            <button 
                onClick={() => setActiveTab('RESEARCH')}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'RESEARCH' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
                <Search className="w-4 h-4" /> Jurisprudência & Pesquisa
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative bg-slate-50/30">
            
            {status !== AnalysisStatus.IDLE && status !== AnalysisStatus.COMPLETED && status !== AnalysisStatus.ERROR && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center px-6">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Processando Documento</h3>
                    <p className="text-slate-500 max-w-sm animate-pulse">{statusMessage}</p>
                </div>
            )}

            {activeTab === 'ANALYSIS' && docContext.extractedData && (
                <div className="space-y-6 animate-fadeIn">
                    
                    {/* Document Header */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100">
                        <div className="flex items-start justify-between mb-2">
                           <div>
                              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Tipo de Documento</p>
                              <h2 className="text-xl font-bold text-slate-900 leading-tight">{docContext.extractedData.documentType || "Em análise..."}</h2>
                           </div>
                           {docContext.extractedData.riskFactors.some(r => r.severity === 'HIGH') && (
                             <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200 flex items-center gap-1">
                               <ShieldAlert className="w-3 h-3" /> Atenção Requerida
                             </span>
                           )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Partes Envolvidas</p>
                            <div className="flex flex-wrap gap-2">
                                {docContext.extractedData.parties.map((party, idx) => (
                                    <span key={idx} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-md border border-slate-200">
                                        {party}
                                    </span>
                                ))}
                                {docContext.extractedData.parties.length === 0 && <span className="text-sm text-slate-400 italic">Nenhuma parte identificada automaticamente.</span>}
                            </div>
                        </div>
                    </div>

                    {/* Missing Requirements Alert */}
                    {docContext.extractedData.missingRequirements && docContext.extractedData.missingRequirements.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Pendências ou Requisitos Ausentes
                        </h3>
                        <ul className="space-y-2">
                          {docContext.extractedData.missingRequirements.map((req, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Summary */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2 px-1">
                            <FileText className="w-4 h-4 text-blue-600" /> Resumo do Ato
                        </h3>
                        <div className="text-slate-700 leading-relaxed text-sm bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                            {docContext.extractedData.summary}
                        </div>
                    </div>

                    {/* Risks Analysis */}
                    <div>
                         <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2 px-1">
                            <ShieldAlert className="w-4 h-4 text-blue-600" /> Análise de Risco & Cláusulas
                        </h3>
                        <div className="space-y-3">
                            {docContext.extractedData.riskFactors.length === 0 && (
                                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="text-sm font-medium">Nenhum risco evidente detectado na análise preliminar.</span>
                                </div>
                            )}
                            {docContext.extractedData.riskFactors.map((risk, i) => (
                                <div key={i} className={`p-4 rounded-xl border shadow-sm transition-all hover:shadow-md ${
                                    risk.severity === 'HIGH' ? 'border-red-200 bg-white' :
                                    risk.severity === 'MEDIUM' ? 'border-amber-200 bg-white' :
                                    'border-blue-200 bg-white'
                                }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                                            risk.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                                            risk.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>{risk.severity === 'HIGH' ? 'Risco Alto' : risk.severity === 'MEDIUM' ? 'Atenção' : 'Nota'}</span>
                                    </div>
                                    <p className="text-sm text-slate-800 font-semibold mb-1">{risk.description}</p>
                                    <div className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-100 mt-2 truncate">
                                      Ref: "{risk.location}"
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'RESEARCH' && (
                <div className="flex flex-col h-full">
                    <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <label className="block text-sm font-bold text-slate-700 mb-3">Pesquisa Jurídica Inteligente (Grounding)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={researchQuery}
                                onChange={(e) => setResearchQuery(e.target.value)}
                                placeholder="Ex: É válida a cláusula de retrovenda neste contrato?"
                                className="flex-1 border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                            />
                            <button 
                                onClick={handleResearch}
                                disabled={!researchQuery.trim() || status === AnalysisStatus.PROCESSING_RESEARCH}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2"
                            >
                                <Search className="w-4 h-4" />
                                Pesquisar
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto pb-20">
                        {(!docContext.research || docContext.research.length === 0) && (
                            <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                <Bot className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <h4 className="text-slate-600 font-medium mb-1">Assistente Jurídico Pronto</h4>
                                <p className="text-sm max-w-md mx-auto">Utilize a barra acima para investigar a validade jurídica, encontrar precedentes ou validar requisitos legais específicos deste documento.</p>
                            </div>
                        )}

                        {docContext.research?.map((res, idx) => (
                            <div key={idx} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm animate-fadeIn">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-start gap-3 text-lg">
                                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">{docContext.research!.length - idx}</span>
                                    {res.query}
                                </h4>
                                <div className="prose prose-sm prose-slate max-w-none mb-6 text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <ReactMarkdown>{res.findings}</ReactMarkdown>
                                </div>
                                {res.sources.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Fontes & Referências</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {res.sources.map((src, sIdx) => (
                                                <a key={sIdx} href={src.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded transition-colors truncate border border-blue-100">
                                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{src.title || src.uri}</span>
                                                </a>
                                            ))}
                                        </div>
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