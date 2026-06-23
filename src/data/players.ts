import type { GamePlayer, Position } from '../types'

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
const years = [1950, 1958, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022]
const positions: Position[] = [
  ...Array(12).fill('Goleiro' as const),
  ...Array(18).fill('Zagueiro' as const),
  ...Array(14).fill('Lateral' as const),
  ...Array(20).fill('Meio-campo' as const),
  ...Array(16).fill('Atacante' as const),
]

function clamp(value: number) {
  return Math.max(55, Math.min(96, value))
}

function attributes(index: number, position: Position) {
  const rareBoost = index % 19 === 0 ? 10 : index % 11 === 0 ? 5 : 0
  const pulse = (offset: number) => ((index * (offset + 7) + offset * 13) % 19) - 9
  const base = 72 + rareBoost
  const profile = {
    Goleiro: [-24, 14, 1, -3, 7, 9],
    Zagueiro: [-14, 13, -1, -1, 9, 6],
    Lateral: [-3, 5, 3, 10, 3, 2],
    'Meio-campo': [4, 3, 12, 2, 0, 6],
    Atacante: [14, -13, 8, 8, 3, 4],
  }[position]
  return profile.map((value, attributeIndex) => clamp(base + value + pulse(attributeIndex)))
}

export const players: GamePlayer[] = names.map((name, index) => {
  const position = positions[index]
  const [attack, defense, technique, speed, physical, mentality] = attributes(index, position)
  const weights = position === 'Goleiro' ? [0.03, 0.35, 0.12, 0.05, 0.2, 0.25] : [0.2, 0.18, 0.2, 0.14, 0.13, 0.15]
  const values = [attack, defense, technique, speed, physical, mentality]
  const overall = Math.round(values.reduce((sum, value, attributeIndex) => sum + value * weights[attributeIndex], 0))
  return {
    id: `player-${index + 1}`,
    name,
    country: countries[index % countries.length],
    position,
    referenceYear: years[(index * 3) % years.length],
    attack,
    defense,
    technique,
    speed,
    physical,
    mentality,
    overall,
  }
})

export const playerById = new Map(players.map((player) => [player.id, player]))
