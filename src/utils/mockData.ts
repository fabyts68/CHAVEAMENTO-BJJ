/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Athlete, Team, Category, AgeDivision, Belt, WeightClass, Gender } from "../types";

export const mockTeams: Team[] = [
  { id: "atos", name: "Atos Jiu-Jitsu" },
  { id: "alliance", name: "Alliance" },
  { id: "gracie-barra", name: "Gracie Barra" },
  { id: "checkmat", name: "Checkmat" },
  { id: "dream-art", name: "Dream Art" },
  { id: "gfteam", name: "GFTeam" }
];

export const mockCategories: Category[] = [
  {
    id: "cat-black-adult-middle-male",
    name: "Preta / Adulto / Médio / Masculino",
    gender: Gender.MALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.MIDDLE,
    config: {
      matchTimeSeconds: 600, // 10 minutes
      hasThirdPlaceFight: false,
      pointsSystem: "IBJJF_STANDARD"
    }
  },
  {
    id: "cat-black-adult-lfeather-female",
    name: "Preta / Adulto / Pluma / Feminino",
    gender: Gender.FEMALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.LIGHT_FEATHER,
    config: {
      matchTimeSeconds: 600, // 10 minutes
      hasThirdPlaceFight: false,
      pointsSystem: "IBJJF_STANDARD"
    }
  },
  {
    id: "cat-black-master1-heavy-male",
    name: "Preta / Master 1 / Pesado / Masculino",
    gender: Gender.MALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.MASTER_1,
    weightClass: WeightClass.HEAVY,
    config: {
      matchTimeSeconds: 360, // 6 minutes (Master 1 is usually 6 mins for Black belt)
      hasThirdPlaceFight: false,
      pointsSystem: "IBJJF_STANDARD"
    }
  },
  {
    id: "cat-blue-adult-absolute-male",
    name: "Azul / Adulto / Absoluto / Masculino",
    gender: Gender.MALE,
    belt: Belt.BLUE,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.ABSOLUTE,
    config: {
      matchTimeSeconds: 360, // 6 minutes
      hasThirdPlaceFight: false,
      pointsSystem: "IBJJF_STANDARD"
    }
  },
  {
    id: "cat-grey-premirim-light-male",
    name: "Cinza / Pré-Mirim (2-3 anos) / Leve / Masculino",
    gender: Gender.MALE,
    belt: Belt.GREY,
    ageDivision: AgeDivision.PRE_MIRIM_2_3,
    weightClass: WeightClass.LIGHT,
    config: {
      matchTimeSeconds: 120, // 2 minutes
      hasThirdPlaceFight: false,
      pointsSystem: "IBJJF_STANDARD"
    }
  },
  {
    id: "cat-black-master7-heavy-male",
    name: "Preta / Master 7 / Pesadíssimo / Masculino",
    gender: Gender.MALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.MASTER_7,
    weightClass: WeightClass.ULTRA_HEAVY,
    config: {
      matchTimeSeconds: 300, // 5 minutes
      hasThirdPlaceFight: false,
      pointsSystem: "IBJJF_STANDARD"
    }
  }
];

export const mockAthletes: Athlete[] = [
  // Category 1: Black Belt Adult Middle Male (6 Athletes - testing team shielding & power of 2)
  {
    id: "ath1",
    name: "Tainan Dalpra",
    team: mockTeams[0], // Atos
    rankingPoints: 1500, // Seed 1
    gender: Gender.MALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.MIDDLE,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath2",
    name: "Jansen Gomes",
    team: mockTeams[3], // Checkmat
    rankingPoints: 1250, // Seed 2
    gender: Gender.MALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.MIDDLE,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath3",
    name: "Gabriel Arges",
    team: mockTeams[2], // Gracie Barra
    rankingPoints: 1100, // Seed 3
    gender: Gender.MALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.MIDDLE,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath4",
    name: "Isaque Bahiense",
    team: mockTeams[4], // Dream Art
    rankingPoints: 1050, // Seed 4
    gender: Gender.MALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.MIDDLE,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath5",
    name: "Ronaldo Junior",
    team: mockTeams[0], // Atos (Teammate of Tainan - MUST stay on opposite halves or quadrants)
    rankingPoints: 950,
    gender: Gender.MALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.MIDDLE,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath6",
    name: "Otávio Sousa",
    team: mockTeams[2], // Gracie Barra (Teammate of Gabriel Arges - MUST be shielded)
    rankingPoints: 850,
    gender: Gender.MALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.MIDDLE,
    checkIn: { weightOk: true, giOk: true }
  },

  // Category 2: Black Belt Adult Light Feather Female (3 Athletes - testing 3-athlete bracket)
  {
    id: "ath7",
    name: "Mayssa Bastos",
    team: mockTeams[0], // Atos
    rankingPoints: 1400, // Seed 1 - Gets BYE to Final
    gender: Gender.FEMALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.LIGHT_FEATHER,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath8",
    name: "Jessa Khan",
    team: mockTeams[0], // Atos
    rankingPoints: 1100, // Seed 2
    gender: Gender.FEMALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.LIGHT_FEATHER,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath9",
    name: "Bianca Basílio",
    team: mockTeams[5], // GFTeam
    rankingPoints: 950, // Seed 3
    gender: Gender.FEMALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.LIGHT_FEATHER,
    checkIn: { weightOk: true, giOk: true }
  },

  // Category 3: Black Belt Master 1 Heavy Male (1 Athlete - testing 1-athlete single winner gold)
  {
    id: "ath10",
    name: "Rômulo Barral",
    team: mockTeams[2], // Gracie Barra
    rankingPoints: 1600, // Seed 1
    gender: Gender.MALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.MASTER_1,
    weightClass: WeightClass.HEAVY,
    checkIn: { weightOk: true, giOk: true }
  },

  // Category 4: Blue Belt Adult Absolute Male (5 Athletes)
  {
    id: "ath11",
    name: "Carlos Eduardo",
    team: mockTeams[1], // Alliance
    rankingPoints: 500,
    gender: Gender.MALE,
    belt: Belt.BLUE,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.ABSOLUTE,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath12",
    name: "Felipe Silva",
    team: mockTeams[2], // Gracie Barra
    rankingPoints: 420,
    gender: Gender.MALE,
    belt: Belt.BLUE,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.ABSOLUTE,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath13",
    name: "Mateus Santos",
    team: mockTeams[3], // Checkmat
    rankingPoints: 310,
    gender: Gender.MALE,
    belt: Belt.BLUE,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.ABSOLUTE,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath14",
    name: "Bruno Lima",
    team: mockTeams[1], // Alliance (Teammate of Carlos Eduardo - shielded)
    rankingPoints: 200,
    gender: Gender.MALE,
    belt: Belt.BLUE,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.ABSOLUTE,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath15",
    name: "Rodrigo Gomes",
    team: mockTeams[0], // Atos
    rankingPoints: 150,
    gender: Gender.MALE,
    belt: Belt.BLUE,
    ageDivision: AgeDivision.ADULT,
    weightClass: WeightClass.ABSOLUTE,
    checkIn: { weightOk: true, giOk: true }
  },
  // Category 5: Cinza / Pré-Mirim (2-3 anos) / Leve / Masculino (4 Athletes)
  {
    id: "ath16",
    name: "Bernardo Silva",
    team: mockTeams[0], // Atos
    rankingPoints: 300,
    gender: Gender.MALE,
    belt: Belt.GREY,
    ageDivision: AgeDivision.PRE_MIRIM_2_3,
    weightClass: WeightClass.LIGHT,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath17",
    name: "Benjamin Gomes",
    team: mockTeams[1], // Alliance
    rankingPoints: 250,
    gender: Gender.MALE,
    belt: Belt.GREY,
    ageDivision: AgeDivision.PRE_MIRIM_2_3,
    weightClass: WeightClass.LIGHT,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath18",
    name: "Lorenzo Santos",
    team: mockTeams[3], // Checkmat
    rankingPoints: 180,
    gender: Gender.MALE,
    belt: Belt.GREY,
    ageDivision: AgeDivision.PRE_MIRIM_2_3,
    weightClass: WeightClass.LIGHT,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath19",
    name: "Davi Lucas",
    team: mockTeams[2], // Gracie Barra
    rankingPoints: 120,
    gender: Gender.MALE,
    belt: Belt.GREY,
    ageDivision: AgeDivision.PRE_MIRIM_2_3,
    weightClass: WeightClass.LIGHT,
    checkIn: { weightOk: true, giOk: true }
  },
  // Category 6: Preta / Master 7 / Pesadíssimo / Masculino (2 Athletes)
  {
    id: "ath20",
    name: "Helio Gracie Filho",
    team: mockTeams[2], // Gracie Barra
    rankingPoints: 950,
    gender: Gender.MALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.MASTER_7,
    weightClass: WeightClass.ULTRA_HEAVY,
    checkIn: { weightOk: true, giOk: true }
  },
  {
    id: "ath21",
    name: "Francisco Mansur",
    team: mockTeams[1], // Alliance
    rankingPoints: 700,
    gender: Gender.MALE,
    belt: Belt.BLACK,
    ageDivision: AgeDivision.MASTER_7,
    weightClass: WeightClass.ULTRA_HEAVY,
    checkIn: { weightOk: true, giOk: true }
  }
];
