/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Athlete, Bracket, Match, MatchStatus, Category, Belt, AgeDivision } from "../types";

/**
 * Computes standard seeding order indices for brackets of size S (power of 2).
 * Returns array of 1-based seed numbers.
 * Example for size 4: [1, 4, 2, 3]
 * Example for size 8: [1, 8, 4, 5, 2, 7, 3, 6]
 */
export function getSeedingOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const nextOrder: number[] = [];
    const target = order.length * 2 + 1;
    for (const val of order) {
      nextOrder.push(val);
      nextOrder.push(target - val);
    }
    order = nextOrder;
  }
  return order;
}

/**
 * Calculates conflict score for placing an athlete at a specific slot index.
 * We want to penalize:
 * 1. Teammates facing each other in the first round (slotIndex ^ 1) -> Severe penalty (+1000)
 * 2. Teammates in the same quadrant -> Moderate penalty (+100)
 * 3. Teammates in the same half -> Small penalty (+10)
 * 4. Deviation from standard seed index -> Symmetrical small penalty to stabilize positions
 */
function getConflictScore(
  slotIndex: number,
  athlete: Athlete,
  slots: (Athlete | null)[],
  standardIndex: number
): number {
  let score = 0;
  const size = slots.length;

  if (slots[slotIndex] !== null) {
    return Infinity; // Already occupied
  }

  // 1. Direct first-round opponent check
  const opponentIndex = slotIndex ^ 1;
  const opponent = slots[opponentIndex];
  if (opponent && opponent.team.id === athlete.team.id) {
    score += 1000;
  }

  // 2. Quadrant check (for size >= 8)
  if (size >= 8) {
    const quadSize = size / 4;
    const currentQuad = Math.floor(slotIndex / quadSize);
    for (let i = 0; i < size; i++) {
      if (i !== slotIndex && Math.floor(i / quadSize) === currentQuad) {
        const other = slots[i];
        if (other && other.team.id === athlete.team.id) {
          score += 100;
        }
      }
    }
  }

  // 3. Half-bracket check (for size >= 4)
  if (size >= 4) {
    const halfSize = size / 2;
    const currentHalf = Math.floor(slotIndex / halfSize);
    for (let i = 0; i < size; i++) {
      if (i !== slotIndex && Math.floor(i / halfSize) === currentHalf) {
        const other = slots[i];
        if (other && other.team.id === athlete.team.id) {
          score += 10;
        }
      }
    }
  }

  // 4. Deviation from seed index spacing to match the brackets naturally
  score += Math.abs(slotIndex - standardIndex) * 0.1;

  return score;
}

/**
 * The "Team Shield" distribution algorithm.
 * Fills bracket slots with athletes, balancing rankings (seeding) with team segregation.
 */
export function distributeAthletes(athletes: Athlete[], bracketSize: number, teamShieldEnabled: boolean = true): (Athlete | null)[] {
  const slots: (Athlete | null)[] = new Array(bracketSize).fill(null);

  // Sort athletes by ranking points: descending
  const sorted = [...athletes].sort((a, b) => b.rankingPoints - a.rankingPoints);

  // Standard seeding seed order (e.g., [1, 8, 4, 5, 2, 7, 3, 6])
  const seedOrder = getSeedingOrder(bracketSize);

  // Map from seed 1-based number to slot position in bracket
  // seedPositions[i] is the slot index in the bracket for Seed (i+1)
  const seedPositions: number[] = new Array(bracketSize);
  for (let i = 0; i < bracketSize; i++) {
    seedPositions[seedOrder[i] - 1] = i;
  }

  // Se o Team-Shield estiver desativado, posiciona de acordo com o seeding padrão rigorosamente
  if (!teamShieldEnabled) {
    for (let i = 0; i < sorted.length; i++) {
      const athlete = sorted[i];
      if (i < bracketSize) {
        slots[seedPositions[i]] = athlete;
      }
    }
    return slots;
  }

  // Place athletes one-by-one (com Team-Shield ativo)
  for (let i = 0; i < sorted.length; i++) {
    const athlete = sorted[i];

    // Standard index where current athlete (seed i+1) would normally be placed
    const standardIndex = i < bracketSize ? seedPositions[i] : i;

    // Search for best slot to minimize conflict
    let bestSlot = -1;
    let minScore = Infinity;

    for (let s = 0; s < bracketSize; s++) {
      const score = getConflictScore(s, athlete, slots, standardIndex);
      if (score < minScore) {
        minScore = score;
        bestSlot = s;
      }
    }

    if (bestSlot !== -1) {
      slots[bestSlot] = athlete;
    }
  }

  return slots;
}

/**
 * Standard match durations by Belt and Age Division based on IBJJF rules:
 * - Adulto Black Belt: 10 mins (600s)
 * - Adulto Brown Belt: 8 mins (480s)
 * - Adulto Purple Belt: 7 mins (420s)
 * - Adulto Blue Belt: 6 mins (360s)
 * - Adulto White Belt: 5 mins (300s)
 * Masters generally have 5 or 6 minutes. Kids have 2, 3, or 4 minutes.
 */
export function getDefaultMatchDuration(belt: Belt, age: AgeDivision): number {
  if (age.startsWith("Pre-Mirim") || age.includes("Pré-Mirim")) return 120; // 2 min
  if (age.includes("Mirim")) return 180; // 3 min
  if (age.includes("Infantil")) return 240; // 4 min
  if (age.includes("Infanto-Juvenil")) return 240; // 4 min
  if (age.includes("Juvenil")) return 300; // 5 min

  const isMaster = age.startsWith("Master");

  if (isMaster) {
    if (belt === Belt.WHITE) return 300; // 5 min
    return 360; // 6 min (Masters Blue to Black typically get 6m in IBJJF)
  }

  // Adult
  switch (belt) {
    case Belt.WHITE:
      return 300; // 5 min
    case Belt.BLUE:
      return 360; // 6 min
    case Belt.PURPLE:
      return 420; // 7 min
    case Belt.BROWN:
      return 480; // 8 min
    case Belt.BLACK:
      return 600; // 10 min
    default:
      return 300;
  }
}

/**
 * Builds the complete multi-round tournament bracket from distributed slots.
 */
export function generateBracket(category: Category, athletes: Athlete[], teamShieldEnabled: boolean = true): Bracket {
  const count = athletes.length;
  let bracketSize = 2;
  if (count > 0) {
    bracketSize = Math.pow(2, Math.ceil(Math.log2(count)));
    if (bracketSize < 2) bracketSize = 2;
  }

  const slots = distributeAthletes(athletes, bracketSize, teamShieldEnabled);
  const totalRounds = Math.log2(bracketSize);

  // Initialize all matches across all rounds
  const matches: Match[] = [];

  // Generate blank matches for all rounds
  for (let r = 1; r <= totalRounds; r++) {
    const numMatches = bracketSize / Math.pow(2, r);
    for (let p = 0; p < numMatches; p++) {
      const matchId = `m-${r}-${p}`;
      const nextMatchId = r < totalRounds ? `m-${r+1}-${Math.floor(p / 2)}` : null;
      const nextMatchSlot = r < totalRounds ? (p % 2 === 0 ? "A" : "B") : null;

      const emptyScore = (athleteId: string) => ({
        athleteId,
        points: 0,
        advantages: 0,
        penalties: 0,
      });

      matches.push({
        matchId,
        roundNumber: r,
        positionNumber: p,
        athleteA: null,
        athleteB: null,
        isBye: false,
        winnerId: null,
        winReason: null,
        scoreA: emptyScore(""),
        scoreB: emptyScore(""),
        status: "PENDING",
        timerSeconds: category.config.matchTimeSeconds,
        nextMatchId,
        nextMatchSlot,
      });
    }
  }

  // Fill in Round 1 matches from our distributed slots
  const round1Matches = matches.filter((m) => m.roundNumber === 1);
  for (let j = 0; j < round1Matches.length; j++) {
    const m = round1Matches[j];
    const athA = slots[2 * j] || null;
    const athB = slots[2 * j + 1] || null;

    m.athleteA = athA;
    m.athleteB = athB;
    m.scoreA.athleteId = athA ? athA.id : "";
    m.scoreB.athleteId = athB ? athB.id : "";

    // If both slots are empty, it's an empty match structure
    // If only one is active, it's a BYE
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
    } else if (!athA && !athB) {
      m.status = "PENDING";
    }
  }

  // Recursively propagate BYEs to subsequent rounds so the bracket starts in a valid state
  propagateWinners(matches);

  return {
    categoryId: category.id,
    totalRounds,
    bracketSize,
    matches,
  };
}

/**
 * Recursively propagates winners of completed matches/BYEs to their next matches.
 */
export function propagateWinners(matches: Match[]): void {
  // Process round by round from R = 1 upwards to ensure correct sequence of progression
  const maxRound = Math.max(...matches.map((m) => m.roundNumber), 1);

  for (let r = 1; r <= maxRound; r++) {
    const roundMatches = matches.filter((m) => m.roundNumber === r);

    for (const m of roundMatches) {
      // If a match is completed or is a BYE and has a winner
      const hasWinner = m.winnerId !== null;
      const isBye = m.isBye;

      if ((m.status === "COMPLETED" || m.status === "BYE" || isBye) && hasWinner && m.nextMatchId) {
        const nextMatch = matches.find((nm) => nm.matchId === m.nextMatchId);
        if (nextMatch) {
          const winnerAthlete =
            m.athleteA?.id === m.winnerId
              ? m.athleteA
              : m.athleteB?.id === m.winnerId
              ? m.athleteB
              : null;

          if (winnerAthlete) {
            if (m.nextMatchSlot === "A") {
              nextMatch.athleteA = winnerAthlete;
              nextMatch.scoreA.athleteId = winnerAthlete.id;
            } else if (m.nextMatchSlot === "B") {
              nextMatch.athleteB = winnerAthlete;
              nextMatch.scoreB.athleteId = winnerAthlete.id;
            }

            // Check if this next round match has now become a BYE (e.g., if it has only A and B is empty and cannot be filled)
            // Wait, B could be filled later by another match, so we only auto-bye if there's genuinely no potential path
            // to fill it. But since it's a binary tree, we shouldn't prematurely auto-bye a Round 2 match unless both branches are resolved.
          }
        }
      }
    }
  }

  // Check for auto-byes in subsequent rounds.
  // A match in round R > 1 can be declared a BYE if:
  // - It has 1 athlete AND the other slot can NEVER be populated because there are no athletes on that entire branch of the tree.
  // Let's check for each match from Round 2 upwards
  for (let r = 2; r <= maxRound; r++) {
    const roundMatches = matches.filter((m) => m.roundNumber === r);
    for (const m of roundMatches) {
      if (m.status === "COMPLETED" || m.status === "BYE") continue;

      // Check if both potential source branches are dead ends
      // For slot A: source match is round r-1 position 2*p
      // For slot B: source match is round r-1 position 2*p + 1
      const srcMatchA = matches.find((nm) => nm.roundNumber === r - 1 && nm.positionNumber === m.positionNumber * 2);
      const srcMatchB = matches.find((nm) => nm.roundNumber === r - 1 && nm.positionNumber === m.positionNumber * 2 + 1);

      // Has anyone been placed or has any potential to advance on branches?
      const canAAdvance = srcMatchA ? hasAtheleteOrPotential(srcMatchA, matches) : false;
      const canBAdvance = srcMatchB ? hasAtheleteOrPotential(srcMatchB, matches) : false;

      if (canAAdvance && !canBAdvance && m.athleteA) {
        // Only A can ever be filled, B is dead. It's a BYE!
        m.isBye = true;
        m.status = "BYE";
        m.winnerId = m.athleteA.id;
        m.winReason = "WO";
      } else if (!canAAdvance && canBAdvance && m.athleteB) {
        // Only B can ever be filled, A is dead. It's a BYE!
        m.isBye = true;
        m.status = "BYE";
        m.winnerId = m.athleteB.id;
        m.winReason = "WO";
      } else if (!canAAdvance && !canBAdvance) {
        // No one can ever reach this match
        m.status = "PENDING";
        m.athleteA = null;
        m.athleteB = null;
      }
    }
  }

  // Run propagation once more in case subsequent BYEs were activated
  for (let r = 1; r <= maxRound; r++) {
    const roundMatches = matches.filter((m) => m.roundNumber === r);
    for (const m of roundMatches) {
      if ((m.status === "COMPLETED" || m.status === "BYE") && m.winnerId && m.nextMatchId) {
        const nextMatch = matches.find((nm) => nm.matchId === m.nextMatchId);
        if (nextMatch) {
          const winnerAthlete =
            m.athleteA?.id === m.winnerId
              ? m.athleteA
              : m.athleteB?.id === m.winnerId
              ? m.athleteB
              : null;
          if (winnerAthlete) {
            if (m.nextMatchSlot === "A") {
              nextMatch.athleteA = winnerAthlete;
              nextMatch.scoreA.athleteId = winnerAthlete.id;
            } else if (m.nextMatchSlot === "B") {
              nextMatch.athleteB = winnerAthlete;
              nextMatch.scoreB.athleteId = winnerAthlete.id;
            }
          }
        }
      }
    }
  }
}

/**
 * Helper to check if a match has athletes or potential upcoming winners to fill it.
 */
function hasAtheleteOrPotential(m: Match, allMatches: Match[]): boolean {
  if (m.athleteA || m.athleteB) return true;
  // If it doesn't have athletes, it could get them if the preceding matches have athletes or potential
  const srcA = allMatches.find((nm) => nm.roundNumber === m.roundNumber - 1 && nm.positionNumber === m.positionNumber * 2);
  const srcB = allMatches.find((nm) => nm.roundNumber === m.roundNumber - 1 && nm.positionNumber === m.positionNumber * 2 + 1);

  const potA = srcA ? hasAtheleteOrPotential(srcA, allMatches) : false;
  const potB = srcB ? hasAtheleteOrPotential(srcB, allMatches) : false;

  return potA || potB;
}

/**
 * Set a winner for a direct match, updating score and propagating winners upstream.
 */
export function setMatchWinner(
  matches: Match[],
  matchId: string,
  winnerId: string,
  winReason: Match["winReason"],
  scoreA: Match["scoreA"],
  scoreB: Match["scoreB"]
): void {
  const match = matches.find((m) => m.matchId === matchId);
  if (!match) return;

  match.winnerId = winnerId;
  match.winReason = winReason;
  match.scoreA = { ...scoreA };
  match.scoreB = { ...scoreB };
  match.status = "COMPLETED";

  // Reset trailing match slots if those athletes advanced previously under older results
  clearDownstreamSlots(matches, match);

  // Propagate newest changes
  propagateWinners(matches);
}

/**
 * Recursively clears slots of downstream matches if a results override occurs
 * in a historical match. Prevents phantom duplicated state.
 */
function clearDownstreamSlots(matches: Match[], currentMatch: Match): void {
  if (!currentMatch.nextMatchId) return;

  const nextMatch = matches.find((m) => m.matchId === currentMatch.nextMatchId);
  if (!nextMatch) return;

  // Clear the slot filled by this match
  if (currentMatch.nextMatchSlot === "A") {
    nextMatch.athleteA = null;
    nextMatch.scoreA = { athleteId: "", points: 0, advantages: 0, penalties: 0 };
  } else if (currentMatch.nextMatchSlot === "B") {
    nextMatch.athleteB = null;
    nextMatch.scoreB = { athleteId: "", points: 0, advantages: 0, penalties: 0 };
  }

  // If next match was completed, undo it as its inputs have changed
  nextMatch.winnerId = null;
  nextMatch.winReason = null;
  nextMatch.status = "PENDING";

  clearDownstreamSlots(matches, nextMatch);
}
