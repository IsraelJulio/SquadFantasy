import type { DraftTeam, FutsalPosition, GamePlayer } from '../types'
import { players } from './players'

const teamMetadata = [
  { id: 'auriverde-1982', name: 'Auriverde Futsal', country: 'Brasil', referenceYear: 1982 },
  { id: 'albiceleste-1986', name: 'Albiceleste', country: 'Argentina', referenceYear: 1986 },
  { id: 'furia-2000', name: 'Fúria Ibérica', country: 'Espanha', referenceYear: 2000 },
  { id: 'azzurra-2004', name: 'Azzurra Calcio a 5', country: 'Itália', referenceYear: 2004 },
  { id: 'lusitania-2008', name: 'Lusitânia', country: 'Portugal', referenceYear: 2008 },
  { id: 'oranje-2012', name: 'Oranje Total', country: 'Países Baixos', referenceYear: 2012 },
  { id: 'celeste-2016', name: 'Celeste Olímpica', country: 'Uruguai', referenceYear: 2016 },
  { id: 'tricolor-2020', name: 'Tricolor Continental', country: 'França', referenceYear: 2020 },
] as const

const positions: FutsalPosition[] = ['GOLEIRO', 'FIXO', 'ALA', 'PIVO']
const athletesByTeam = teamMetadata.map(() => [] as GamePlayer[])

for (const position of positions) {
  players.filter((player) => player.position === position).forEach((player, index) => {
    athletesByTeam[index % teamMetadata.length].push(player)
  })
}

const coaches = players.filter((player) => player.position === 'TECNICO')

export const draftTeams: DraftTeam[] = teamMetadata.map((team, index) => ({
  ...team,
  players: [...athletesByTeam[index], coaches[index]].filter((player): player is GamePlayer => Boolean(player)),
}))
