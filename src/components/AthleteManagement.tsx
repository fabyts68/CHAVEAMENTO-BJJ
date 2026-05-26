/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Athlete, Team, Belt, AgeDivision, WeightClass, Gender } from "../types";
import { Plus, Trash2, Edit3, CheckCircle, AlertTriangle, Shield, Search, UserCheck } from "lucide-react";
import ColumnMapper from "./ColumnMapper";
import { previewFile, parseFileWithMapping } from "../utils/fileImport";

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

const normalizeKey = (key: string) => String(key || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

interface AthleteManagementProps {
  athletes: Athlete[];
  teams: Team[];
  onImportFile: (file: File) => Promise<void>;
  onImportParsedRows?: (rows: any[]) => Promise<void>;
  onAddAthlete: (athlete: Athlete) => void;
  onUpdateAthlete: (athlete: Athlete) => void;
  onDeleteAthlete: (id: string) => void;
  onAddTeam: (team: Team) => void;
  onUpdateTeam: (team: Team) => void;
  onDeleteTeam: (id: string) => void;
}

export default function AthleteManagement({
  athletes,
  teams,
  onAddAthlete,
  onUpdateAthlete,
  onDeleteAthlete,
  onAddTeam,
  onUpdateTeam,
  onDeleteTeam,
}: AthleteManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBelt, setSelectedBelt] = useState<string>("ALL");
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [subTab, setSubTab] = useState<"athletes" | "teams">("athletes");
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [mapperOpen, setMapperOpen] = useState(false);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewSampleRows, setPreviewSampleRows] = useState<Record<string, unknown>[]>([]);
  const [filePending, setFilePending] = useState<File | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);

  // Add Athlete Modal state variables
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);

  // Add Team Modal state variables
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamNameInput, setTeamNameInput] = useState("");
  const [teamSearchTerm, setTeamSearchTerm] = useState("");

  // Form Fields
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState(teams.length > 0 ? teams[0].id : "custom");
  const [customTeamName, setCustomTeamName] = useState("");
  const [rankingPoints, setRankingPoints] = useState<number>(0);
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [belt, setBelt] = useState<Belt>(Belt.WHITE);
  const [ageDivision, setAgeDivision] = useState<AgeDivision>(AgeDivision.ADULT);
  const [weightClass, setWeightClass] = useState<WeightClass>(WeightClass.MIDDLE);
  const [weightOk, setWeightOk] = useState(true);
  const [giOk, setGiOk] = useState(true);

  const resetForm = () => {
    setName("");
    setTeamId(teams.length > 0 ? teams[0].id : "custom");
    setCustomTeamName("");
    setRankingPoints(0);
    setGender(Gender.MALE);
    setBelt(Belt.WHITE);
    setAgeDivision(AgeDivision.ADULT);
    setWeightClass(WeightClass.MIDDLE);
    setWeightOk(true);
    setGiOk(true);
    setEditingAthlete(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImporting(true);
    try {
      const preview = await previewFile(file);
      setPreviewHeaders(preview.headers);
      setPreviewSampleRows(preview.sampleRows || []);
      setFilePending(file);
      setMapperOpen(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const handleOpenEditModal = (ath: Athlete) => {
    setEditingAthlete(ath);
    setName(ath.name);
    setTeamId(ath.team.id);
    setCustomTeamName("");
    setRankingPoints(ath.rankingPoints);
    setGender(ath.gender);
    setBelt(ath.belt);
    setAgeDivision(ath.ageDivision);
    setWeightClass(ath.weightClass);
    setWeightOk(ath.checkIn.weightOk);
    setGiOk(ath.checkIn.giOk);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Resolve team object
    let resolvedTeam: Team;
    if (teamId === "custom" && customTeamName.trim()) {
      const newTeamId = "team-" + Date.now();
      resolvedTeam = {
        id: newTeamId,
        name: customTeamName.trim(),
      };
      onAddTeam(resolvedTeam);
    } else {
      const existing = teams.find((t) => t.id === teamId);
      resolvedTeam = existing || teams[0] || { id: "atos", name: "Atos Jiu-Jitsu" };
    }

    const athleteData: Athlete = {
      id: editingAthlete ? editingAthlete.id : "ath-" + Date.now(),
      name: name.trim(),
      team: resolvedTeam,
      rankingPoints: Number(rankingPoints),
      gender,
      belt,
      ageDivision,
      weightClass,
      checkIn: {
        weightOk,
        giOk,
      },
    };

    if (editingAthlete) {
      onUpdateAthlete(athleteData);
    } else {
      onAddAthlete(athleteData);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleOpenAddTeamModal = () => {
    setEditingTeam(null);
    setTeamNameInput("");
    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeamModal = (t: Team) => {
    setEditingTeam(t);
    setTeamNameInput(t.name);
    setIsTeamModalOpen(true);
  };

  const handleTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNameInput.trim()) return;

    if (editingTeam) {
      onUpdateTeam({
        ...editingTeam,
        name: teamNameInput.trim()
      });
    } else {
      onAddTeam({
        id: "team-" + Date.now(),
        name: teamNameInput.trim()
      });
    }

    setIsTeamModalOpen(false);
    setTeamNameInput("");
  };

  const toggleCheckInWeight = (ath: Athlete) => {
    onUpdateAthlete({
      ...ath,
      checkIn: {
        ...ath.checkIn,
        weightOk: !ath.checkIn.weightOk,
      },
    });
  };

  const toggleCheckInGi = (ath: Athlete) => {
    onUpdateAthlete({
      ...ath,
      checkIn: {
        ...ath.checkIn,
        giOk: !ath.checkIn.giOk,
      },
    });
  };

  const downloadTemplate = () => {
    const headers = ['Nome','Equipe','Faixa','Idade','Peso','Gênero','Pontos'];
    const csv = headers.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_atletas.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleApplyMapping = async (mapping: Record<string, string>) => {
    if (!filePending) return;
    setMapperOpen(false);
    setImporting(true);
    try {
      const result: any = await parseFileWithMapping(filePending, mapping);
      const parsed = result.parsed || result;
      const errors = result.errors || [];
      setValidationErrors(errors);
      setParsedRows(parsed || []);
      // open preview modal for manual correction
      setPreviewOpen(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setFilePending(null);
      setImporting(false);
    }
  };

  const handleServerAnalyze = async () => {
    if (!filePending) return;
    setImporting(true);
    setImportError(null);
    try {
      const form = new FormData();
      form.append('file', filePending as File);
      const res = await fetch(`${API_BASE}/api/parse-file`, { method: 'POST', body: form });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Erro ao analisar no servidor');
      }
      const json = await res.json();
      if (json.type === 'sheet' && Array.isArray(json.data) && json.data.length > 0) {
        setPreviewHeaders(Object.keys(json.data[0]));
        setPreviewSampleRows((json.data as any[]).slice(0, 5));
      } else if (json.type === 'text' && Array.isArray(json.data)) {
        setPreviewHeaders(json.fields || []);
        setPreviewSampleRows((json.data as any[]).slice(0, 5));
      } else if (json.type === 'pdf' && typeof json.text === 'string') {
        const lines = (json.text as string).split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
        // try to find header line
        const headerAliases = ['nome','atleta','competidor','equipe','team','faixa','idade','peso','gênero','genero','gender'];
        let headerLine = lines.find((ln: string) => headerAliases.every(a => normalizeKey(ln).includes(normalizeKey(a))));
        if (!headerLine) headerLine = lines[0] || '';
        const headers = (headerLine as string).split(/\s{2,}|[\t,;|]/).map((h: string) => h.trim());
        const sampleRows: Record<string, unknown>[] = [];
        const startIndex = Math.max(lines.indexOf(headerLine as string), 0) + 1;
        for (let i = startIndex; i < Math.min(lines.length, startIndex + 5); i += 1) {
          const cells = (lines[i] as string).split(/\s{2,}|[\t,;|]/).map((c: string) => c.trim());
          const obj: Record<string, unknown> = {};
          headers.forEach((h: string, idx: number) => { obj[h] = cells[idx] ?? ''; });
          sampleRows.push(obj);
        }
        setPreviewHeaders(headers);
        setPreviewSampleRows(sampleRows);
      } else {
        setPreviewHeaders(json.headers || []);
        setPreviewSampleRows(json.sampleRows || []);
      }
      // keep mapper open so user can remap after server analysis
      setMapperOpen(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmPreview = async (cleanRows: Record<string, any>[], errors: Array<{ index: number; message: string }>) => {
    setPreviewOpen(false);
    setImporting(true);
    try {
      setValidationErrors(errors || []);
      if (onImportParsedRows) await onImportParsedRows(cleanRows);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  const downloadErrorsCsv = () => {
    if (!validationErrors || validationErrors.length === 0) return;
    const rows = validationErrors.map(e => `${e.index+1},"${e.message.replace(/"/g,'""')}"`);
    const csv = 'Row,Error\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'import_errors.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const filteredAthletes = athletes.filter((ath) => {
    const matchesSearch = ath.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ath.team.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBelt = selectedBelt === "ALL" || ath.belt === selectedBelt;
    const matchesGender = selectedGender === "ALL" || ath.gender === selectedGender;
    return matchesSearch && matchesBelt && matchesGender;
  });

  // Calculate high-level stats
  const totalCheckedIn = athletes.filter((a) => a.checkIn.giOk && a.checkIn.weightOk).length;
  const percentCheckedIn = athletes.length > 0 ? Math.round((totalCheckedIn / athletes.length) * 100) : 0;
  const teamSet = new Set(athletes.map((a) => a.team.id));

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* Metric Cards Banner - Immersive Command Center Mode */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 shadow-2xl">
          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Atletas Inscritos</span>
          <div className="mt-1 flex justify-between items-baseline">
            <span className="text-3xl font-extrabold tracking-tight text-white">{athletes.length}</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">Total</span>
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 shadow-2xl">
          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Check-in Efetuado</span>
          <div className="mt-1 flex justify-between items-baseline">
            <span className="text-3xl font-extrabold tracking-tight text-white">{totalCheckedIn}</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              {percentCheckedIn}% Ok
            </span>
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 shadow-2xl">
          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Equipes Diferentes</span>
          <div className="mt-1 flex justify-between items-baseline">
            <span className="text-3xl font-extrabold tracking-tight text-white">{teamSet.size}</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">Shield Ativo</span>
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-5 shadow-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase block">Regulação de Chaves</span>
            <span className="text-xs font-semibold text-slate-300 block mt-1 uppercase tracking-wide">Padrão Oficial IBJJF</span>
          </div>
          <Shield className="w-8 h-8 text-blue-400 bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/25" />
        </div>
      </div>

      {/* Tab Switcher Buttons */}
      <div className="flex gap-2 border-b border-white/5 pb-1 select-none">
        <button
          onClick={() => setSubTab("athletes")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            subTab === "athletes"
              ? "bg-blue-600/15 text-blue-400 border border-blue-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Visualizar Atletas ({athletes.length})
        </button>
        <button
          onClick={() => setSubTab("teams")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            subTab === "teams"
              ? "bg-blue-600/15 text-blue-400 border border-blue-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Visualizar Equipes & Academias ({teams.length})
        </button>
      </div>

      {subTab === "athletes" ? (
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          {/* Header Controls */}
          <div className="p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/[0.02]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Pesquisar atleta ou equipe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-xs bg-black border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-600 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter by Belt */}
              <select
                value={selectedBelt}
                onChange={(e) => setSelectedBelt(e.target.value)}
                className="text-xs font-medium border border-white/10 rounded-lg bg-black px-3 py-2 text-slate-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">Todas as Faixas</option>
                {Object.values(Belt).map((b) => (
                  <option key={b} value={b} className="bg-black text-slate-300">
                    Faixa {b}
                  </option>
                ))}
              </select>

              {/* Filter by Gender */}
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="text-xs font-medium border border-white/10 rounded-lg bg-black px-3 py-2 text-slate-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">Todos os Gêneros</option>
                {Object.values(Gender).map((g) => (
                  <option key={g} value={g} className="bg-black text-slate-300">
                    {g}
                  </option>
                ))}
              </select>

              <div className="inline-flex items-center gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <input type="file" accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf" onChange={handleFileChange} className="hidden" />
                  {importing ? 'Importando...' : 'Importar Arquivo'}
                </label>
                <button onClick={downloadTemplate} className="text-xs px-3 py-2 bg-white/5 hover:bg-white/7 text-slate-200 rounded-lg border border-white/5">Modelo</button>
              </div>

              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
              >
                <Plus className="w-3.5 h-3.5" /> Incluir Atleta
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-400 uppercase tracking-wider">
              Suportado: .xlsx, .xls, .csv, .tsv, .txt, .pdf
            </div>
          </div>
          {importError && (
            <div className="px-5 py-3 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-b-xl">
              {importError}
            </div>
          )}

          {mapperOpen && (
            <ColumnMapper headers={previewHeaders} sampleRows={previewSampleRows} onCancel={() => setMapperOpen(false)} onApply={handleApplyMapping} onServerAnalyze={handleServerAnalyze} />
          )}
          {previewOpen && (
            // @ts-ignore - dynamic import
            <PreviewModal rows={parsedRows} errors={validationErrors} onCancel={() => setPreviewOpen(false)} onConfirm={handleConfirmPreview} />
          )}

          {/* Athletes Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.03] text-slate-400 text-xxs font-bold tracking-widest border-b border-white/10 uppercase">
                  <th className="px-6 py-4">Nome do Atleta</th>
                  <th className="px-6 py-4">Equipe / Academia</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4 text-center">Pontos Ranking</th>
                  <th className="px-6 py-4 text-center">Pesagem</th>
                  <th className="px-6 py-4 text-center">Kimonos C/O</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredAthletes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-600 uppercase font-mono text-xxs tracking-wider">
                      Nenhum atleta corresponde aos filtros definidos.
                    </td>
                  </tr>
                ) : (
                  filteredAthletes.map((ath) => (
                    <tr key={ath.id} className="hover:bg-white/[0.02] border-b border-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-sm">{ath.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase mt-0.5 font-mono">{ath.gender}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300">
                          {ath.team.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          <span className="font-bold text-blue-400 bg-blue-950/40 border border-blue-500/20 px-2 py-0.5 rounded-sm">
                            {ath.belt}
                          </span>
                          <span className="text-slate-300 bg-white/5 border border-white/5 px-2 py-0.5 rounded-sm">
                            {ath.ageDivision}
                          </span>
                          <span className="text-slate-300 bg-white/5 border border-white/5 px-2 py-0.5 rounded-sm">
                            {ath.weightClass}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-200">
                        {ath.rankingPoints} pts
                      </td>
                      {/* Pesagem Checkin */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleCheckInWeight(ath)}
                          className={`inline-flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                            ath.checkIn.weightOk
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                          }`}
                          title="Inverter status de checagem da balança"
                        >
                          {ath.checkIn.weightOk ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" /> Balança OK
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Pendente
                            </>
                          )}
                        </button>
                      </td>
                      {/* Gi Checkin */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleCheckInGi(ath)}
                          className={`inline-flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                            ath.checkIn.giOk
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                          }`}
                          title="Inverter status de checagem do Kimono"
                        >
                          {ath.checkIn.giOk ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" /> Kimono OK
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Pendente
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(ath)}
                          className="p-1.5 rounded-md text-slate-400 hover:bg-white/5 hover:text-white transition-all inline-block cursor-pointer"
                          title="Editar atleta"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteAthlete(ath.id)}
                          className="p-1.5 rounded-md text-slate-450 hover:bg-red-500/10 hover:text-red-400 transition-all inline-block cursor-pointer"
                          title="Remover atleta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/[0.02]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Pesquisar equipe..."
                value={teamSearchTerm}
                onChange={(e) => setTeamSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-xs bg-black border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-600 outline-none"
              />
            </div>

            <button
              onClick={handleOpenAddTeamModal}
              className="inline-flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
            >
              <Plus className="w-3.5 h-3.5" /> Incluir Equipe
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.03] text-slate-400 text-xxs font-bold tracking-widest border-b border-white/10 uppercase">
                  <th className="px-6 py-4">Nome da Equipe</th>
                  <th className="px-6 py-4 text-center">Atletas Relacionados</th>
                  <th className="px-6 py-4 text-center">Média de Ranking</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {teams.filter(t => t.name.toLowerCase().includes(teamSearchTerm.toLowerCase())).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-600 uppercase font-mono text-xxs tracking-wider">
                      Nenhuma equipe corresponde aos filtros ou cadastros.
                    </td>
                  </tr>
                ) : (
                  teams.filter(t => t.name.toLowerCase().includes(teamSearchTerm.toLowerCase())).map((t) => {
                    const teamAthletes = athletes.filter(a => a.team.id === t.id);
                    const totalPoints = teamAthletes.reduce((sum, a) => sum + a.rankingPoints, 0);
                    const avgPoints = teamAthletes.length > 0 ? Math.round(totalPoints / teamAthletes.length) : 0;

                    return (
                      <tr key={t.id} className="hover:bg-white/[0.02] border-b border-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white text-sm">{t.name}</div>
                          <div className="text-[10px] text-slate-500 uppercase mt-0.5 font-mono">ID: {t.id}</div>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-200 text-xs font-bold">
                          {teamAthletes.length} atleta(s)
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-indigo-400 font-mono">
                          {avgPoints} pts (méd)
                        </td>
                        <td className="px-6 py-4 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditTeamModal(t)}
                            className="p-1.5 rounded-md text-slate-400 hover:bg-white/5 hover:text-white transition-all inline-block cursor-pointer"
                            title="Editar Equipe"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (teamAthletes.length > 0) {
                                alert(`Não é possível excluir a equipe "${t.name}" pois existem ${teamAthletes.length} atletas vinculados. Por favor, edite ou remova os atletas vinculados primeiro.`);
                              } else {
                                if (confirm(`Tem certeza de que deseja remover a equipe "${t.name}"?`)) {
                                  onDeleteTeam(t.id);
                                }
                              }
                            }}
                            className="p-1.5 rounded-md text-slate-450 hover:bg-red-500/10 hover:text-red-400 transition-all inline-block cursor-pointer"
                            title="Remover Equipe"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Athlete Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="bg-white/[0.02] border-b border-white/10 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                {editingAthlete ? "Editar Cadastro de Atleta" : "Cadastrar Novo Atleta"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marcus Almeida Buchecha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs bg-black border border-white/10 text-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Equipe / Academia */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Equipe / Filiação</label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full text-xs bg-black border border-white/10 text-slate-200 rounded-lg px-3 py-2.5 cursor-pointer outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id} className="bg-black text-slate-200">
                        {t.name}
                      </option>
                    ))}
                    <option value="custom" className="bg-black text-slate-200">Outra (Personalizada...)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ranking (Pts)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Pontos"
                    value={rankingPoints}
                    onChange={(e) => setRankingPoints(Number(e.target.value))}
                    className="w-full text-xs bg-black border border-white/10 text-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Equipe Personalizada (mostrada apenas se selecionada) */}
              {teamId === "custom" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nome da Academia</label>
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome da Equipe"
                    value={customTeamName}
                    onChange={(e) => setCustomTeamName(e.target.value)}
                    className="w-full text-xs bg-black border border-white/10 text-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Faixa e Gênero */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Faixa (Graduação)</label>
                  <select
                    value={belt}
                    onChange={(e) => setBelt(e.target.value as Belt)}
                    className="w-full text-xs bg-black border border-white/10 text-slate-200 rounded-lg px-3 py-2.5 cursor-pointer outline-none"
                  >
                    {Object.values(Belt).map((b) => (
                      <option key={b} value={b} className="bg-black text-slate-200">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gênero</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full text-xs bg-black border border-white/10 text-slate-200 rounded-lg px-3 py-2.5 cursor-pointer outline-none"
                  >
                    {Object.values(Gender).map((g) => (
                      <option key={g} value={g} className="bg-black text-slate-200">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Idade e Peso */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Divisão de Idade</label>
                  <select
                    value={ageDivision}
                    onChange={(e) => setAgeDivision(e.target.value as AgeDivision)}
                    className="w-full text-xs bg-black border border-white/10 text-slate-200 rounded-lg px-3 py-2.5 cursor-pointer outline-none"
                  >
                    {Object.values(AgeDivision).map((ad) => (
                      <option key={ad} value={ad} className="bg-black text-slate-200">
                        {ad}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Divisão de Peso</label>
                  <select
                    value={weightClass}
                    onChange={(e) => setWeightClass(e.target.value as WeightClass)}
                    className="w-full text-xs bg-black border border-white/10 text-slate-200 rounded-lg px-3 py-2.5 cursor-pointer outline-none"
                  >
                    {Object.values(WeightClass).map((wc) => (
                      <option key={wc} value={wc} className="bg-black text-slate-200">
                        {wc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checks iniciais */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-lg flex justify-around">
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weightOk}
                    onChange={(e) => setWeightOk(e.target.checked)}
                    className="rounded border-white/10 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer bg-black"
                  />
                  BALANÇA OK (PESO GRUPO)
                </label>

                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={giOk}
                    onChange={(e) => setGiOk(e.target.checked)}
                    className="rounded border-white/10 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer bg-black"
                  />
                  KIMONO OK (MEDIDAS)
                </label>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-lg text-xs text-slate-300 font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                >
                  {editingAthlete ? "Salvar Alterações" : "Salvar Atleta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Team Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up">
            <div className="bg-white/[0.02] border-b border-white/10 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                {editingTeam ? "Editar Detalhes da Equipe" : "Registrar Nova Equipe / Academia"}
              </h3>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleTeamSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nome da Equipe</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gracie Barra Matriz"
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  className="w-full text-xs bg-black border border-white/10 text-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-lg text-xs text-slate-300 font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
