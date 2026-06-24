import type { AthletePosition, FutsalPosition, GameAthlete, GameCoach, GamePlayer } from '../types'

const names = [
  'Álvaro Luz', 'Bento Vidal', 'Caio Venturi', 'Dante Solano', 'Enzo Falcão', 'Félix Navarro', 'Gael Monteiro', 'Hugo Sanz',
  'Ícaro Valente', 'Joaquim Neri', 'Kai Moreau', 'León Duarte', 'Milo Becker', 'Nicolás Prado', 'Otávio Reis', 'Pablo Mendez',
  'Quim Ferraz', 'Ravi Costa', 'Santiago Rocha', 'Theo Laurent', 'Uriel Campos', 'Vicente Alba', 'William Brandt', 'Xavier Melo',
  'Yago Santoro', 'Zeca Fontes', 'Amaro Silveira', 'Bruno Arantes', 'Ciro Baresi', 'Davi Galvão', 'Elias Romero', 'Fabian Keller',
  'Guto Marín', 'Henrique Lobo', 'Ismael Rossi', 'Jonas Neves', 'Kevin Dubois', 'Lorenzo Lima', 'Matías Pires', 'Noah Schmitt',
  'Orlando Tavares', 'Pedro Salas', 'Raul Bernard', 'Samuel Viana', 'Tomas Aguirre', 'Ulisses Barros', 'Vítor Serra', 'Wesley Paiva',
  'Adrián Cruz', 'Benício Moraes', 'César Pinto', 'Diego Ramires', 'Esteban Fonseca', 'Franco Leal', 'Gilberto Sá', 'Heitor Martins',
  'Ivan Cortés', 'Julian Freitas', 'Klaus Werner', 'Lucca Ribas', 'Marco Villalba', 'Natan Cunha', 'Omar Castillo', 'Pierre Renard',
  'Ramon Xavier', 'Sandro Rojas', 'Tiago Nunes', 'Valentín Paz', 'André Guedes', 'Bernardo Torres', 'Cristian Lagos', 'Danilo Mafra',
  'Érico Dantas', 'Flávio Bastos', 'Gian Moretti', 'Hélio Amaral', 'Ian Andrade', 'João Veras', 'Leandro Queiroz', 'Miguel Cabral',
]

const positions: FutsalPosition[] = [
  ...Array(14).fill('GOLEIRO' as const),
  ...Array(18).fill('FIXO' as const),
  ...Array(24).fill('ALA' as const),
  ...Array(16).fill('PIVO' as const),
  ...Array(8).fill('TECNICO' as const),
]

const clamp = (value: number) => Math.max(60, Math.min(94, value))

function baseOverall(index: number, position: FutsalPosition) {
  const rareBoost = index % 19 === 0 ? 10 : index % 11 === 0 ? 5 : 0
  const positionOffset: Record<FutsalPosition, number> = { GOLEIRO: 1, FIXO: 2, ALA: 1, PIVO: 2, TECNICO: 3 }
  return clamp(72 + rareBoost + positionOffset[position] + ((index * 7) % 13) - 6)
}

function createAthlete(name: string, index: number, position: AthletePosition): GameAthlete {
  const overallOriginal = baseOverall(index, position)
  return { id: `player-${index + 1}`, name, position, overallOriginal, overall: overallOriginal, stamina: 100 }
}

function createCoach(name: string, index: number): GameCoach {
  const overallOriginal = baseOverall(index, 'TECNICO')
  return { id: `player-${index + 1}`, name, position: 'TECNICO', overallOriginal, overall: overallOriginal }
}

export const players: GamePlayer[] = names.map((name, index) => {
  const position = positions[index]
  return position === 'TECNICO' ? createCoach(name, index) : createAthlete(name, index, position)
})

export const playerById = new Map(players.map((player) => [player.id, player]))
