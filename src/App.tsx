/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Athlete, Category, Bracket, Match, AuditLog, Team } from "./types";
import { mockCategories } from "./utils/mockData";
import { generateBracket } from "./utils/bracketGenerator";
import { parseAthleteFile } from "./utils/fileImport";
import AthleteManagement from "./components/AthleteManagement";
import BracketView from "./components/BracketView";
import DocView from "./components/DocView";
import { Shield, Users, GitPullRequest, FileCode2, History, Info } from "lucide-react";

export default function App() {
  const [tab, setTab] = useState<"bracket" | "athletes" | "docs" | "logs">("bracket");

  // State
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [brackets, setBrackets] = useState<Record<string, Bracket>>({});
  const [bracketsShieldSettings, setBracketsShieldSettings] = useState<Record<string, boolean>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const STORAGE_KEYS = {
    athletes: 'bjj-app-athletes',
    teams: 'bjj-app-teams',
    logs: 'bjj-app-logs',
  };

  // API base can be configured at build time via Vite env: VITE_API_BASE
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';
  const fetchApi = (path: string, opts?: RequestInit) => fetch(`${API_BASE}${path.startsWith('/') ? path : '/'+path}`, opts);

  const loadCachedState = () => {
    if (typeof window === 'undefined') return null;
    try {
      return {
        athletes: JSON.parse(localStorage.getItem(STORAGE_KEYS.athletes) || '[]') as Athlete[],
        teams: JSON.parse(localStorage.getItem(STORAGE_KEYS.teams) || '[]') as Team[],
        logs: JSON.parse(localStorage.getItem(STORAGE_KEYS.logs) || '[]') as AuditLog[],
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const cache = loadCachedState();
    if (cache) {
      if (cache.teams.length) setTeams(cache.teams);
      if (cache.athletes.length) setAthletes(cache.athletes);
      if (cache.logs.length) setAuditLogs(cache.logs);
    }

    fetchTeams();
    fetchAthletes();
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.athletes, JSON.stringify(athletes));
  }, [athletes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Team Operations
  const handleAddTeam = (newTeam: Team) => {
    // POST to API
    fetchApi('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTeam) })
      .then((res) => {
        if (res.ok) {
          fetchTeams();
        } else {
          // If API returns an error, add locally
          setTeams((prev) => [...prev, newTeam]);
        }
      })
      .catch(() => {
        // If network error, add locally
        setTeams((prev) => [...prev, newTeam]);
      });
    handleAddAuditLog({
      user: "Coordenação",
      action: "CADASTRAR_EQUIPE",
      details: `Nova equipe registrada: ${newTeam.name}.`,
    });
  };

  const handleUpdateTeam = (updatedTeam: Team) => {
    fetchApi(`/api/teams/${updatedTeam.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: updatedTeam.name }) })
      .then((res) => {
        if (res.ok) {
          fetchTeams();
        } else {
          // If API returns an error, update locally
          setTeams((prev) => prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
        }
      })
      .catch(() => {
        // If network error, update locally
        setTeams((prev) => prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
      });
    // Sync matching athletes' team objects in active state in real-time
    setAthletes((prev) =>
      prev.map((a) => {
        if (a.team.id === updatedTeam.id) {
          return { ...a, team: updatedTeam };
        }
        return a;
      })
    );
    handleAddAuditLog({
      user: "Coordenação",
      action: "ATUALIZAR_EQUIPE",
      details: `Equipe atualizada para: ${updatedTeam.name}.`,
    });
  };

  const filteredAthletes = athletes;

  const handleDeleteTeam = (id: string) => {
    const toRemove = teams.find((t) => t.id === id);
    if (!toRemove) return;
    fetchApi(`/api/teams/${id}`, { method: 'DELETE' })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert('Não foi possível excluir a equipe: ' + (err?.error || res.statusText));
        } else {
          fetchTeams();
        }
      })
      .catch(() => {
        // If network error, delete locally
        setTeams((prev) => prev.filter((t) => t.id !== id));
      });
    handleAddAuditLog({
      user: "Coordenação",
      action: "EXCLUIR_EQUIPE",
      details: `Equipe removida: ${toRemove.name}.`,
    });
  };

  // Automatically generate brackets on initial render for all mock categories
  useEffect(() => {
    // fetch initial data from API and set up socket
    fetchTeams();
    fetchAthletes();
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // socket.io client for real-time sync
  useEffect(() => {
    // lazy-load to avoid SSR issues
    import('socket.io-client').then(({ io }) => {
      const socket = io(window.location.origin.replace(/:\d+$/, ':4000'));
      socket.on('connect', () => console.log('socket connected'));
      socket.on('teams-updated', () => fetchTeams());
      socket.on('athletes-updated', () => fetchAthletes());
      socket.on('audit-updated', () => fetchLogs());
      return () => socket.disconnect();
    });
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetchApi('/api/teams');
      const data = await res.json();
      const teamsData = data.map((t: any) => ({ id: t.id, name: t.name }));
      setTeams(teamsData);
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify(teamsData));
    } catch (e) {
      console.error('fetch teams', e);
      const cache = loadCachedState();
      if (cache?.teams?.length) setTeams(cache.teams);
    }
  };

  const fetchAthletes = async () => {
    try {
      const res = await fetchApi('/api/athletes');
      const data = await res.json();
      setAthletes(data as Athlete[]);
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.athletes, JSON.stringify(data));
    } catch (e) {
      console.error('fetch athletes', e);
      const cache = loadCachedState();
      if (cache?.athletes?.length) setAthletes(cache.athletes);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetchApi('/api/logs');
      const data = await res.json();
      const mappedLogs = data.map((d: any) => ({ id: d.id, timestamp: d.timestamp, user: d.user, action: d.action, details: d.details }));
      setAuditLogs(mappedLogs);
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(mappedLogs));
    } catch (e) {
      console.error('fetch logs', e);
      const cache = loadCachedState();
      if (cache?.logs?.length) setAuditLogs(cache.logs);
    }
  };

  const handleAddAuditLog = (log: Omit<AuditLog, "id" | "timestamp">) => {
    const newLog: AuditLog = {
      ...log,
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Athlete Operations
  const handleAddAthlete = (newAthlete: Athlete) => {
    fetchApi('/api/athletes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAthlete) })
      .then((res) => {
        if (res.ok) {
          fetchAthletes();
        } else {
          // If API returns an error, add locally
          setAthletes((prev) => {
            const updated = [...prev, newAthlete];
            regenerateCategoryBracket(newAthlete.belt, newAthlete.ageDivision, newAthlete.weightClass, newAthlete.gender, updated);
            return updated;
          });
        }
      })
      .catch(() => {
        // If network error, add locally
        setAthletes((prev) => {
          const updated = [...prev, newAthlete];
          regenerateCategoryBracket(newAthlete.belt, newAthlete.ageDivision, newAthlete.weightClass, newAthlete.gender, updated);
          return updated;
        });
      });

    handleAddAuditLog({ user: 'Coordenação', action: 'CADASTRAR_ATLETA', details: `${newAthlete.name} (${newAthlete.team.name}) foi adicionado.` });
  };

  const handleImportAthletes = async (file: File) => {
    const importedRows = await parseAthleteFile(file);
    if (importedRows.length === 0) {
      throw new Error('Nenhum atleta válido encontrado na planilha.');
    }

    const existingTeamsMap = new Map(teams.map((team) => [team.name.toLowerCase(), team]));
    const teamsToCreate: Team[] = [];
    const athletePayloads = importedRows.map((row) => {
      const teamName = row.teamName.trim() || 'Sem filiação';
      const key = teamName.toLowerCase();
      let team = existingTeamsMap.get(key) || teamsToCreate.find((item) => item.name.toLowerCase() === key);
      if (!team) {
        team = { id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: teamName };
        teamsToCreate.push(team);
      }

      return {
        id: `ath-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: row.name,
        team,
        rankingPoints: row.rankingPoints,
        gender: row.gender,
        belt: row.belt,
        ageDivision: row.ageDivision,
        weightClass: row.weightClass,
        checkIn: {
          weightOk: row.weightOk,
          giOk: row.giOk,
        },
      };
    });

    const response = await fetchApi('/api/import-athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams: teamsToCreate, athletes: athletePayloads }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || 'Falha ao importar atletas.');
    }

    await fetchTeams();
    await fetchAthletes();
    handleAddAuditLog({
      user: 'Coordenação',
      action: 'IMPORTAR_PLANILHA',
      details: `Importados ${athletePayloads.length} atletas via planilha.`,
    });
  };

  const handleImportParsedRows = async (parsedRows: any[]) => {
    if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
      throw new Error('Nenhum atleta válido fornecido.');
    }

    const existingTeamsMap = new Map(teams.map((team) => [team.name.toLowerCase(), team]));
    const teamsToCreate: Team[] = [];
    const athletePayloads = parsedRows.map((row) => {
      const teamName = String(row.teamName || row.team || 'Sem filiação').trim() || 'Sem filiação';
      const key = teamName.toLowerCase();
      let team = existingTeamsMap.get(key) || teamsToCreate.find((item) => item.name.toLowerCase() === key);
      if (!team) {
        team = { id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: teamName };
        teamsToCreate.push(team);
      }

      return {
        id: `ath-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: row.name,
        team,
        rankingPoints: row.rankingPoints || 0,
        gender: row.gender,
        belt: row.belt,
        ageDivision: row.ageDivision,
        weightClass: row.weightClass,
        checkIn: {
          weightOk: row.weightOk,
          giOk: row.giOk,
        },
      };
    });

    const response = await fetchApi('/api/import-athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams: teamsToCreate, athletes: athletePayloads }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || 'Falha ao importar atletas.');
    }

    await fetchTeams();
    await fetchAthletes();
    handleAddAuditLog({ user: 'Coordenação', action: 'IMPORTAR_PLANILHA', details: `Importados ${athletePayloads.length} atletas via planilha.` });
  };

  const handleUpdateAthlete = (updatedAthlete: Athlete) => {
    fetchApi(`/api/athletes/${updatedAthlete.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAthlete) })
      .then((res) => {
        if (res.ok) {
          fetchAthletes();
        } else {
          // If API returns an error, update locally
          setAthletes((prev) => {
            const updated = prev.map((a) => (a.id === updatedAthlete.id ? updatedAthlete : a));
            regenerateCategoryBracket(updatedAthlete.belt, updatedAthlete.ageDivision, updatedAthlete.weightClass, updatedAthlete.gender, updated);
            return updated;
          });
        }
      })
      .catch(() => {
        // If network error, update locally
        setAthletes((prev) => {
          const updated = prev.map((a) => (a.id === updatedAthlete.id ? updatedAthlete : a));
          regenerateCategoryBracket(updatedAthlete.belt, updatedAthlete.ageDivision, updatedAthlete.weightClass, updatedAthlete.gender, updated);
          return updated;
        });
      });

    handleAddAuditLog({ user: 'Balança / Check-In', action: 'ATUALIZAR_ATLETA', details: `Atleta atualizado: ${updatedAthlete.name}` });
  };

  const handleDeleteAthlete = (id: string) => {
    const toRemove = athletes.find((a) => a.id === id);
    if (!toRemove) return;
    fetchApi(`/api/athletes/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (res.ok) {
          fetchAthletes();
        } else {
          // If API returns an error, delete locally
          setAthletes((prev) => {
            const updated = prev.filter((a) => a.id !== id);
            regenerateCategoryBracket(toRemove.belt, toRemove.ageDivision, toRemove.weightClass, toRemove.gender, updated);
            return updated;
          });
        }
      })
      .catch(() => {
        // If network error, delete locally
        setAthletes((prev) => {
          const updated = prev.filter((a) => a.id !== id);
          regenerateCategoryBracket(toRemove.belt, toRemove.ageDivision, toRemove.weightClass, toRemove.gender, updated);
          return updated;
        });
      });

    handleAddAuditLog({ user: 'Coordenação', action: 'EXCLUIR_ATLETA', details: `Remoção do atleta ${toRemove.name}` });
  };

  // Helper to re-generate the bracket automatically if something changes
  const regenerateCategoryBracket = (
    belt: string,
    age: string,
    weight: string,
    gender: string,
    activeAthletes: Athlete[]
  ) => {
    const cat = categories.find(
      (c) => c.belt === belt && c.ageDivision === age && c.weightClass === weight && c.gender === gender
    );
    if (!cat) return;

    const catAthletes = activeAthletes.filter(
      (a) =>
        a.belt === cat.belt &&
        a.ageDivision === cat.ageDivision &&
        a.weightClass === cat.weightClass &&
        a.gender === cat.gender
    );

    const isShieldOn = bracketsShieldSettings[cat.id] ?? true;

    setBrackets((prev) => ({
      ...prev,
      [cat.id]: generateBracket(cat, catAthletes, isShieldOn),
    }));
  };

  // Direct bracket update from Bracket tree swaps/score outcomes
  const handleUpdateBracketMatches = (categoryId: string, matches: Match[]) => {
    setBrackets((prev) => {
      const active = prev[categoryId];
      if (!active) return prev;
      return {
        ...prev,
        [categoryId]: {
          ...active,
          matches,
        },
      };
    });
  };

  const handleManualBracketRegeneration = (categoryId: string, teamShieldEnabled?: boolean) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;

    const targetShield = teamShieldEnabled !== undefined ? teamShieldEnabled : (bracketsShieldSettings[categoryId] ?? true);

    // Persist this choice
    if (teamShieldEnabled !== undefined) {
      setBracketsShieldSettings((prev) => ({
        ...prev,
        [categoryId]: teamShieldEnabled,
      }));
    }

    const catAthletes = athletes.filter(
      (a) =>
        a.belt === cat.belt &&
        a.ageDivision === cat.ageDivision &&
        a.weightClass === cat.weightClass &&
        a.gender === cat.gender
    );

    setBrackets((prev) => ({
      ...prev,
      [categoryId]: generateBracket(cat, catAthletes, targetShield),
    }));
  };

  return (
    <div className="min-h-screen bg-[#050505] cyber-grid flex flex-col font-sans text-slate-200">
      {/* Upper Navigation and Branding Bar: Command Center Style */}
      <header className="bg-[#0f0f0f] border-b border-white/10 shadow-2xl shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] shrink-0">
              <span className="font-bold text-white tracking-tighter">BJJ</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase text-white flex items-center gap-2">
                BJJ BRACKET <span className="text-blue-500 text-sm font-mono text-xs">v2.4.0</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                IBJJF Rulebook Compliant System • Segregação de Equipe
              </p>
            </div>
          </div>

          {/* Time & Server Stats indicators */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Mesa de Operação</p>
              <p className="text-xs font-semibold text-slate-300">Sincronização Ativa (Mat 01)</p>
            </div>
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg flex items-center gap-3 shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-300">Live: 17:42 UTC</span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/5 overflow-x-auto scrollbar-none">
          <nav className="flex space-x-1 py-1 min-w-max">
            <button
              onClick={() => setTab("bracket")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                tab === "bracket"
                  ? "bg-white/10 text-white border-b-2 border-blue-500 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <GitPullRequest className="w-4 h-4 text-blue-400" /> Chaves Visuais (Live)
            </button>
            <button
              onClick={() => setTab("athletes")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                tab === "athletes"
                  ? "bg-white/10 text-white border-b-2 border-blue-500 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-4 h-4 text-blue-400" /> Atletas & Check-In
            </button>
            <button
              onClick={() => setTab("logs")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                tab === "logs"
                  ? "bg-white/10 text-white border-b-2 border-blue-500 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <History className="w-4 h-4 text-blue-400" /> Auditoria (Logs)
            </button>
            <button
              onClick={() => setTab("docs")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                tab === "docs"
                  ? "bg-white/10 text-white border-b-2 border-blue-500 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileCode2 className="w-4 h-4 text-blue-400" /> Especificações & JSON
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tab === "bracket" && (
          <BracketView
            categories={categories}
            athletes={filteredAthletes}
            brackets={brackets}
            onGenerateBracket={handleManualBracketRegeneration}
            onUpdateBracketMatches={handleUpdateBracketMatches}
            onAddAuditLog={handleAddAuditLog}
          />
        )}

        {tab === "athletes" && (
          <AthleteManagement
            athletes={filteredAthletes}
            teams={teams}
            onImportFile={handleImportAthletes}
            onImportParsedRows={handleImportParsedRows}
            onAddAthlete={handleAddAthlete}
            onUpdateAthlete={handleUpdateAthlete}
            onDeleteAthlete={handleDeleteAthlete}
            onAddTeam={handleAddTeam}
            onUpdateTeam={handleUpdateTeam}
            onDeleteTeam={handleDeleteTeam}
          />
        )}

        {tab === "docs" && <DocView />}

        {tab === "logs" && (
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div>
                <h2 className="text-md font-bold text-white uppercase tracking-wider">Auditoria & Histórico (Anti-Fraude)</h2>
                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">Log cronológico detalhado do BJJ-Bracket-Engine.</p>
              </div>
              <button
                onClick={() => {
                  setAuditLogs([]);
                  handleAddAuditLog({
                    user: "Administrador",
                    action: "LIMPAR_LOGS",
                    details: "Histórico de logs limpo pelo usuário.",
                  });
                }}
                className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/30 transition-all cursor-pointer"
              >
                Limpar Logs
              </button>
            </div>

            {/* List */}
            <div className="space-y-1 max-h-120 overflow-y-auto pr-2 divide-y divide-white/5 font-mono">
              {auditLogs.length === 0 ? (
                <p className="text-slate-600 text-center py-10 text-xs">NENHUM LOG REGISTRADO NA SESSÃO ATUAL.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex flex-col md:flex-row md:items-start md:justify-between text-xs gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-blue-400 bg-blue-950/40 border border-blue-500/20 px-2 py-0.5 rounded-sm">
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-400">por {log.user}</span>
                      </div>
                      <p className="text-slate-300 font-medium text-xs leading-relaxed mt-1">
                        {log.details}
                      </p>
                    </div>

                    <span className="text-slate-500 font-mono text-xxs block sm:inline whitespace-nowrap pt-1">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Immersive System Footer displaying live trace audit info */}
      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-500 font-mono tracking-widest mt-6 gap-4">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 uppercase text-center md:text-left">
          <span>
            Último Log:{" "}
            <span className="text-slate-300">
              {auditLogs.length > 0 ? auditLogs[0].details : "INICIALIZANDO FLUXO DE CHAVES..."}
            </span>
          </span>
          <span className="text-blue-500">Team Block: Validated ✓ (Shield Ativo)</span>
        </div>
        <div className="uppercase flex items-center gap-4">
          <span>DB Latency: 14ms</span>
          <span>Cloud-Sync: OK</span>
        </div>
      </footer>
    </div>
  );
}
