import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Workspace } from './components/Workspace';
import { ViewMode } from './types';
import { LayoutDashboard, FileText, Activity } from 'lucide-react';

// Dashboard placeholder component
const Dashboard = ({ onNewProcess }: { onNewProcess: () => void }) => (
  <div className="p-8 max-w-6xl mx-auto">
    <header className="mb-8">
      <h2 className="text-3xl font-bold text-slate-800">Painel de Controle</h2>
      <p className="text-slate-500 mt-1">Visão geral das atividades do cartório</p>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Processados Hoje</p>
            <h3 className="text-2xl font-bold text-slate-800">24</h3>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Em Análise</p>
            <h3 className="text-2xl font-bold text-slate-800">3</h3>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Tempo Médio</p>
            <h3 className="text-2xl font-bold text-slate-800">1.2 min</h3>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileText className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">Iniciar Novo Processo</h3>
      <p className="text-slate-500 mb-6 max-w-md mx-auto">Carregue documentos digitalizados para OCR, extração de dados e análise jurídica automática.</p>
      <button 
        onClick={onNewProcess}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
      >
        Carregar Documento
      </button>
    </div>
  </div>
);

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewMode>('DASHBOARD');

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar activeView={activeView} onChangeView={setActiveView} />
      
      <main className="flex-1 overflow-auto h-screen">
        {activeView === 'DASHBOARD' && <Dashboard onNewProcess={() => setActiveView('WORKSPACE')} />}
        {activeView === 'WORKSPACE' && <Workspace />}
        {activeView === 'HISTORY' && (
            <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                    <LayoutDashboard className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Histórico disponível na versão Enterprise.</p>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;