import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface TeamScore {
  team_id: string
  team_name: string
  total_points: number
  round_scores: { [key: number]: number }
}

interface Game {
  id: string
  name: string
  date: string
  status: string
}

interface LeaderBoardProps {
  onBackToHome: () => void
}

export default function Leaderboard({ onBackToHome }: LeaderBoardProps) {
  const [scores, setScores] = useState<TeamScore[]>([])
  const [rounds, setRounds] = useState<number[]>([])
  const [activeGame, setActiveGame] = useState<Game | null>(null)

  useEffect(() => {
    loadActiveGame()
  }, [])

  useEffect(() => {
    if (activeGame) {
      loadRounds()
      loadScores()
    }
  }, [activeGame])

  const loadActiveGame = async () => {
    const { data } = await supabase
      .from("games")
      .select("*")
      .eq("status", "active")
      .single()

    setActiveGame(data || null)
  }

  const loadRounds = async () => {
    if (!activeGame) return

    const { data } = await supabase
      .from('rounds')
      .select('round_number')
      .eq('game_id', activeGame.id)
      .order('round_number')

    if (data) {
      setRounds(data.map(r => r.round_number))
    }
  }

  const loadScores = async () => {
    if (!activeGame) return

    // Lade Teams über game_teams Join-Tabelle
    const { data: gameTeams } = await supabase
      .from('game_teams')
      .select(`
        team_id,
        teams (
          id,
          name
        )
      `)
      .eq("game_id", activeGame.id)

    if (!gameTeams) return

    // Lade alle bewerteten Antworten mit round_number
    const { data: answers } = await supabase
      .from('answers')
      .select(`
        team_id,
        points,
        round_id,
        rounds!inner(round_number)
      `)
      .eq('evaluated', true)

    // Erstelle TeamScore für jedes Team
    const teamScores: TeamScore[] = gameTeams.map(gt => {
      // Team-Daten aus dem nested object holen
      const team = gt.teams as any
      
      // Antworten für dieses Team
      const teamAnswers = answers?.filter((a: any) => a.team_id === team.id) || []
      
      // Punkte pro Runde berechnen
      const roundScores: { [key: number]: number } = {}
      
      teamAnswers.forEach((answer: any) => {
        const roundNum = answer.rounds.round_number
        if (!roundScores[roundNum]) {
          roundScores[roundNum] = 0
        }
        roundScores[roundNum] += answer.points || 0
      })

      // Gesamtpunkte
      const totalPoints = Object.values(roundScores).reduce((sum, points) => sum + points, 0)

      return {
        team_id: team.id,
        team_name: team.name,
        total_points: totalPoints,
        round_scores: roundScores
      }
    })

    // Sortiere nach Gesamtpunktzahl (höchste zuerst)
    teamScores.sort((a, b) => b.total_points - a.total_points)
    setScores(teamScores)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-600 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <button
            onClick={onBackToHome}
            title='Zurück'
            className="flex items-center text-white hover:text-gray-200 transition"
          >
             <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Hauptmenü
              </button>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <h1 className="text-4xl font-bold text-gray-800 text-center mb-2">
            🏆 Leaderboard
          </h1>
          <p className="text-center text-gray-600">Live-Rangliste</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Rang</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Team</th>
                  {rounds.map(round => (
                    <th key={round} className="px-4 py-4 text-center text-sm font-semibold text-gray-700">
                      R{round}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Gesamt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {scores.map((team, index) => (
                  <tr 
                    key={team.team_id}
                    className={index < 3 ? 'bg-yellow-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                        {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                        {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                        <span className="font-semibold text-gray-800">{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{team.team_name}</td>
                    {rounds.map(round => (
                      <td key={round} className="px-4 py-4 text-center text-gray-700">
                        {team.round_scores[round] || 0}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-center">
                      <span className="text-lg font-bold text-blue-600">
                        {team.total_points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {scores.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Noch keine Teams vorhanden
            </div>
          )}
        </div>

        {/* Visualisierung */}
        <div className="mt-6 bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Punkteverteilung</h2>
          <div className="space-y-3">
            {scores.slice(0, 5).map((team, index) => (
              <div key={team.team_id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{team.team_name}</span>
                  <span className="text-sm font-bold text-blue-600">{team.total_points}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' :
                      'bg-blue-500'
                    }`}
                    style={{ 
                      width: `${scores[0]?.total_points ? (team.total_points / scores[0].total_points * 100) : 0}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
