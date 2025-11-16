export enum AnalysisStatus {
  IDLE = 'IDLE',
  PROCESSING_OCR = 'PROCESSING_OCR',
  PROCESSING_ANALYSIS = 'PROCESSING_ANALYSIS',
  PROCESSING_RESEARCH = 'PROCESSING_RESEARCH',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface ExtractedData {
  rawText: string;
  summary: string;
  documentType: string;
  parties: string[];
  dates: string[];
  riskFactors: RiskFactor[];
  missingRequirements: string[];
}

export interface RiskFactor {
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  location: string;
}

export interface ResearchResult {
  query: string;
  findings: string;
  sources: Array<{
    title: string;
    uri: string;
  }>;
}

export interface DocumentContext {
  id: string;
  fileName: string;
  fileType: string;
  imageBase64: string; // For preview and OCR
  extractedData?: ExtractedData;
  research?: ResearchResult[];
  createdAt: number;
}

export type ViewMode = 'DASHBOARD' | 'WORKSPACE';