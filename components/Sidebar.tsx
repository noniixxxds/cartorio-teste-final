import React from 'react';
import { Scale, FileText, LayoutDashboard, Settings, History } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onChangeView: (view: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onChangeView }) => {
  const menuItems = [
    { id: 'DASHBOARD', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'WORKSPACE', label: 'Novo Processo', icon: FileText },
    { id: 'HISTORY', label: 'Histórico', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 shadow-xl z-20">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="p-2 bg-blue-600 rounded-lg">
          <Scale className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">NotárioAI</h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Versão Pro</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
          <Settings className="w-5 h-5 text-slate-400" />
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  );
};