import type {
  AthletePosition,
  DraftTeam,
  Formation,
  GameAthlete,
  GameCoach,
  GamePlayer,
  Opponent,
  Strategy,
} from "../types";
import databaseJson from "./futsalDatabase.json";

export type FutsalPlayerPosition = AthletePosition;
export type CoachPosition = "TECNICO";
export type GameRole = "PLAYER" | "COACH";
export type FutsalFormationKey = Formation;
export type GameStrategy = Strategy;

export type FutsalPlayerJson = GameAthlete & {
  country: string;
  teamId: string;
  role: "PLAYER";
  fatigueFactor: number;
};

export type FutsalCoachJson = GameCoach & {
  country: string;
  teamId: string;
  role: "COACH";
  leadership: number;
  tacticalKnowledge: number;
  motivation: number;
  discipline: number;
  preferredStrategy: GameStrategy;
};

export type FutsalTeamJson = {
  id: string;
  name: string;
  country: string;
  referenceYear: number;
  flagUrl?: string;
  level: number;
  defaultFormationKey: FutsalFormationKey;
  defaultStrategy: GameStrategy;
  playerIds: string[];
  coachId?: string | null;
};

export type FutsalDatabaseJson = {
  teams: FutsalTeamJson[];
  players: FutsalPlayerJson[];
  coaches: FutsalCoachJson[];
};

export function normalizeGamePlayer(player: Partial<GamePlayer>): GamePlayer {
  return {
    ...player,
    carta: player.carta ?? "",
    perfil: player.perfil ?? "",
    campeao: player.campeao ?? false,
  } as GamePlayer;
}

function normalizeFutsalDatabase(
  rawDatabase: FutsalDatabaseJson,
): FutsalDatabaseJson {
  return {
    ...rawDatabase,
    players: rawDatabase.players.map(
      (player) => normalizeGamePlayer(player) as FutsalPlayerJson,
    ),
    coaches: rawDatabase.coaches.map(
      (coach) => normalizeGamePlayer(coach) as FutsalCoachJson,
    ),
  };
}

const database = normalizeFutsalDatabase(databaseJson as FutsalDatabaseJson);
const validPlayerPositions: FutsalPlayerPosition[] = [
  "GOLEIRO",
  "FIXO",
  "ALA",
  "PIVO",
];
const validFormations: FutsalFormationKey[] = [
  "DIAMOND_3_1",
  "SQUARE_2_2",
  "FOUR_ZERO",
  "THREE_TWO",
];
const validStrategies: GameStrategy[] = [
  "Ofensivo",
  "Equilibrado",
  "Defensivo",
  "Contra-ataque",
  "Posse de bola",
];
const minOverall = 50;
const maxOverall = 100;
const minFatigueFactor = 0.6;
const maxFatigueFactor = 1.95;

function duplicateIds(items: { id: string }[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) duplicates.add(item.id);
    seen.add(item.id);
  }
  return [...duplicates];
}

const clonePlayer = (player: FutsalPlayerJson): FutsalPlayerJson => ({
  ...player,
});
const cloneCoach = (coach: FutsalCoachJson): FutsalCoachJson => ({ ...coach });
const cloneTeam = (team: FutsalTeamJson): FutsalTeamJson => ({
  ...team,
  playerIds: [...(team.playerIds ?? [])],
});

function getTeamPlayerIds(team: FutsalTeamJson) {
  return team.playerIds ?? [];
}

function getCoachForTeam(team: FutsalTeamJson) {
  return (
    database.coaches.find((item) => item.id === team.coachId) ??
    database.coaches.find((item) => item.teamId === team.id)
  );
}

function getRosterNotes(players: GamePlayer[], hasCoach: boolean) {
  const hasAthletes = players.some((player) => player.position !== "TECNICO");
  return [
    ...(!hasAthletes ? ["Sem jogadores"] : []),
    ...(!hasCoach ? ["Sem técnico"] : []),
  ];
}

export function getAllTeams(): FutsalTeamJson[] {
  return database.teams.map(cloneTeam);
}

export function getAllPlayers(): FutsalPlayerJson[] {
  return database.players.map(clonePlayer);
}

export function getAllCoaches(): FutsalCoachJson[] {
  return database.coaches.map(cloneCoach);
}

export function getTeamById(teamId: string): FutsalTeamJson | undefined {
  const team = database.teams.find((item) => item.id === teamId);
  return team ? cloneTeam(team) : undefined;
}

export function getPlayersByTeamId(teamId: string): FutsalPlayerJson[] {
  return database.players
    .filter((player) => player.teamId === teamId)
    .map(clonePlayer);
}

export function getCoachByTeamId(teamId: string): FutsalCoachJson | undefined {
  const coach = database.coaches.find((item) => item.teamId === teamId);
  return coach ? cloneCoach(coach) : undefined;
}

export function buildDraftTeamFromJson(teamId: string): DraftTeam {
  const team = getTeamById(teamId);
  if (!team) throw new Error(`Time nao encontrado: ${teamId}`);
  const playersById = new Map(
    database.players.map((player) => [player.id, player]),
  );
  const coach = getCoachForTeam(team);

  const players = [
    ...getTeamPlayerIds(team).flatMap((playerId) => {
      const player = playersById.get(playerId);
      return player ? [clonePlayer(player)] : [];
    }),
    ...(coach ? [cloneCoach(coach)] : []),
  ];

  return {
    id: team.id,
    name: team.name,
    country: team.country,
    referenceYear: team.referenceYear,
    flagUrl: team.flagUrl,
    players,
    rosterNotes: getRosterNotes(players, Boolean(coach)),
  };
}

export function buildOpponentFromJson(teamId: string): Opponent {
  const team = getTeamById(teamId);
  if (!team) throw new Error(`Time nao encontrado: ${teamId}`);
  return {
    id: team.id,
    name: team.name,
    country: team.country,
    year: team.referenceYear,
    level: team.level,
    strategy: team.defaultStrategy,
    players: buildDraftTeamFromJson(team.id).players,
    teamName: team.name,
    flagUrl: team.flagUrl,
  };
}

export function validateFutsalDatabase(
  databaseToValidate: FutsalDatabaseJson,
): string[] {
  const errors: string[] = [];
  const teamIds = new Set(databaseToValidate.teams.map((team) => team.id));
  const playerIds = new Set(
    databaseToValidate.players.map((player) => player.id),
  );
  const coachIds = new Set(databaseToValidate.coaches.map((coach) => coach.id));

  for (const id of duplicateIds(databaseToValidate.teams))
    errors.push(`ID de time duplicado: ${id}`);
  for (const id of duplicateIds(databaseToValidate.players))
    errors.push(`ID de atleta duplicado: ${id}`);
  for (const id of duplicateIds(databaseToValidate.coaches))
    errors.push(`ID de tecnico duplicado: ${id}`);

  for (const player of databaseToValidate.players) {
    if (!teamIds.has(player.teamId))
      errors.push(
        `Atleta ${player.id} aponta para time inexistente: ${player.teamId}`,
      );
    if (player.role !== "PLAYER")
      errors.push(`Atleta ${player.id} deve ter role PLAYER`);
    if (!validPlayerPositions.includes(player.position))
      errors.push(
        `Atleta ${player.id} tem posicao invalida: ${player.position}`,
      );
    if (player.stamina !== 100)
      errors.push(`Atleta ${player.id} deve iniciar com stamina 100`);
    if (player.overall !== player.overallOriginal)
      errors.push(
        `Atleta ${player.id} deve iniciar com overall igual ao original`,
      );
    if (player.overall < minOverall || player.overall > maxOverall)
      errors.push(`Atleta ${player.id} tem overall fora da faixa permitida`);
    if (
      player.overallOriginal < minOverall ||
      player.overallOriginal > maxOverall
    )
      errors.push(
        `Atleta ${player.id} tem overallOriginal fora da faixa permitida`,
      );
    if (
      player.fatigueFactor < minFatigueFactor ||
      player.fatigueFactor > maxFatigueFactor
    )
      errors.push(
        `Atleta ${player.id} tem fatigueFactor fora da faixa permitida`,
      );
    if (typeof player.carta !== "string")
      errors.push(`Atleta ${player.id} deve ter carta string`);
    if (typeof player.perfil !== "string")
      errors.push(`Atleta ${player.id} deve ter perfil string`);
    if (typeof player.campeao !== "boolean")
      errors.push(`Atleta ${player.id} deve ter campeao boolean`);
  }

  for (const coach of databaseToValidate.coaches) {
    if (!teamIds.has(coach.teamId))
      errors.push(
        `Tecnico ${coach.id} aponta para time inexistente: ${coach.teamId}`,
      );
    if (coach.role !== "COACH")
      errors.push(`Tecnico ${coach.id} deve ter role COACH`);
    if (coach.position !== "TECNICO")
      errors.push(`Tecnico ${coach.id} deve ter posicao TECNICO`);
    if (coach.overall !== coach.overallOriginal)
      errors.push(
        `Tecnico ${coach.id} deve iniciar com overall igual ao original`,
      );
    if (coach.overall < minOverall || coach.overall > maxOverall)
      errors.push(`Tecnico ${coach.id} tem overall fora da faixa permitida`);
    if (!validStrategies.includes(coach.preferredStrategy))
      errors.push(`Tecnico ${coach.id} tem estrategia preferida invalida`);
    if ("stamina" in coach)
      errors.push(`Tecnico ${coach.id} nao deve ter stamina`);
    if ("fatigueFactor" in coach)
      errors.push(`Tecnico ${coach.id} nao deve ter fatigueFactor`);
    if (typeof coach.carta !== "string")
      errors.push(`Tecnico ${coach.id} deve ter carta string`);
    if (typeof coach.perfil !== "string")
      errors.push(`Tecnico ${coach.id} deve ter perfil string`);
    if (typeof coach.campeao !== "boolean")
      errors.push(`Tecnico ${coach.id} deve ter campeao boolean`);
  }

  const assignedPlayerIds = new Set<string>();
  for (const team of databaseToValidate.teams) {
    if (!validFormations.includes(team.defaultFormationKey))
      errors.push(`Time ${team.id} tem formacao invalida`);
    if (!validStrategies.includes(team.defaultStrategy))
      errors.push(`Time ${team.id} tem estrategia invalida`);
    const teamPlayerIds = getTeamPlayerIds(team);
    if (
      teamPlayerIds.length > 0 &&
      (team.level < minOverall || team.level > maxOverall)
    )
      errors.push(`Time ${team.id} tem level fora da faixa permitida`);
    if (team.coachId && !coachIds.has(team.coachId))
      errors.push(
        `Time ${team.id} aponta para tecnico inexistente: ${team.coachId}`,
      );

    const teamCoachCount = databaseToValidate.coaches.filter(
      (coach) => coach.teamId === team.id,
    ).length;
    if (teamCoachCount > 1)
      errors.push(`Time ${team.id} deve ter no maximo 1 tecnico`);

    for (const id of duplicateIds(
      teamPlayerIds.map((playerId) => ({ id: playerId })),
    )) {
      errors.push(`Time ${team.id} tem atleta duplicado em playerIds: ${id}`);
    }

    for (const playerId of teamPlayerIds) {
      if (coachIds.has(playerId))
        errors.push(
          `Time ${team.id} colocou tecnico em playerIds: ${playerId}`,
        );
      if (!playerIds.has(playerId))
        errors.push(
          `Time ${team.id} aponta para atleta inexistente: ${playerId}`,
        );
      const player = databaseToValidate.players.find(
        (item) => item.id === playerId,
      );
      if (player && player.teamId !== team.id)
        errors.push(
          `Atleta ${player.id} esta vinculado ao time ${player.teamId}, mas aparece em ${team.id}`,
        );
      if (assignedPlayerIds.has(playerId))
        errors.push(`Atleta ${playerId} aparece em mais de um time`);
      assignedPlayerIds.add(playerId);
    }
  }

  return errors;
}

export const futsalDatabase = database;
export const futsalDatabaseValidationErrors = validateFutsalDatabase(database);
