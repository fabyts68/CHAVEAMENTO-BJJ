import React, { useState } from 'react';

const TARGET_FIELDS = [
  { key: '', label: 'Ignorar' },
  { key: 'name', label: 'Nome' },
  { key: 'teamName', label: 'Equipe' },
  { key: 'belt', label: 'Faixa' },
  { key: 'ageDivision', label: 'Idade / Categoria' },
  { key: 'weightClass', label: 'Peso / Categoria' },
  { key: 'gender', label: 'Gênero' },
  { key: 'rankingPoints', label: 'Pontos (Ranking)' },
  { key: 'weightOk', label: 'Peso OK' },
  { key: 'giOk', label: 'Kimono OK' },
];

export default function ColumnMapper({ headers: initialHeaders, sampleRows, onCancel, onApply, onServerAnalyze }: {
  headers: string[];
  sampleRows: Record<string, unknown>[];
  onCancel: () => void;
  onApply: (mapping: Record<string, string>) => void;
  onServerAnalyze?: () => Promise<void>;
}) {
  const [headers, setHeaders] = useState<string[]>(initialHeaders || []);
  const initial: Record<string, string> = {};
  headers.forEach(h => initial[h] = '');
  // suggestions: auto-map common header names
  const suggest = (hdr: string) => {
    const n = hdr.trim().toLowerCase();
    if (n.includes('nome') || n.includes('atleta') || n.includes('competidor')) return 'name';
    if (n.includes('equipe') || n.includes('team') || n.includes('academia') || n.includes('clube')) return 'teamName';
    if (n.includes('faixa') || n.includes('belt')) return 'belt';
    if (n.includes('idade') || n.includes('categoria') || n.includes('age')) return 'ageDivision';
    if (n.includes('peso') || n.includes('weight')) return 'weightClass';
    if (n.includes('gênero') || n.includes('genero') || n.includes('sexo') || n.includes('gender')) return 'gender';
    if (n.includes('pontos') || n.includes('ranking') || n.includes('seed')) return 'rankingPoints';
    return '';
  };
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    headers.forEach(h => { m[h] = suggest(h); });
    return m;
  });
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const setFor = (hdr: string, val: string) => setMapping(prev => ({ ...prev, [hdr]: val }));
  const [analyzing, setAnalyzing] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl bg-[#0b0b0b] border border-white/10 rounded-lg p-4">
        <h3 className="text-white font-bold mb-3">Mapeamento de Colunas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-400 mb-2">Colunas detectadas</div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {headers.map((h, idx) => (
                <div key={h}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null) return;
                    const copy = [...headers];
                    const [item] = copy.splice(dragIndex, 1);
                    copy.splice(idx, 0, item);
                    setHeaders(copy);
                    setDragIndex(null);
                  }}
                  className="flex items-center justify-between gap-2 bg-white/3 p-2 rounded"
                >
                  <div className="text-sm text-slate-200">{h}</div>
                  <select value={mapping[h] || ''} onChange={(e) => setFor(h, e.target.value)} className="bg-black text-slate-200 text-xs">
                    {TARGET_FIELDS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
              <div className="text-xs text-slate-400 mb-2">Pré-visualização (amostra)</div>
            <div className="max-h-64 overflow-auto text-xs bg-white/2 p-2 rounded">
              <table className="w-full table-auto text-left text-xs">
                <thead>
                  <tr>
                    {headers.map(h => <th key={h} className="pr-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((r, idx) => (
                    <tr key={idx} className="align-top">
                      {headers.map((h) => <td key={h} className="pr-2 align-top">{String(r[h] ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="px-3 py-2 bg-white/5 rounded">Cancelar</button>
            <button onClick={() => onApply(mapping)} className="px-3 py-2 bg-emerald-600 rounded text-white">Aplicar mapeamento</button>
            <button
              onClick={async () => {
                if (!onServerAnalyze) return;
                try {
                  setAnalyzing(true);
                  await onServerAnalyze();
                } finally {
                  setAnalyzing(false);
                }
              }}
              className="px-3 py-2 bg-blue-600 rounded text-white"
            >
              {analyzing ? 'Analisando...' : 'Analisar no servidor'}
            </button>
          </div>
          <div className="text-xs text-slate-400">Dica: arraste para reordenar colunas</div>
        </div>
      </div>
    </div>
  );
}
