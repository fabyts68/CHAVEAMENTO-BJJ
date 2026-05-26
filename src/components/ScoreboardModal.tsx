/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Match, MatchScore, Athlete } from "../types";
import { Play, Pause, RotateCcw, Award, Check } from "lucide-react";

interface ScoreboardModalProps {
  match: Match;
  onClose: () => void;
  onSaveResult: (
    matchId: string,
    winnerId: string,
    reason: Match["winReason"],
    scoreA: MatchScore,
    scoreB: MatchScore
  ) => void;
}

export default function ScoreboardModal({ match, onClose, onSaveResult }: ScoreboardModalProps) {
  // Local Scoring States
  const [pointsA, setPointsA] = useState(match.scoreA.points);
  const [advantagesA, setAdvantagesA] = useState(match.scoreA.advantages);
  const [penaltiesA, setPenaltiesA] = useState(match.scoreA.penalties);

  const [pointsB, setPointsB] = useState(match.scoreB.points);
  const [advantagesB, setAdvantagesB] = useState(match.scoreB.advantages);
  const [penaltiesB, setPenaltiesB] = useState(match.scoreB.penalties);

  // Timer States
  const [timerLeft, setTimerLeft] = useState(match.timerSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // End fight state
  const [submissionType, setSubmissionType] = useState("Armlock");
  const [customWinReason, setCustomWinReason] = useState<Match["winReason"]>(null);

  useEffect(() => {
    if (isTimerRunning) {
      intervalRef.current = setInterval(() => {
        setTimerLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTimerRunning]);

  // Handle Automatic Rules (Penalty Escalation)
  // CBJJ Rules:
  // 1st Penalty: Warning (Advertência)
  // 2nd Penalty: Give 1 Advantage to Opponent
  // 3rd Penalty: Give 2 Points to Opponent
  // 4th Penalty: Disqualification (Desclassificação)
  const adjustPenaltiesA = (val: number) => {
    const nextPen = Math.max(0, penaltiesA + val);
    setPenaltiesA(nextPen);

    if (val > 0) {
      if (nextPen === 2) {
        setAdvantagesB((prev) => prev + 1);
      } else if (nextPen === 3) {
        setPointsB((prev) => prev + 2);
      } else if (nextPen >= 4) {
        setIsTimerRunning(false);
        // Desclassificação imediata
        handleEndMatchDirectly(match.athleteB?.id || "", "DISQUALIFICATION");
      }
    }
  };

  const adjustPenaltiesB = (val: number) => {
    const nextPen = Math.max(0, penaltiesB + val);
    setPenaltiesB(nextPen);

    if (val > 0) {
      if (nextPen === 2) {
        setAdvantagesA((prev) => prev + 1);
      } else if (nextPen === 3) {
        setPointsA((prev) => prev + 2);
      } else if (nextPen >= 4) {
        setIsTimerRunning(false);
        handleEndMatchDirectly(match.athleteA?.id || "", "DISQUALIFICATION");
      }
    }
  };

  // Helper to format MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndMatchDirectly = (winnerId: string, reason: Match["winReason"]) => {
    const finalScoreA: MatchScore = {
      athleteId: match.athleteA?.id || "",
      points: pointsA,
      advantages: advantagesA,
      penalties: penaltiesA,
    };
    const finalScoreB: MatchScore = {
      athleteId: match.athleteB?.id || "",
      points: pointsB,
      advantages: advantagesB,
      penalties: penaltiesB,
    };

    onSaveResult(match.matchId, winnerId, reason, finalScoreA, finalScoreB);
    onClose();
  };

  // Run auto decision comparing points -> advantages -> fewest penalties
  const handleAutoResult = () => {
    if (!match.athleteA || !match.athleteB) return;

    let winnerId = match.athleteA.id;
    let reason: Match["winReason"] = "POINTS";

    if (pointsA > pointsB) {
      winnerId = match.athleteA.id;
    } else if (pointsB > pointsA) {
      winnerId = match.athleteB.id;
    } else {
      // Tie points -> compare advantages
      if (advantagesA > advantagesB) {
        winnerId = match.athleteA.id;
        reason = "ADVANTAGES";
      } else if (advantagesB > advantagesA) {
        winnerId = match.athleteB.id;
        reason = "ADVANTAGES";
      } else {
        // Tie advantages -> compare penalties (fewer is better)
        if (penaltiesA < penaltiesB) {
          winnerId = match.athleteA.id;
          reason = "PENALties";
        } else if (penaltiesB < penaltiesA) {
          winnerId = match.athleteB.id;
          reason = "PENALties";
        } else {
          // Absolute tie -> Referee Decision required
          winnerId = match.athleteA.id; // Default, let user toggle decision
          reason = "DECISION";
        }
      }
    }

    handleEndMatchDirectly(winnerId, reason);
  };

  // Check if athletes exist
  if (!match.athleteA && !match.athleteB) {
    return (
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-6 max-w-sm text-center">
          <p className="text-slate-400 text-xs font-mono">Nenhum atleta disputando nesta luta no momento.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#0c0c0c] rounded-2xl w-full max-w-4xl overflow-hidden border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col my-4">
        {/* Header Display */}
        <div className="px-6 py-4 bg-white/[0.02] border-b border-white/10 flex justify-between items-center text-white">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-blue-400 font-bold uppercase">
              Mesa de Arbitragem Oficial • Luta {match.matchId.toUpperCase()}
            </span>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Round {match.roundNumber} • Chaveamento de Diretriz CBJJ
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer transition-colors">
            &times;
          </button>
        </div>

        {/* Core Scoreboard Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-px bg-white/10">
          {/* Athlete A Controls - Red side (Crimson Warrior Deck) */}
          <div className="md:col-span-5 bg-gradient-to-b from-[#180a0a] to-[#0a0505] p-6 flex flex-col justify-between border-b md:border-b-0 border-white/5">
            {match.athleteA ? (
              <div className="space-y-6">
                <div className="border-l-4 border-rose-500 pl-3">
                  <span className="text-[9px] font-mono font-bold text-rose-450 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-sm uppercase tracking-wider">
                    KIMONO DE COMBATE A (VERMELHO)
                  </span>
                  <h4 className="text-lg font-black text-rose-100 tracking-tight mt-2 truncate uppercase">
                    {match.athleteA.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wide mt-0.5">{match.athleteA.team.name}</p>
                </div>

                {/* Score Controls */}
                <div className="space-y-4">
                  {/* points */}
                  <div className="bg-black/50 rounded-xl p-4 border border-rose-500/15 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">PONTOS</span>
                      <div className="text-5xl font-mono font-extrabold text-rose-500 mt-1 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]">{pointsA}</div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setPointsA((p) => p + 4)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-rose-500/20 text-rose-200 hover:text-white rounded border border-white/5 hover:border-rose-500/30 text-xxs font-bold cursor-pointer transition-all"
                          title="Montada / Pegada pelas Costas"
                        >
                          +4 Montada
                        </button>
                        <button
                          onClick={() => setPointsA((p) => p + 3)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-rose-500/20 text-rose-200 hover:text-white rounded border border-white/5 hover:border-rose-500/30 text-xxs font-bold cursor-pointer transition-all"
                          title="Passagem de Guarda"
                        >
                          +3 Passagem
                        </button>
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        <button
                          onClick={() => setPointsA((p) => p + 2)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-rose-500/20 text-rose-200 hover:text-white rounded border border-white/5 hover:border-rose-500/30 text-xxs font-bold cursor-pointer transition-all"
                          title="Raspagem / Queda / Joelho na Barriga"
                        >
                          +2 Rasp/Queda
                        </button>
                        <button
                          onClick={() => setPointsA((p) => Math.max(0, p - 1))}
                          className="px-2.5 py-1.5 bg-[#400c0f]/30 hover:bg-[#ff1e20]/30 text-red-400 hover:text-white rounded border border-red-500/10 text-xxs font-bold cursor-pointer transition-all"
                          title="Remover 1 ponto"
                        >
                          -1 Pt
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* advantages and Penalties Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Advantages */}
                    <div className="bg-black/55 border border-white/10 rounded-xl p-3 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Vantagens</span>
                      <div className="text-3xl font-mono font-extrabold text-amber-500 mt-1">{advantagesA}</div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setAdvantagesA((a) => a + 1)}
                          className="px-3 py-1 bg-white/5 hover:bg-amber-500/25 border border-white/5 hover:border-amber-500/30 text-white rounded font-bold text-xs cursor-pointer transition-colors"
                        >
                          +
                        </button>
                        <button
                          onClick={() => setAdvantagesA((a) => Math.max(0, a - 1))}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white rounded font-bold text-xs cursor-pointer transition-colors"
                        >
                          -
                        </button>
                      </div>
                    </div>

                    {/* Penalties */}
                    <div className="bg-black/55 border border-white/10 rounded-xl p-3 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Punições</span>
                      <div className="text-3xl font-mono font-extrabold text-red-500 mt-1">{penaltiesA}</div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => adjustPenaltiesA(1)}
                          className="px-3 py-1 bg-red-950/40 hover:bg-red-900 border border-red-900/30 text-rose-200 rounded font-bold text-xs cursor-pointer transition-colors"
                          title="Incluir Advertência/Falta"
                        >
                          +
                        </button>
                        <button
                          onClick={() => adjustPenaltiesA(-1)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white rounded font-bold text-xs cursor-pointer transition-colors"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 text-xs py-10 font-mono">Primeiro combatente ausente</div>
            )}
          </div>

          {/* Central Clock Area (Cyber LED Chrono Deck) */}
          <div className="md:col-span-2 bg-black p-6 flex flex-col items-center justify-center text-center space-y-4">
            <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">CRONÔMETRO</span>
            <div className={`text-5xl font-mono font-black tracking-widest leading-none filter drop-shadow-[0_0_12px_rgba(52,211,153,0.3)] ${isTimerRunning ? "text-emerald-400 animate-pulse" : "text-slate-400"}`}>
              {formatTime(timerLeft)}
            </div>

            {/* Timing Controls */}
            <div className="flex justify-center gap-2 w-full">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`p-3 rounded-full text-white cursor-pointer transition-all duration-150 hover:scale-105 ${
                  isTimerRunning ? "bg-amber-600 hover:bg-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.5)]" : "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(5,150,105,0.5)]"
                }`}
                title={isTimerRunning ? "Pausar Luta" : "Iniciar Luta"}
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerLeft(match.timerSeconds);
                }}
                className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-full cursor-pointer border border-white/10 hover:scale-105 duration-150 transition-all"
                title="Resetar tempo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Quick manual time adjustment options */}
            <div className="flex flex-wrap justify-center gap-1.5 text-[9px] font-mono">
              <button
                onClick={() => setTimerLeft((t) => Math.max(0, t - 30))}
                className="px-2 py-0.5 bg-white/5 border border-white/5 text-slate-400 rounded hover:text-white cursor-pointer transition-colors"
              >
                -30s
              </button>
              <button
                onClick={() => setTimerLeft((t) => t + 30)}
                className="px-2 py-0.5 bg-white/5 border border-white/5 text-slate-400 rounded hover:text-white cursor-pointer transition-colors"
              >
                +30s
              </button>
            </div>
          </div>

          {/* Athlete B Controls - Blue side (Sapphire Warrior Deck) */}
          <div className="md:col-span-5 bg-gradient-to-b from-[#0a121d] to-[#04060a] p-6 flex flex-col justify-between">
            {match.athleteB ? (
              <div className="space-y-6">
                <div className="border-r-4 border-blue-500 text-right pr-3">
                  <span className="text-[9px] font-mono font-bold text-blue-450 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-sm uppercase tracking-wider">
                    KIMONO DE COMBATE B (AZUL)
                  </span>
                  <h4 className="text-lg font-black text-blue-100 tracking-tight mt-2 truncate uppercase">
                    {match.athleteB.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wide mt-0.5">{match.athleteB.team.name}</p>
                </div>

                {/* Score Controls */}
                <div className="space-y-4">
                  {/* points */}
                  <div className="bg-black/50 rounded-xl p-4 border border-blue-500/15 flex items-center justify-between">
                    <div className="flex flex-col gap-1 items-start">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setPointsB((p) => p + 4)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-blue-500/20 text-blue-200 hover:text-white rounded border border-white/5 hover:border-blue-500/30 text-xxs font-bold cursor-pointer transition-all"
                          title="Montada / Pegada pelas Costas"
                        >
                          +4 Montada
                        </button>
                        <button
                          onClick={() => setPointsB((p) => p + 3)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-blue-500/20 text-blue-200 hover:text-white rounded border border-white/5 hover:border-blue-500/30 text-xxs font-bold cursor-pointer transition-all"
                          title="Passagem de Guarda"
                        >
                          +3 Passagem
                        </button>
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        <button
                          onClick={() => setPointsB((p) => p + 2)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-blue-500/20 text-blue-200 hover:text-white rounded border border-white/5 hover:border-blue-500/30 text-xxs font-bold cursor-pointer transition-all"
                          title="Raspagem / Queda / Joelho na Barriga"
                        >
                          +2 Rasp/Queda
                        </button>
                        <button
                          onClick={() => setPointsB((p) => Math.max(0, p - 1))}
                          className="px-2.5 py-1.5 bg-[#0a1e35]/30 hover:bg-[#1e7bff]/30 text-blue-400 hover:text-white rounded border border-blue-500/10 text-xxs font-bold cursor-pointer transition-all"
                          title="Remover 1 ponto"
                        >
                          -1 Pt
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">PONTOS</span>
                      <div className="text-5xl font-mono font-extrabold text-blue-500 mt-1 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">{pointsB}</div>
                    </div>
                  </div>

                  {/* advantages and Penalties Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Advantages */}
                    <div className="bg-black/55 border border-white/10 rounded-xl p-3 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Vantagens</span>
                      <div className="text-3xl font-mono font-extrabold text-amber-500 mt-1">{advantagesB}</div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setAdvantagesB((b) => b + 1)}
                          className="px-3 py-1 bg-white/5 hover:bg-amber-500/25 border border-white/5 hover:border-amber-500/30 text-white rounded font-bold text-xs cursor-pointer transition-colors"
                        >
                          +
                        </button>
                        <button
                          onClick={() => setAdvantagesB((b) => Math.max(0, b - 1))}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white rounded font-bold text-xs cursor-pointer transition-colors"
                        >
                          -
                        </button>
                      </div>
                    </div>

                    {/* Penalties */}
                    <div className="bg-black/55 border border-white/10 rounded-xl p-3 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Punições</span>
                      <div className="text-3xl font-mono font-extrabold text-red-500 mt-1">{penaltiesB}</div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => adjustPenaltiesB(1)}
                          className="px-3 py-1 bg-red-950/40 hover:bg-red-900 border border-red-900/30 text-rose-200 rounded font-bold text-xs cursor-pointer transition-colors"
                          title="Incluir Advertência/Falta"
                        >
                          +
                        </button>
                        <button
                          onClick={() => adjustPenaltiesB(-1)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white rounded font-bold text-xs cursor-pointer transition-colors"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 text-xs py-10 font-mono">Segundo combatente ausente</div>
            )}
          </div>
        </div>

        {/* Action Triggers for ending the match */}
        <div className="p-6 bg-black border-t border-white/10 flex flex-col items-center justify-center space-y-4">
          <span className="text-[10px] text-slate-450 font-bold tracking-widest uppercase">Finalização da Luta e Diagnóstico de Vitória</span>

          {/* Core options Row */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            {/* 1. Standard auto result trigger */}
            <button
              onClick={handleAutoResult}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.35)] hover:scale-102 duration-150 transition-all cursor-pointer"
              title="Calcula o vencedor comparando Pontos -> Vantagens -> Punições de acordo com a CBJJ"
            >
              <Award className="w-4 h-4" /> Decisão Crítica (Pontos/Vantagens)
            </button>

            {/* 2. Referee Decision */}
            <div className="bg-[#111] border border-white/10 rounded-lg p-2.5 flex items-center gap-2">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mr-1">Decisão Unânime:</span>
              <button
                onClick={() => handleEndMatchDirectly(match.athleteA?.id || "", "DECISION")}
                className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-450 hover:bg-rose-500/25 rounded text-xxs font-bold transition-colors cursor-pointer"
              >
                Vitória Atleta A
              </button>
              <button
                onClick={() => handleEndMatchDirectly(match.athleteB?.id || "", "DECISION")}
                className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-450 hover:bg-blue-500/25 rounded text-xxs font-bold transition-colors cursor-pointer"
              >
                Vitória Atleta B
              </button>
            </div>
          </div>

          {/* Submission and DQ Row */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full border-t border-white/5 pt-4 text-xs">
            {/* Quick Submission Selector */}
            <div className="bg-[#111] border border-white/10 rounded-lg p-2.5 flex flex-wrap items-center gap-2">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mr-1">Técnica Finalizou:</span>
              <select
                value={submissionType}
                onChange={(e) => setSubmissionType(e.target.value)}
                className="bg-black text-slate-300 border border-white/10 rounded text-xxs px-2 py-1 outline-none mr-2 focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Armlock">Chave de Braço (Armlock)</option>
                <option value="Estrangulamento">Estrangulamento (Choke)</option>
                <option value="Chave de Pé">Chave de Pé (Footlock)</option>
                <option value="Leglock">Chave de Joelho (Leglock)</option>
                <option value="Kimura">Kimura</option>
                <option value="Triângulo">Triângulo (Triangle)</option>
                <option value="Guilhotina">Guilhotina (Guillotine)</option>
              </select>

              <button
                onClick={() => handleEndMatchDirectly(match.athleteA?.id || "", "SUBMISSION")}
                className="px-2.5 py-1 bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-white border border-white/5 rounded text-xxs font-bold transition-all cursor-pointer"
              >
                C/ Atleta A (Finalizou)
              </button>
              <button
                onClick={() => handleEndMatchDirectly(match.athleteB?.id || "", "SUBMISSION")}
                className="px-2.5 py-1 bg-white/5 hover:bg-blue-500/20 text-slate-300 hover:text-white border border-white/5 rounded text-xxs font-bold transition-all cursor-pointer"
              >
                C/ Atleta B (Finalizou)
              </button>
            </div>

            {/* Miscellaneous WO / DQ */}
            <div className="flex gap-2">
              <button
                onClick={() => handleEndMatchDirectly(match.athleteA?.id || "", "WO")}
                className="px-3 py-2 bg-[#111] border border-white/10 hover:bg-white/10 rounded-md text-xxs text-slate-400 font-bold uppercase tracking-wider transition-colors cursor-pointer"
                title="Vitória por ausência do atleta B"
              >
                Atleta A W.O.
              </button>
              <button
                onClick={() => handleEndMatchDirectly(match.athleteB?.id || "", "WO")}
                className="px-3 py-2 bg-[#111] border border-white/10 hover:bg-white/10 rounded-md text-xxs text-slate-400 font-bold uppercase tracking-wider transition-colors cursor-pointer"
                title="Vitória por ausência do atleta A"
              >
                Atleta B W.O.
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
