import React, { useRef, useState } from 'react';
import { UploadCloud, FileImage } from 'lucide-react';

interface UploadAreaProps {
  onFileSelected: (file: File) => void;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ onFileSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div 
        className={`w-full max-w-2xl h-96 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 scale-105 shadow-xl' 
            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50 shadow-sm'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className={`p-6 rounded-full mb-6 ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
          <UploadCloud className={`w-12 h-12 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
        </div>
        <h3 className="text-2xl font-semibold text-slate-800 mb-2">Carregar Documento</h3>
        <p className="text-slate-500 text-center max-w-md mb-6">
          Arraste e solte seu documento digitalizado aqui (JPG, PNG) ou clique para buscar no computador.
        </p>
        <div className="flex gap-4 text-sm text-slate-400 font-medium">
          <span className="flex items-center gap-1"><FileImage className="w-4 h-4" /> Imagens de Alta Resolução</span>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/png, image/jpeg, image/jpg"
        />
      </div>
    </div>
  );
};