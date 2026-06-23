import { useEffect, useRef, useState } from 'react'
import { addSystemEvent, applySubstitution, createInitialMatchState, finalizeMatch, simulateNextMinute, type Substitution } from '../game/simulation'
import type { GamePlayer, MatchSimulationPlan, MatchSimulationStatus, Opponent } from '../types'

export const SIMULATION_TICK_MS = 600
const HALF_TIME_PAUSE_MS = 1_000

export function useMatchSimulation(plan: MatchSimulationPlan, opponent: Opponent, onFinished: (plan: MatchSimulationPlan) => void) {
  const [status, setStatus] = useState<MatchSimulationStatus>('not_started')
  const [liveState, setLiveState] = useState(() => createInitialMatchState(plan))
  const [speed, setSpeed] = useState(1)
  const [completedPlan, setCompletedPlan] = useState<MatchSimulationPlan | null>(null)
  const completedRef = useRef(false)
  const onFinishedRef = useRef(onFinished)
  const resumeStatusRef = useRef<MatchSimulationStatus>('first_half')

  useEffect(() => { onFinishedRef.current = onFinished }, [onFinished])

  useEffect(() => {
    if (!['first_half', 'half_time', 'second_half'].includes(status)) return

    if (status === 'half_time') {
      const timer = window.setTimeout(() => {
        setLiveState((current) => addSystemEvent(current, 'second-half', 'Começa o segundo tempo. Mais 20 minutos de futsal.'))
        setStatus('second_half')
      }, HALF_TIME_PAUSE_MS / speed)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      const advanced = simulateNextMinute(liveState, opponent)
      if (status === 'first_half' && advanced.minute >= 20) {
        setLiveState(addSystemEvent(advanced, 'half-time', 'Intervalo. Os quintetos recebem as orientações dos técnicos.'))
        setStatus('half_time')
        return
      }
      if (status === 'second_half' && advanced.minute >= 40) {
        const finishedState = addSystemEvent(advanced, 'full-time', 'Fim de jogo. O árbitro encerra a partida.')
        setLiveState(finishedState)
        setStatus('finished')
        if (!completedRef.current) {
          completedRef.current = true
          const result = finalizeMatch(finishedState, opponent)
          setCompletedPlan(result)
          onFinishedRef.current(result)
        }
        return
      }
      setLiveState(advanced)
    }, SIMULATION_TICK_MS / speed)

    return () => window.clearTimeout(timer)
  }, [liveState, opponent, speed, status])

  function start() {
    if (status !== 'not_started') return
    setLiveState((current) => addSystemEvent(current, 'kick-off', 'A bola está rolando. Começa a partida!'))
    setStatus('first_half')
  }

  function accelerate() {
    setSpeed((current) => current === 1 ? 2 : current === 2 ? 4 : 1)
  }

  function pauseForSubstitution() {
    if (status !== 'first_half' && status !== 'second_half') return
    resumeStatusRef.current = status
    setStatus('paused')
  }

  function cancelSubstitution() {
    if (status === 'paused') setStatus(resumeStatusRef.current)
  }

  function substitute(substitution: Substitution) {
    if (status !== 'paused') return
    setLiveState((current) => {
      const next = applySubstitution(current, substitution)
      return next
    })
    setStatus(resumeStatusRef.current)
  }

  function skipToEnd() {
    if (status === 'finished') return
    let finishedState = liveState
    while (finishedState.minute < 40) finishedState = simulateNextMinute(finishedState, opponent)
    finishedState = addSystemEvent(finishedState, 'full-time', 'Fim de jogo. O árbitro encerra a partida.')
    setLiveState(finishedState)
    setStatus('finished')
    if (!completedRef.current) {
      completedRef.current = true
      const result = finalizeMatch(finishedState, opponent)
      setCompletedPlan(result)
      onFinishedRef.current(result)
    }
  }

  const latestGoal = [...liveState.events].reverse().find((item) => item.type === 'goal')
  const activePlayers = liveState.activeIds.map((id) => plan.squad.find((player) => player.id === id)).filter((player): player is GamePlayer => Boolean(player))
  const benchPlayers = liveState.benchIds.map((id) => plan.squad.find((player) => player.id === id)).filter((player): player is GamePlayer => Boolean(player))

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
    start,
    accelerate,
    pauseForSubstitution,
    cancelSubstitution,
    substitute,
    skipToEnd,
  }
}
