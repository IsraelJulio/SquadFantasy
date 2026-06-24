import { useCallback, useEffect, useRef, useState } from "react";
import {
  addSystemEvent,
  applySubstitution,
  createInitialMatchState,
  finalizeMatch,
  simulateNextMinute,
  type LiveMatchState,
  type Substitution,
} from "../game/simulation";
import {
  createPenaltyShootout,
  getPenaltyParticipants,
  startPenaltyShootout,
  takeNextPenalty,
} from "../game/penalties";
import type {
  GameAthlete,
  MatchSimulationPlan,
  MatchSimulationStatus,
  Opponent,
  PenaltyShootoutState,
} from "../types";

export const SIMULATION_TICK_MS = 1900;
const HALF_TIME_PAUSE_MS = 1_000;

export function useMatchSimulation(
  plan: MatchSimulationPlan,
  opponent: Opponent,
  onFinished: (plan: MatchSimulationPlan) => void,
) {
  const [status, setStatus] = useState<MatchSimulationStatus>("not_started");
  const [liveState, setLiveState] = useState(() =>
    createInitialMatchState(plan, opponent),
  );
  const [speed, setSpeed] = useState(1);
  const [shootout, setShootout] = useState(createPenaltyShootout);
  const [completedPlan, setCompletedPlan] =
    useState<MatchSimulationPlan | null>(null);
  const completedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  const resumeStatusRef = useRef<MatchSimulationStatus>("first_half");

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const completeMatch = useCallback((state: LiveMatchState, completedShootout?: PenaltyShootoutState) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const result = finalizeMatch(state, opponent, completedShootout);
    setCompletedPlan(result);
    setStatus("finished");
    onFinishedRef.current(result);
  }, [opponent]);

  useEffect(() => {
    if (!["first_half", "half_time", "second_half"].includes(status)) return;

    if (status === "half_time") {
      const timer = window.setTimeout(() => {
        setLiveState((current) =>
          addSystemEvent(
            current,
            "second-half",
            "Começa o segundo tempo. Mais 20 minutos de futsal.",
          ),
        );
        setStatus("second_half");
      }, HALF_TIME_PAUSE_MS / speed);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      const advanced = simulateNextMinute(liveState, opponent);
      if (status === "first_half" && advanced.minute >= 20) {
        setLiveState(
          addSystemEvent(
            advanced,
            "half-time",
            "Intervalo. Os quintetos recebem as orientações dos técnicos.",
          ),
        );
        setStatus("half_time");
        return;
      }
      if (status === "second_half" && advanced.minute >= 40) {
        const finishedState = addSystemEvent(
          advanced,
          "full-time",
          "Fim de jogo. O árbitro encerra a partida.",
        );
        setLiveState(finishedState);
        if (plan.stage !== "Fase de grupos" && finishedState.userScore === finishedState.opponentScore) {
          setShootout(createPenaltyShootout());
          setStatus("awaiting_penalties");
        } else completeMatch(finishedState);
        return;
      }
      setLiveState(advanced);
    }, SIMULATION_TICK_MS / speed);

    return () => window.clearTimeout(timer);
  }, [completeMatch, liveState, opponent, plan.stage, speed, status]);

  function start() {
    if (status !== "not_started") return;
    setLiveState((current) =>
      addSystemEvent(
        current,
        "kick-off",
        "A bola está rolando. Começa a partida!",
      ),
    );
    setStatus("first_half");
  }

  function accelerate() {
    setSpeed((current) => (current === 1 ? 2 : current === 2 ? 4 : 1));
  }

  function pauseForSubstitution() {
    if (status !== "first_half" && status !== "second_half") return;
    resumeStatusRef.current = status;
    setStatus("paused");
  }

  function cancelSubstitution() {
    if (status === "paused") setStatus(resumeStatusRef.current);
  }

  function substitute(substitution: Substitution) {
    if (status !== "paused") return;
    setLiveState((current) => {
      const next = applySubstitution(current, substitution);
      return next;
    });
    setStatus(resumeStatusRef.current);
  }

  function skipToEnd() {
    if (["finished", "awaiting_penalties", "penalties"].includes(status)) return;
    let finishedState = liveState;
    while (finishedState.minute < 40)
      finishedState = simulateNextMinute(finishedState, opponent);
    finishedState = addSystemEvent(
      finishedState,
      "full-time",
      "Fim de jogo. O árbitro encerra a partida.",
    );
    setLiveState(finishedState);
    if (plan.stage !== "Fase de grupos" && finishedState.userScore === finishedState.opponentScore) {
      setShootout(createPenaltyShootout());
      setStatus("awaiting_penalties");
    } else completeMatch(finishedState);
  }

  function beginPenalties() {
    if (status !== "awaiting_penalties") return;
    setShootout((current) => startPenaltyShootout(current));
    setStatus("penalties");
  }

  function takePenalty() {
    if (status !== "penalties" || shootout.status !== "in_progress") return;
    const next = takeNextPenalty(liveState, shootout);
    setShootout(next);
    if (next.status === "finished") completeMatch(liveState, next);
  }

  function skipPenalties() {
    if (status !== "penalties" || shootout.status !== "in_progress") return;
    let next = shootout;
    while (next.status !== "finished") next = takeNextPenalty(liveState, next);
    setShootout(next);
    completeMatch(liveState, next);
  }

  const latestGoal = [...liveState.events]
    .reverse()
    .find((item) => item.type === "goal");
  const activePlayers = liveState.activeIds
    .map((id) => liveState.userPlayers.find((player) => player.id === id))
    .filter((player): player is GameAthlete => Boolean(player));
  const benchPlayers = liveState.benchIds
    .map((id) => liveState.userPlayers.find((player) => player.id === id))
    .filter((player): player is GameAthlete => Boolean(player));
  const penaltyParticipants = shootout.status === "in_progress" ? getPenaltyParticipants(liveState, shootout) : null;

  return {
    status,
    currentMinute: liveState.minute,
    speed,
    visibleEvents: liveState.events,
    latestGoal,
    userScore: liveState.userScore,
    opponentScore: liveState.opponentScore,
    activePlayers,
    benchPlayers,
    completedPlan,
    shootout,
    penaltyParticipants,
    start,
    accelerate,
    pauseForSubstitution,
    cancelSubstitution,
    substitute,
    skipToEnd,
    beginPenalties,
    takePenalty,
    skipPenalties,
  };
}
