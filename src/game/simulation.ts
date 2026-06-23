import type { Formation, GameMatch, GamePlayer, Opponent, Stage, Strategy } from '../types'
import { hashSeed, seededRandom } from './random'
import { calculateSquadStrength } from './squad'

function poisson(lambda: number, random: () => number) {
  const threshold = Math.exp(-lambda)
  let product = 1
  let value = 0
  do {
    value += 1
    product *= random()
  } while (product > threshold)
  return value - 1
}

export function simulateMatch(
  campaignId: string,
  matchNumber: number,
  squad: GamePlayer[],
  formation: Formation,
  strategy: Strategy,
  opponent: Opponent,
  stage: Stage,
): GameMatch {
  const random = seededRandom(hashSeed(`${campaignId}-${matchNumber}-${opponent.id}-${Date.now()}`))
  const strength = calculateSquadStrength(squad, formation, strategy)
  const userControl = strength.midfield - opponent.midfield
  const userChance = 1.15 + (strength.attack - opponent.defense) / 22 + userControl / 65 + (strength.compatibility - 85) / 80
  const opponentChance = 1.1 + (opponent.attack - strength.defense) / 22 - userControl / 75
  let userScore = Math.min(6, poisson(Math.max(0.25, userChance), random))
  let opponentScore = Math.min(6, poisson(Math.max(0.25, opponentChance), random))
  let decidedOnPenalties = false

  if (stage !== 'Fase de grupos' && userScore === opponentScore) {
    decidedOnPenalties = true
    const edge = (strength.overall + strength.compatibility / 10 - opponent.level) / 30
    if (random() + edge >= 0.5) userScore += 1
    else opponentScore += 1
  }

  const result = userScore > opponentScore ? 'victory' : userScore < opponentScore ? 'defeat' : 'draw'
  const candidates = result === 'defeat'
    ? [`Camisa 10 do ${opponent.name}`, `Goleiro do ${opponent.name}`]
    : [...squad].sort((a, b) => b.overall - a.overall).slice(0, 4).map((player) => player.name)
  const manOfTheMatch = candidates[Math.floor(random() * candidates.length)]
  const tone = result === 'victory'
    ? 'Seu esquadrão controlou os momentos decisivos e confirmou a vitória.'
    : result === 'defeat'
      ? `${opponent.name} aproveitou melhor as oportunidades e fechou os espaços.`
      : 'Um duelo equilibrado, com alternância de domínio até o apito final.'
  const penaltyText = decidedOnPenalties ? ' A vaga foi decidida nos pênaltis após um empate no tempo normal.' : ''

  return {
    id: crypto.randomUUID(),
    stage,
    opponentName: `${opponent.name} ${opponent.year}`,
    userScore,
    opponentScore,
    result,
    summary: `${tone}${penaltyText}`,
    manOfTheMatch,
    decidedOnPenalties,
    createdAt: new Date().toISOString(),
  }
}
