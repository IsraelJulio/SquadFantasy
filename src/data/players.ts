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

const countries = ['Brasil', 'Argentina', 'Uruguai', 'França', 'Alemanha', 'Espanha', 'Itália', 'Portugal', 'Holanda', 'México', 'Japão', 'Marrocos', 'Croácia', 'Colômbia', 'Chile', 'Nigéria']
const years = [1982, 1986, 1990, 1994, 1998, 2000, 2004, 2008, 2012, 2016, 2020, 2024]
const positions: FutsalPosition[] = [
  ...Array(14).fill('GOLEIRO' as const),
  ...Array(18).fill('FIXO' as const),
  ...Array(24).fill('ALA' as const),
  ...Array(16).fill('PIVO' as const),
  ...Array(8).fill('TECNICO' as const),
]

const clamp = (value: number) => Math.max(55, Math.min(96, value))

function athleteAttributes(index: number, position: AthletePosition) {
  const rareBoost = index % 19 === 0 ? 9 : index % 11 === 0 ? 4 : 0
  const pulse = (offset: number) => ((index * (offset + 7) + offset * 13) % 17) - 8
  const base = 72 + rareBoost
  const profile: Record<AthletePosition, number[]> = {
    GOLEIRO: [-18, 5, 18, -5, -15, 8, 9],
    FIXO: [-5, 6, 13, 1, 0, 9, 7],
    ALA: [5, 7, 0, 11, 10, 1, 4],
    PIVO: [14, 2, -5, 3, 8, 8, 6],
  }
  return profile[position].map((value, attributeIndex) => clamp(base + value + pulse(attributeIndex)))
}

function createAthlete(name: string, index: number, position: AthletePosition): GameAthlete {
  const [finishing, passing, marking, speed, dribbling, physical, mentality] = athleteAttributes(index, position)
  const overall = Math.round((finishing + passing + marking + speed + dribbling + physical + mentality) / 7)
  return { id: `player-${index + 1}`, kind: 'athlete', name, country: countries[index % countries.length], position, referenceYear: years[(index * 3) % years.length], finishing, passing, marking, speed, dribbling, physical, mentality, overall }
}

function createCoach(name: string, index: number): GameCoach {
  const pulse = (offset: number) => ((index * 5 + offset * 7) % 19) - 9
  const motivation = clamp(76 + pulse(0))
  const tactics = clamp(78 + pulse(1))
  const defense = clamp(74 + pulse(2))
  const attack = clamp(75 + pulse(3))
  const squadManagement = clamp(79 + pulse(4))
  const overall = Math.round((motivation + tactics + defense + attack + squadManagement) / 5)
  return { id: `player-${index + 1}`, kind: 'coach', name, country: countries[index % countries.length], position: 'TECNICO', referenceYear: years[(index * 3) % years.length], motivation, tactics, defense, attack, squadManagement, overall }
}

export const players: GamePlayer[] = names.map((name, index) => {
  const position = positions[index]
  return position === 'TECNICO' ? createCoach(name, index) : createAthlete(name, index, position)
})

export const playerById = new Map(players.map((player) => [player.id, player]))
