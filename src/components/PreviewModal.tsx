import React, { useState, useEffect } from 'react';

export default function PreviewModal({ rows, errors, onCancel, onConfirm }: {
  rows: Record<string, any>[];
  errors?: Array<{ index: number; message: string }>;
  onCancel: () => void;
  onConfirm: (cleanRows: Record<string, any>[], errors: Array<{ index: number; message: string }>) => void;
}) {
  const [data, setData] = useState(rows.map(r => ({ ...r })));
  const [localErrors, setLocalErrors] = useState(errors || []);

  const updateCell = (rowIdx: number, key: string, value: any) => {
    setData(prev => {
      const cp = [...prev];
      cp[rowIdx] = { ...cp[rowIdx], [key]: value };
      return cp;
    });
  };

  const toggleError = (idx: number) => {
    setLocalErrors(prev => {
      const existing = prev.find(e => e.index === idx);
      if (existing) return prev.filter(e => e.index !== idx);
      return [...prev, { index: idx, message: 'Marcado manualmente' }];
    });
  };

  const headers = Array.from(new Set(data.flatMap(r => Object.keys(r))));
  const [now, setNow] = useState<string>(new Date().toLocaleString());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toLocaleString()), 1000);
    return () => clearInterval(id);
  }, []);

  const downloadCorrectedCsv = () => {
    const cols = headers;
    const rows = data.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = cols.map(c => `"${c.replace(/"/g, '""')}"`).join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'import_preview_corrected.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-5xl bg-[#0b0b0b] border border-white/10 rounded-lg p-4">
        <h3 className="text-white font-bold mb-3">Pré-visualização e Correção</h3>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-slate-400">Pré-visualização dos dados</div>
          <div className="text-xs text-slate-400">Data/Hora: {now}</div>
        </div>
        <div className="max-h-96 overflow-auto text-xs bg-white/2 p-2 rounded mb-3">
          <table className="w-full table-auto text-left text-xs">
            <thead>
              <tr>
                <th className="pr-2">#</th>
                {headers.map(h => <th key={h} className="pr-2">{h}</th>)}
                <th className="pr-2">Erro</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, ri) => (
                <tr key={ri} className={`${localErrors.find(e => e.index === ri) ? 'bg-red-500/10' : ''}`}>
                  <td className="pr-2 align-top">{ri+1}</td>
                  {headers.map(h => (
                    <td key={h} className="pr-2 align-top">
                      <input value={r[h] ?? ''} onChange={(e) => updateCell(ri, h, e.target.value)} className="bg-black text-slate-200 text-xs px-1 py-0.5 rounded w-full" />
                    </td>
                  ))}
                  <td className="pr-2 align-top">
                    <button onClick={() => toggleError(ri)} className="px-2 py-1 bg-white/5 rounded text-xs">{localErrors.find(e => e.index === ri) ? 'Remover Erro' : 'Marcar Erro'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <button onClick={downloadCorrectedCsv} className="px-3 py-2 bg-white/5 rounded mr-2">Baixar CSV Corrigido</button>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-3 py-2 bg-white/5 rounded">Cancelar</button>
            <button onClick={() => onConfirm(data, localErrors)} className="px-3 py-2 bg-emerald-600 rounded text-white">Confirmar e Importar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
