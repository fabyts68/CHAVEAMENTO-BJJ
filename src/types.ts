/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AgeDivision {
  PRE_MIRIM_2_3 = "Pré-Mirim (2-3 anos)",
  PRE_MIRIM = "Pré-Mirim",
  MIRIM = "Mirim",
  INFANTIL = "Infantil",
  INFANTO_JUVENIL = "Infanto-Juvenil",
  JUVENIL = "Juvenil",
  ADULT = "Adulto",
  MASTER_1 = "Master 1",
  MASTER_2 = "Master 2",
  MASTER_3 = "Master 3",
  MASTER_4 = "Master 4",
  MASTER_5 = "Master 5",
  MASTER_6 = "Master 6",
  MASTER_7 = "Master 7"
}

export enum Belt {
  GREY = "Cinza",
  WHITE = "Branca",
  BLUE = "Azul",
  PURPLE = "Roxa",
  BROWN = "Marrom",
  BLACK = "Preta"
}

export enum WeightClass {
  ROOSTER = "Galo",
  LIGHT_FEATHER = "Pluma",
  FEATHER = "Pena",
  LIGHT = "Leve",
  MIDDLE = "Médio",
  MEDIUM_HEAVY = "Meio-Pesado",
  HEAVY = "Pesado",
  SUPER_HEAVY = "Super-Pesado",
  ULTRA_HEAVY = "Pesadíssimo",
  ABSOLUTE = "Absoluto"
}

export enum Gender {
  MALE = "Masculino",
  FEMALE = "Feminino"
}

export interface Team {
  id: string;
  name: string;
}

export interface Athlete {
  id: string;
  name: string;
  team: Team;
  rankingPoints: number;
  gender: Gender;
  belt: Belt;
  ageDivision: AgeDivision;
  weightClass: WeightClass;
  checkIn: {
    weightOk: boolean;
    giOk: boolean;
  };
}

export interface CategoryConfig {
  matchTimeSeconds: number; // e.g. 600
  hasThirdPlaceFight: boolean;
  pointsSystem: "IBJJF_STANDARD" | "ADCC";
}

export interface Category {
  id: string;
  name: string;
  gender: Gender;
  belt: Belt;
  ageDivision: AgeDivision;
  weightClass: WeightClass;
  config: CategoryConfig;
}

export type MatchStatus = "PENDING" | "RUNNING" | "COMPLETED" | "BYE" | "PAUSED";

export interface MatchScore {
  athleteId: string;
  points: number;
  advantages: number;
  penalties: number;
}

export interface Match {
  matchId: string;
  roundNumber: number; // 1 = round of 32/16/8 etc, 2 = quarters, ...
  positionNumber: number; // 0-indexed position within that round
  athleteA: Athlete | null; // null means waiting or bye
  athleteB: Athlete | null; // null means waiting or bye
  isBye: boolean;
  winnerId: string | null;
  winReason: "POINTS" | "SUBMISSION" | "DISQUALIFICATION" | "WO" | "ADVANTAGES" | "PENALties" | "DECISION" | null;
  scoreA: MatchScore;
  scoreB: MatchScore;
  status: MatchStatus;
  timerSeconds: number; // remaining match time
  nextMatchId: string | null; // ID of the match the winner goes to
  nextMatchSlot: "A" | "B" | null; // does the winner go to athleteA or athleteB slot?
}

export interface Bracket {
  categoryId: string;
  totalRounds: number;
  bracketSize: number; // power of 2
  matches: Match[];
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO String
  user: string;
  action: string;
  details: string;
}
