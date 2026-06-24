import type { Difficulty, Strategy } from "../types";

export interface DifficultySettings {
  label: string;
  description: string;
  userStrengthBoost: number;
  underdogTargetRatio: number;
  maximumStrengthBoost: number;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  CASUAL: {
    label: "Casual",
    description: "Overal visível no draft e 3 pulos disponíveis.",
    userStrengthBoost: 1.08,
    underdogTargetRatio: 1.22,
    maximumStrengthBoost: 1.45,
  },
  NORMAL: {
    label: "Normal",
    description: "Overal oculto 1 pulo disponível.",
    userStrengthBoost: 1.05,
    underdogTargetRatio: 1.15,
    maximumStrengthBoost: 1.4,
  },
  CHALLENGE: {
    label: "Desafio",
    description: "Só pra quem conhece a fantasy.",
    userStrengthBoost: 1,
    underdogTargetRatio: 1,
    maximumStrengthBoost: 1,
  },
};

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
