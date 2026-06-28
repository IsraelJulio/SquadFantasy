import type { Difficulty, Strategy } from "../types";

export interface DifficultySettings {
  difficulty: Difficulty;
  label: string;
  description: string;
  maxTeamRerolls: number;
  showDraftPlayerOverall: boolean;
  userStrengthBoost: number;
  underdogTargetRatio: number;
  maximumStrengthBoost: number;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  CASUAL: {
    difficulty: "CASUAL",
    label: "Casual",
    maxTeamRerolls: 3,
    showDraftPlayerOverall: true,
    description: "Mostra overall no draft e permite sortear nova equipe até 3 vezes.",
    userStrengthBoost: 1.08,
    underdogTargetRatio: 1.22,
    maximumStrengthBoost: 1.45,
  },
  NORMAL: {
    difficulty: "NORMAL",
    label: "Normal",
    maxTeamRerolls: 1,
    showDraftPlayerOverall: false,
    description: "Oculta overall no draft e permite sortear nova equipe 1 vez.",
    userStrengthBoost: 1.05,
    underdogTargetRatio: 1.15,
    maximumStrengthBoost: 1.4,
  },
  CHALLENGE: {
    difficulty: "CHALLENGE",
    label: "Desafio",
    maxTeamRerolls: 0,
    showDraftPlayerOverall: false,
    description: "Oculta overall no draft e não permite sortear nova equipe.",
    userStrengthBoost: 1,
    underdogTargetRatio: 1,
    maximumStrengthBoost: 1.28,
  },
};

export function canRerollTeam(difficulty: Difficulty, teamRerollsUsed: number): boolean {
  return teamRerollsUsed < DIFFICULTY_SETTINGS[difficulty].maxTeamRerolls;
}

export function getRemainingTeamRerolls(difficulty: Difficulty, teamRerollsUsed: number): number {
  return Math.max(0, DIFFICULTY_SETTINGS[difficulty].maxTeamRerolls - teamRerollsUsed);
}

export function shouldShowDraftPlayerOverall(difficulty: Difficulty): boolean {
  return DIFFICULTY_SETTINGS[difficulty].showDraftPlayerOverall;
}

interface TacticalAdvantage {
  winner: Strategy;
  loser: Strategy;
  edge: number;
}

const tacticalAdvantages: TacticalAdvantage[] = [
  { winner: "Contra-ataque", loser: "Ofensivo", edge: 0.04 },
  { winner: "Posse de bola", loser: "Defensivo", edge: 0.04 },
  { winner: "Defensivo", loser: "Ofensivo", edge: 0.03 },
  { winner: "Ofensivo", loser: "Posse de bola", edge: 0.03 },
];

export interface TacticalMatchup {
  edge: number;
  userBoost: number;
  opponentBoost: number;
}

export function calculateTacticalMatchup(
  userStrategy: Strategy,
  opponentStrategy: Strategy,
): TacticalMatchup {
  const matchup = tacticalAdvantages.find(
    ({ winner, loser }) =>
      (winner === userStrategy && loser === opponentStrategy) ||
      (winner === opponentStrategy && loser === userStrategy),
  );
  if (!matchup) return { edge: 0, userBoost: 1, opponentBoost: 1 };
  const edge = matchup.winner === userStrategy ? matchup.edge : -matchup.edge;
  return { edge, userBoost: 1 + edge / 2, opponentBoost: 1 - edge / 2 };
}

export function calculateDifficultyBoost(
  difficulty: Difficulty,
  userStrength?: number,
  opponentStrength?: number,
): number {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  if (!userStrength || !opponentStrength || userStrength >= opponentStrength)
    return settings.userStrengthBoost;
  const underdogBoost =
    (opponentStrength / userStrength) * settings.underdogTargetRatio;
  return Math.min(
    settings.maximumStrengthBoost,
    Math.max(settings.userStrengthBoost, underdogBoost),
  );
}
