/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from "react";
import { Category, Bracket, Match, Athlete, AuditLog, MatchStatus } from "../types";
import { Award, GitPullRequest, ArrowRight, ShieldCheck, Shield, RefreshCw, Layers, AlertCircle, Sparkles, Move, Zap } from "lucide-react";
import ScoreboardModal from "./ScoreboardModal";

interface BracketViewProps {
  categories: Category[];
  athletes: Athlete[];
  brackets: Record<string, Bracket>;
  onGenerateBracket: (categoryId: string, teamShieldEnabled?: boolean) => void;
  onUpdateBracketMatches: (categoryId: string, matches: Match[]) => void;
  onAddAuditLog: (log: Omit<AuditLog, "id" | "timestamp">) => void;
}

export default function BracketView({
  categories,
  athletes,
  brackets,
  onGenerateBracket,
  onUpdateBracketMatches,
  onAddAuditLog,
}: BracketViewProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0].id);
  const [activeScoreboardMatchId, setActiveScoreboardMatchId] = useState<string | null>(null);
  const [teamShieldOn, setTeamShieldOn] = useState<boolean>(true);

  // Swap / Manual override state
  const [isOverrideMode, setIsOverrideMode] = useState(false);
  const [selectedSwapSlot, setSelectedSwapSlot] = useState<{
    matchId: string;
    slot: "A" | "B";
    athlete: Athlete | null;
  } | null>(null);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];
  const activeBracket = brackets[selectedCategoryId];

  // Filter athletes assigned to current category
  const categoryAthletes = athletes.filter(
    (a) =>
      a.belt === selectedCategory.belt &&
      a.ageDivision === selectedCategory.ageDivision &&
      a.weightClass === selectedCategory.weightClass &&
      a.gender === selectedCategory.gender
  );

  const handleGenerateClick = () => {
    onGenerateBracket(selectedCategoryId, teamShieldOn);
    onAddAuditLog({
      user: "Mesa Diretora",
      action: "CHAVEAMENTO_GERADO",
      details: `Chave gerada para a categoria ${selectedCategory.name} com ${categoryAthletes.length} atletas. [Separador de Equipe: ${teamShieldOn ? "ATIVADO" : "DESATIVADO"}]`,
    });
  };

  const handleSaveMatchResult = (
    matchId: string,
    winnerId: string,
    reason: Match["winReason"],
    scoreA: Match["scoreA"],
    scoreB: Match["scoreB"]
  ) => {
    if (!activeBracket) return;

    // We clone the matches array
    const updatedMatches = [...activeBracket.matches];
    const match = updatedMatches.find((m) => m.matchId === matchId);
    if (!match) return;

    // Identify winner name
    const winnerName =
      match.athleteA?.id === winnerId
        ? match.athleteA.name
        : match.athleteB?.id === winnerId
        ? match.athleteB?.name
        : "Desconhecido";

    // Set winner details
    match.winnerId = winnerId;
    match.winReason = reason;
    match.scoreA = scoreA;
    match.scoreB = scoreB;
    match.status = "COMPLETED";

    // Write audit log
    let logReason = "";
    switch (reason) {
      case "SUBMISSION":
        logReason = "por Finalização";
        break;
      case "POINTS":
        logReason = `por Pontos (${scoreA.points} x ${scoreB.points})`;
        break;
      case "ADVANTAGES":
        logReason = "por Vantagens";
        break;
      case "PENALties":
        logReason = "por Menor número de punições";
        break;
      case "WO":
        logReason = "por W.O. Técnico";
        break;
      case "DISQUALIFICATION":
        logReason = "por Desclassificação disciplinar / peso";
        break;
      case "DECISION":
        logReason = "por Decisão de Arbitragem";
        break;
      default:
        logReason = "";
    }

    onAddAuditLog({
      user: "Árbitro Central",
      action: "LUTA_FINALIZADA",
      details: `Luta ${matchId.toUpperCase()}: ${winnerName} venceu ${logReason}.`,
    });

    onUpdateBracketMatches(selectedCategoryId, updatedMatches);
  };

  // Click handler for match card (opens scoreboard or triggers manual swaps)
  const handleSlotClick = (match: Match, slot: "A" | "B", athlete: Athlete | null) => {
    if (!activeBracket) return;

    if (isOverrideMode) {
      // In swap / manual override mode, clicking an athlete in Round 1 selects or executes swap
      if (match.roundNumber !== 1) {
        alert("Ajsutes manuais de posições só podem ser efetuadas na 1ª Rodada.");
        return;
      }

      if (!selectedSwapSlot) {
        // First selection
        setSelectedSwapSlot({ matchId: match.matchId, slot, athlete });
        onAddAuditLog({
          user: "Mesa Coordenadora",
          action: "AJUSTE_SOLICITADO",
          details: `Selecionou ${athlete ? athlete.name : "Slot Vazio"} na Luta ${match.matchId.toUpperCase()} para realocação.`,
        });
      } else {
        // Second selection: do the swap
        const source = selectedSwapSlot;
        const target = { matchId: match.matchId, slot, athlete };

        if (source.matchId === target.matchId && source.slot === target.slot) {
          // Clicked same slot, cancel
          setSelectedSwapSlot(null);
          return;
        }

        const updatedMatches = [...activeBracket.matches];
        const srcMatch = updatedMatches.find((m) => m.matchId === source.matchId);
        const tgtMatch = updatedMatches.find((m) => m.matchId === target.matchId);

        if (srcMatch && tgtMatch) {
          // Swap athlete values
          const tempAth = source.athlete;
          
          if (source.slot === "A") {
            srcMatch.athleteA = target.athlete;
            srcMatch.scoreA.athleteId = target.athlete ? target.athlete.id : "";
          } else {
            srcMatch.athleteB = target.athlete;
            srcMatch.scoreB.athleteId = target.athlete ? target.athlete.id : "";
          }

          if (target.slot === "A") {
            tgtMatch.athleteA = tempAth;
            tgtMatch.scoreA.athleteId = tempAth ? tempAth.id : "";
          } else {
            tgtMatch.athleteB = tempAth;
            tgtMatch.scoreB.athleteId = tempAth ? tempAth.id : "";
          }

          // Force recalc/override status for BYEs
          const updateByeState = (m: Match) => {
            const athA = m.athleteA;
            const athB = m.athleteB;

            if (athA && !athB) {
              m.isBye = true;
              m.status = "BYE";
              m.winnerId = athA.id;
              m.winReason = "WO";
            } else if (!athA && athB) {
              m.isBye = true;
              m.status = "BYE";
              m.winnerId = athB.id;
              m.winReason = "WO";
            } else if (athA && athB) {
              m.isBye = false;
              m.status = "PENDING";
              m.winnerId = null;
              m.winReason = null;
            } else {
              m.isBye = false;
              m.status = "PENDING";
              m.winnerId = null;
              m.winReason = null;
              m.scoreA.athleteId = "";
              m.scoreB.athleteId = "";
            }
          };

          updateByeState(srcMatch);
          updateByeState(tgtMatch);

          onAddAuditLog({
            user: "Mesa Coordenadora",
            action: "CHAVE_REORGANIZADA",
            details: `Troca manual efetuada: ${source.athlete ? source.athlete.name : "Vazio"} foi trocado com ${target.athlete ? target.athlete.name : "Vazio"}.`,
          });

          onUpdateBracketMatches(selectedCategoryId, updatedMatches);
        }

        setSelectedSwapSlot(null);
        setIsOverrideMode(false);
      }
    } else {
      // Normal mode: open scoreboard modal to run match (only if match has athletes and isn't a dead end)
      if (match.status === "BYE") {
        alert("Esta luta é um BYE. O atleta avança de fase automaticamente.");
        return;
      }
      if (!match.athleteA && !match.athleteB) {
        alert("Aguardando definição dos vencedores da rodada anterior.");
        return;
      }
      setActiveScoreboardMatchId(match.matchId);
    }
  };

  const getWinnerBadge = (athleteId: string, currentMatch: Match) => {
    if (currentMatch.winnerId === athleteId && currentMatch.status === "COMPLETED") {
      return (
        <span className="ml-2 font-mono text-[9px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider inline-flex items-center gap-0.5 animate-scale-up">
          ✓ Vencedor
        </span>
      );
    }
    if (currentMatch.status === "BYE" && currentMatch.winnerId === athleteId) {
      return (
        <span className="ml-2 font-mono text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider inline-flex items-center gap-0.5">
          ★ BYE (Avança)
        </span>
      );
    }
    return null;
  };

  // Group matches by round for column rendering
  const maxRounds = activeBracket ? activeBracket.totalRounds : 1;
  const matchesByRound: Record<number, Match[]> = {};
  if (activeBracket) {
    for (let r = 1; r <= maxRounds; r++) {
      matchesByRound[r] = activeBracket.matches
        .filter((m) => m.roundNumber === r)
        .sort((a, b) => a.positionNumber - b.positionNumber);
    }
  }

  // Find the overall 1st place athlete (winner of the last match)
  const getPodium = () => {
    if (!activeBracket) return null;
    const finalMatch = activeBracket.matches.find((m) => m.roundNumber === maxRounds);
    if (!finalMatch || finalMatch.status !== "COMPLETED" || !finalMatch.winnerId) return null;

    const champ =
      finalMatch.athleteA?.id === finalMatch.winnerId
        ? finalMatch.athleteA
        : finalMatch.athleteB?.id === finalMatch.winnerId
        ? finalMatch.athleteB
        : null;

    if (!champ) return null;

    // Runner up (2nd place)
    const runnerUp =
      finalMatch.athleteA?.id === finalMatch.winnerId
        ? finalMatch.athleteB
        : finalMatch.athleteA;

    return { champ, runnerUp };
  };

  const podium = getPodium();

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* Category selector top bar - Immersive HUD style */}
      <div className="bg-[#0f0f0f] border border-white/10 p-5 rounded-2xl shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <label className="block text-xxs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            Selecione a Categoria para Chaveamento
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value);
              setIsOverrideMode(false);
              setSelectedSwapSlot(null);
            }}
            className="text-sm font-semibold border border-white/10 rounded-lg bg-black px-4 py-2.5 text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 max-w-md cursor-pointer transition-all hover:bg-slate-950"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-black text-slate-100">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stats on active athletes - Immersive styling */}
        <div className="flex flex-wrap gap-4 text-xs font-semibold bg-white/5 px-4 py-3 rounded-xl border border-dashed border-white/10">
          <div>
            <span className="text-slate-500 uppercase text-[10px] block tracking-widest">Inscritos</span>
            <span className="text-sm font-bold text-slate-200 inline-flex items-center gap-1.5 mt-0.5">
              <Layers className="w-4 h-4 text-blue-500" /> {categoryAthletes.length} Atleta(s)
            </span>
          </div>

          <div className="border-l border-white/10 pl-4">
            <span className="text-slate-500 uppercase text-[10px] block tracking-widest">Check-in</span>
            <span className="text-sm font-bold text-slate-200 inline-flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-green-500" />{" "}
              {categoryAthletes.filter((a) => a.checkIn.weightOk && a.checkIn.giOk).length} Atletas OK
            </span>
          </div>

          <div className="border-l border-white/10 pl-4">
            <span className="text-slate-500 uppercase text-[10px] block tracking-widest">Soma de Equipes</span>
            <span className="text-sm font-bold text-slate-200 inline-flex items-center gap-1.5 mt-0.5">
              <Shield className="w-4 h-4 text-indigo-400" />{" "}
              {Array.from(new Set(categoryAthletes.map((a) => a.team.id))).length} Equipe(s)
            </span>
          </div>
        </div>
      </div>

      {/* Main Bracket Tree Area or Empty State */}
      {!activeBracket ? (
        <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl py-16 px-6 text-center shadow-2xl flex flex-col items-center max-w-3xl mx-auto space-y-6">
          <div className="bg-blue-600/10 p-4 rounded-full text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.15)]">
            <GitPullRequest className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">A Chave de Lutas não foi gerada</h3>
            <p className="text-xs text-slate-400 max-w-lg leading-relaxed mx-auto uppercase tracking-wide">
              Nossa chave automatizada adere ao padrão de eliminatória simples de campeonato da IBJJF / CBJJ, 
              aplicando o algoritmo de espelhamento de seeds e o separador Team-Shield para evitar confrontos de companheiros de equipe na fase inicial.
            </p>
          </div>

          {/* Inline Selection Toggle for Team Shield on empty view */}
          <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/10 shadow-inner">
            <label className="text-xs uppercase font-bold text-slate-350 cursor-pointer flex items-center gap-1.5 select-none" htmlFor="team-shield-toggle-empty">
              <ShieldCheck className={`w-5 h-5 ${teamShieldOn ? "text-green-400 animate-pulse" : "text-slate-500"}`} />
              Ativar Proteção de Equipes (Evitar mesma equipe na eliminatória r1)
            </label>
            <div 
              id="team-shield-toggle-empty"
              onClick={() => {
                setTeamShieldOn(!teamShieldOn);
              }}
              className={`w-11 h-6 rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out flex items-center ${
                teamShieldOn ? "bg-green-600 shadow-[0_0_10px_rgba(22,163,74,0.5)]" : "bg-white/10"
              }`}
            >
              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-150 ease-in-out ${
                teamShieldOn ? "translate-x-5" : "translate-x-0"
              }`} />
            </div>
            <span className={`text-[10px] font-bold uppercase ${teamShieldOn ? "text-green-400" : "text-slate-500"}`}>
              {teamShieldOn ? "Ativo (Forte)" : "Desabilitado"}
            </span>
          </div>

          <button
            onClick={handleGenerateClick}
            disabled={categoryAthletes.length === 0}
            className={`inline-flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all ${
              categoryAthletes.length === 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Gerar Chave Inteligente
          </button>

          {categoryAthletes.length === 0 && (
            <p className="text-xs text-red-400 font-medium font-mono uppercase tracking-widest">
              Aviso: Nenhum cadastrado corresponde com as restrições desta categoria (ou não bate o check-in)!
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Legend and Operations Bar */}
          <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Chave Ativa:</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-350">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_5px_rgba(37,99,235,0.5)] inline-block"></span>
                Chave de {activeBracket.bracketSize} Slots
              </div>

              {/* Interactive Team-Shield Slider */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                <ShieldCheck className={`w-3.5 h-3.5 ${teamShieldOn ? "text-green-400 animate-pulse" : "text-slate-500"}`} />
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Proteção de Equipe:</span>
                <button
                  onClick={() => {
                    const newVal = !teamShieldOn;
                    setTeamShieldOn(newVal);
                    onGenerateBracket(selectedCategoryId, newVal);
                    onAddAuditLog({
                      user: "Mesa Diretora",
                      action: "MUDANCA_CONFIG",
                      details: `Modificou proteção 'Team-Shield' para [${newVal ? "ATIVADO" : "DESATIVADO"}] na categoria ${selectedCategory.name}. Chaveamento re-ordenado em tempo real.`,
                    });
                  }}
                  className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-all duration-205 flex items-center ${
                    teamShieldOn ? "bg-green-600" : "bg-white/10"
                  }`}
                  title="Ativar/Desativar proteção automática contra lutas de mesma equipe na 1ª Rodada"
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ${
                    teamShieldOn ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
                <span className={`text-[10px] font-bold uppercase ${teamShieldOn ? "text-green-400" : "text-slate-500"}`}>
                  {teamShieldOn ? "Ativo" : "Inativo"}
                </span>
              </div>
              {categoryAthletes.length === 1 && (
                <div className="flex items-center gap-1.5 font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md text-[10px] tracking-wide uppercase">
                  <AlertCircle className="w-3.5 h-3.5" /> Exceção Case: 1 Atleta (Gold Automático)
                </div>
              )}
              {categoryAthletes.length === 3 && (
                <div className="flex items-center gap-1.5 font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md text-[10px] tracking-wide uppercase">
                  <AlertCircle className="w-3.5 h-3.5" /> Exceção Case: 3 Atletas (Seed 1 ganha BYE)
                </div>
              )}
            </div>

            {/* Manual Swap Override Button */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsOverrideMode(!isOverrideMode);
                  setSelectedSwapSlot(null);
                }}
                className={`inline-flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                  isOverrideMode
                    ? "bg-amber-600 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
                title="Ativar rearranjo manual de atletas de última hora"
              >
                <Move className="w-3.5 h-3.5" /> {isOverrideMode ? "Cancelando Ajuste..." : "Ajuste Manual / Swap"}
              </button>

              <button
                onClick={handleGenerateClick}
                className="inline-flex items-center gap-2 cursor-pointer bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-colors"
                title="Recalcular e gerar novamente"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reiniciar Chave
              </button>
            </div>
          </div>

          {/* Swap Indicator Overlay */}
          {isOverrideMode && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between text-amber-200 text-sm animate-scale-up">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-500 animate-bounce" />
                <div>
                  <span className="font-bold text-amber-400">Modo Swap Ativo:</span>
                  <p className="text-xs text-slate-400 font-medium">
                    {!selectedSwapSlot
                      ? "Clique em qualquer atleta na Round 1 (Quartas de Final / Oitavas) para selecionar."
                      : "Agora, clique em qualquer outro atleta ou slot BYE para fazer a troca em tempo real."}
                  </p>
                </div>
              </div>
              {selectedSwapSlot && (
                <div className="text-xs bg-amber-500/20 px-3 py-1 rounded font-mono font-bold border border-amber-500/30 text-amber-300">
                  Selecionado: {selectedSwapSlot.athlete ? selectedSwapSlot.athlete.name : "Slot Vazio"}
                </div>
              )}
            </div>
          )}

          {/* Responsive scroll instruction indicator */}
          <div className="lg:hidden flex items-center justify-center gap-2 text-[10px] text-blue-400 font-mono tracking-widest uppercase font-bold bg-blue-500/10 border border-blue-500/20 rounded-lg py-2 px-3 animate-pulse">
            <span>← Deslize lateralmente para ver todas as rodadas →</span>
          </div>

          {/* Interactive Tree Brackets (flex rounds wrapper) */}
          <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="flex gap-12 min-w-max p-4 items-center justify-start">
              {/* Columns represent each round */}
              {Array.from({ length: maxRounds }).map((_, idx) => {
                const roundNum = idx + 1;
                const matches = matchesByRound[roundNum] || [];
                const isFinalRound = roundNum === maxRounds;

                // Labels for rounds
                let roundLabel = `Rodada de ${matches.length * 2}`;
                if (matches.length === 4) roundLabel = "Quartas de Final";
                else if (matches.length === 2) roundLabel = "Semifinal";
                else if (matches.length === 1) roundLabel = "Final";

                return (
                  <div key={roundNum} className="flex flex-col space-y-8 items-center">
                    {/* Round Header */}
                    <div className="text-center">
                      <span className="text-xxs font-mono font-bold tracking-[0.2em] text-slate-500 uppercase">
                        RODADA {roundNum}
                      </span>
                      <h4 className="text-xs font-bold text-slate-350 mt-0.5 uppercase tracking-wide">{roundLabel}</h4>
                    </div>

                    {/* Round Matches layout */}
                    <div className="flex flex-col justify-around h-[420px] space-y-4">
                      {matches.map((m) => {
                        const isMatchSelectedForSwap =
                          selectedSwapSlot?.matchId === m.matchId;

                        return (
                          <div
                            key={m.matchId}
                            className={`bg-white/5 border rounded-xl overflow-hidden shadow-2xl w-72 flex flex-col transition-all relative ${
                              isOverrideMode && m.roundNumber === 1
                                ? "border-amber-500 ring-2 ring-amber-500/20 cursor-crosshair hover:scale-101"
                                : activeScoreboardMatchId === m.matchId
                                ? "border-blue-500 ring-2 ring-blue-500/20"
                                : m.status === "COMPLETED"
                                ? "border-white/5 bg-white/[0.02]"
                                : m.status === "BYE"
                                ? "border-white/5 bg-white/[0.01] opacity-70"
                                : "border-white/10 hover:border-white/20 hover:bg-white/[0.07]"
                            }`}
                          >
                            {/* Match Header Info */}
                            <div className="bg-white/5 px-3 py-1.5 border-b border-white/5 flex items-center justify-between">
                              <span className="text-[9px] font-mono font-bold text-slate-500 tracking-wider">
                                LUTA {m.matchId.toUpperCase()}
                              </span>
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                                {m.status === "BYE" ? "BYE" : m.status === "COMPLETED" ? "FEITO" : "PENDENTE"}
                              </span>
                            </div>

                            {/* Athletes list inside Match Card */}
                            <div className="divide-y divide-white/5">
                              {/* Athlete A */}
                              <div
                                onClick={() => handleSlotClick(m, "A", m.athleteA)}
                                className={`px-3 py-2.5 text-xs flex justify-between items-center transition-colors cursor-pointer ${
                                  isOverrideMode && m.roundNumber === 1
                                    ? "hover:bg-amber-500/10"
                                    : "hover:bg-white/5"
                                } ${
                                  isMatchSelectedForSwap && selectedSwapSlot?.slot === "A"
                                    ? "bg-amber-500/20 text-white font-semibold"
                                    : ""
                                }`}
                              >
                                {m.athleteA ? (
                                  <div className="truncate flex-1 pr-2">
                                    <div className="font-semibold text-slate-100 truncate">
                                      {m.athleteA.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate lowercase">
                                      <span>{m.athleteA.team.name}</span>
                                      <span className="opacity-45">•</span>
                                      <span>Seed #{m.athleteA.rankingPoints}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-slate-650 italic">Aguardando atleta...</div>
                                )}

                                <div className="flex items-center whitespace-nowrap">
                                  {m.athleteA && getWinnerBadge(m.athleteA.id, m)}
                                  {m.status === "COMPLETED" && (
                                    <span className="ml-2 font-mono text-blue-400 font-bold">
                                      {m.scoreA.points}p
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Athlete B */}
                              <div
                                onClick={() => handleSlotClick(m, "B", m.athleteB)}
                                className={`px-3 py-2.5 text-xs flex justify-between items-center transition-colors cursor-pointer ${
                                  isOverrideMode && m.roundNumber === 1
                                    ? "hover:bg-amber-500/10"
                                    : "hover:bg-white/5"
                                } ${
                                  isMatchSelectedForSwap && selectedSwapSlot?.slot === "B"
                                    ? "bg-amber-500/20 text-white font-semibold"
                                    : ""
                                }`}
                              >
                                {m.athleteB ? (
                                  <div className="truncate flex-1 pr-2">
                                    <div className="font-semibold text-slate-100 truncate">
                                      {m.athleteB.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate lowercase">
                                      <span>{m.athleteB.team.name}</span>
                                      <span className="opacity-45">•</span>
                                      <span>Seed #{m.athleteB.rankingPoints}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-slate-650 italic">Aguardando atleta...</div>
                                )}

                                <div className="flex items-center whitespace-nowrap">
                                  {m.athleteB && getWinnerBadge(m.athleteB.id, m)}
                                  {m.status === "COMPLETED" && (
                                    <span className="ml-2 font-mono text-blue-400 font-bold">
                                      {m.scoreB.points}p
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Podium Column with Immersive styling */}
              {podium && (
                <div className="flex flex-col items-center bg-gradient-to-b from-yellow-500/10 to-transparent border border-yellow-500/30 rounded-2xl p-6 space-y-4 self-center w-72 shadow-[0_0_20px_rgba(245,158,11,0.15)] animate-fade-in text-center">
                  <div className="bg-yellow-500/20 p-3 rounded-full border border-yellow-500/30 animate-pulse">
                    <Award className="w-8 h-8 text-yellow-400" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-[10px] font-mono text-yellow-500 tracking-widest font-bold uppercase">Campeão Declarado</h3>
                    <h4 className="text-sm font-extrabold text-white uppercase">{podium.champ.name}</h4>
                    <p className="text-xs text-slate-400 font-medium lowercase italic">{podium.champ.team.name}</p>
                  </div>

                  <div className="border-t border-white/5 w-full pt-4 space-y-3 text-xs">
                    <div className="flex justify-between text-slate-400 font-mono">
                      <span>Outorgado Ouro</span>
                      <strong className="text-yellow-400">1º LUGAR</strong>
                    </div>

                    {podium.runnerUp && (
                      <div className="flex justify-between border-t border-white/5 pt-2.5 font-mono">
                        <span className="text-slate-400 truncate mr-2">Prata: {podium.runnerUp.name}</span>
                        <strong className="text-slate-500 shrink-0">2º LUGAR</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Scoreboard timer/points controller modal */}
      {activeScoreboardMatchId && activeBracket && (
        <ScoreboardModal
          match={activeBracket.matches.find((m) => m.matchId === activeScoreboardMatchId)!}
          onClose={() => setActiveScoreboardMatchId(null)}
          onSaveResult={handleSaveMatchResult}
        />
      )}
    </div>
  );
}
