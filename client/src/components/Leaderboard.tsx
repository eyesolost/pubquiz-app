import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface TeamScore {
  team_id: string
  team_name: string
  total_points: number
  round_scores: { [key: number]: number }
}

interface LeaderBoardProps {
  onBackToHome: () => void;
}



export default function Leaderboard({ onBackToHome }: LeaderBoardProps) {
  const [scores, setScores] = useState<TeamScore[]>([])
  const [rounds, setRounds] = useState<number[]>([])

  useEffect(() => {
    loadScores()
    loadRounds()

    // Realtime-Updates
    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => {
        loadScores()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadRounds = async () => {
    const { data } = await supabase
      .from('rounds')
      .select('round_number')
      .order('round_number')

    if (data) {
      setRounds(data.map(r => r.round_number))
    }
  }

  const loadScores = async () => {
    // Lade Teams
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')

    if (!teams) return

    // Lade alle bewerteten Antworten
    const { data: answers } = await supabase
      .from('answers')
      .select(`
        team_id,
        points,
        questions!inner(
          round_id,
          rounds!inner(round_number)
        )
      `)
      .eq('evaluated', true)

    const teamScores: TeamScore[] = teams.map(team => {
      const teamAnswers = answers?.filter((a: any) => a.team_id === team.id) || []
      const roundScores: { [key: number]: number } = {}
      
      teamAnswers.forEach((answer: any) => {
        const roundNum = answer.questions.rounds.round_number
        if (!roundScores[roundNum]) {
          roundScores[roundNum] = 0
        }
        roundScores[roundNum] += answer.points || 0
      })

      const totalPoints = Object.values(roundScores).reduce((sum, points) => sum + points, 0)

      return {
        team_id: team.id,
        team_name: team.name,
        total_points: totalPoints,
        round_scores: roundScores
      }
    })

    // Sortiere nach Gesamtpunktzahl
    teamScores.sort((a, b) => b.total_points - a.total_points)
    setScores(teamScores)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-600 p-4">
      <div className="max-w-6xl mx-auto">
         <div className="flex gap-3">
              <button
                onClick={onBackToHome}
                className="flex items-center text-gray-600 hover:text-gray-800 transition"
              >
                
           <div className="text-5xl mb-4">🏠</div>
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
