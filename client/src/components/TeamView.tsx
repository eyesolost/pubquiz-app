import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Question {
  id: string
  question_number: number
  question_text: string
}

interface Round {
  id: string
  round_number: number
  category: string
  status: string
}

interface Team {
  id: string
  name: string
  members_count: number
}

interface TeamViewProps {
  onBackToHome: () => void;
}


export default function TeamView({ onBackToHome }: TeamViewProps) {
  const [teamId, setTeamId] = useState<string | null>(localStorage.getItem('teamId'))
  const [teamName, setTeamName] = useState('')
  const [membersCount, setMembersCount] = useState(3)
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<{ [key: string]: string }>({})
  const [submitted, setSubmitted] = useState(false)
  const [teamScore, setTeamScore] = useState(0)
  
  // Neue States für Team-Auswahl
  const [registrationMode, setRegistrationMode] = useState<'create' | 'join'>('create')
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')

  useEffect(() => {
    if (teamId) {
      loadTeamData()
      loadCurrentRound()
    }
  }, [teamId])

  useEffect(() => {
    if (currentRound) {
      loadQuestions()
      checkSubmissionStatus()
    }
  }, [currentRound])

  // Lade verfügbare Teams beim Wechsel zum "Beitreten"-Modus
  useEffect(() => {
    if (registrationMode === 'join' && !teamId) {
      loadAvailableTeams()
    }
  }, [registrationMode, teamId])

  // Realtime-Updates für Runden
  useEffect(() => {
    const channel = supabase
      .channel('rounds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds' }, () => {
        loadCurrentRound()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadAvailableTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('name')

    setAvailableTeams(data || [])
  }

  const loadTeamData = async () => {
    if (!teamId) return
    
    const { data } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single()
    
    if (data) {
      setTeamName(data.name)
      await loadTeamScore()
    }
  }

  const loadTeamScore = async () => {
    if (!teamId) return

    const { data } = await supabase
      .from('answers')
      .select('points')
      .eq('team_id', teamId)
      .eq('evaluated', true)

    if (data) {
      const total = data.reduce((sum, answer) => sum + (answer.points || 0), 0)
      setTeamScore(total)
    }
  }

  const loadCurrentRound = async () => {
    const { data } = await supabase
      .from('rounds')
      .select('*')
      .eq('status', 'active')
      .order('round_number', { ascending: false })
      .limit(1)
      .single()

    setCurrentRound(data || null)
  }

  const loadQuestions = async () => {
    if (!currentRound) return

    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('round_id', currentRound.id)
      .order('question_number')

    setQuestions(data || [])
  }

  const checkSubmissionStatus = async () => {
    if (!teamId || !currentRound) return

    const { data } = await supabase
      .from('answers')
      .select('id')
      .eq('team_id', teamId)
      .in('question_id', questions.map(q => q.id))

    setSubmitted((data?.length || 0) > 0)
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()

    const { data, error } = await supabase
      .from('teams')
      .insert([{ name: teamName, members_count: membersCount }])
      .select()
      .single()

    if (data && !error) {
      setTeamId(data.id)
      localStorage.setItem('teamId', data.id)
      alert(`Team "${data.name}" erfolgreich erstellt!`)
    } else {
      alert('Fehler beim Erstellen des Teams: ' + error?.message)
    }
  }

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTeamId) {
      alert('Bitte wähle ein Team aus!')
      return
    }

    // Finde das Team
    const team = availableTeams.find(t => t.id === selectedTeamId)
    
    if (team) {
      setTeamId(team.id)
      localStorage.setItem('teamId', team.id)
      alert(`Erfolgreich Team "${team.name}" beigetreten!`)
    }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!teamId || !currentRound) return

    const answersToInsert = questions.map(q => ({
      team_id: teamId,
      question_id: q.id,
      answer_text: answers[q.id] || '',
      evaluated: false,
      points: null
    }))

    const { error } = await supabase
      .from('answers')
      .insert(answersToInsert)

    if (!error) {
      setSubmitted(true)
      alert('Antworten erfolgreich eingereicht!')
    }
  }

  // Registrierungs-Screen
  if (!teamId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
          <div className="flex gap-3">
              <button
                onClick={onBackToHome}
                className="flex items-center text-gray-600 hover:text-gray-800 transition"
              >
                
            <div className="text-5xl mb-4">👥</div>
               {/* <svg
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
                </svg> */}
              </button>

        </div>
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            🎯 Pubquiz
          </h1>
          
          {/* Tab-Auswahl */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setRegistrationMode('create')}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                registrationMode === 'create'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Neues Team
            </button>
            <button
              onClick={() => setRegistrationMode('join')}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                registrationMode === 'join'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Team beitreten
            </button>
          </div>

          {/* Neues Team erstellen */}
          {registrationMode === 'create' && (
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team-Name
                </label>
                <input
                  title='Teamname'
                  placeholder='z.B. Die Wissenshelden'
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anzahl Teammitglieder
                </label>
                <input
                  title='Anzahl der Teammitglieder'
                  placeholder='3'
                  type="number"
                  min="1"
                  max="6"
                  value={membersCount}
                  onChange={(e) => setMembersCount(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Team Erstellen
              </button>
            </form>
          )}

          {/* Bestehendem Team beitreten */}
          {registrationMode === 'join' && (
            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wähle dein Team
                </label>
                {availableTeams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-2">Noch keine Teams vorhanden</p>
                    <button
                      type="button"
                      onClick={() => setRegistrationMode('create')}
                      className="text-blue-600 hover:underline"
                    >
                      Erstelle das erste Team!
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableTeams.map((team) => (
                      <label
                        key={team.id}
                        className={`block p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedTeamId === team.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="team"
                          value={team.id}
                          checked={selectedTeamId === team.id}
                          onChange={(e) => setSelectedTeamId(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-800">{team.name}</p>
                            <p className="text-sm text-gray-600">
                              {team.members_count} {team.members_count === 1 ? 'Mitglied' : 'Mitglieder'}
                            </p>
                          </div>
                          {selectedTeamId === team.id && (
                            <div className="text-blue-600 text-2xl">✓</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {availableTeams.length > 0 && (
                <button
                  type="submit"
                  disabled={!selectedTeamId}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    selectedTeamId
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Team Beitreten
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    )
  }

  // Warte-Screen
  if (!currentRound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="flex gap-3">
              <button
                onClick={onBackToHome}
                className="flex items-center text-gray-600 hover:text-gray-800 transition"
              >
               
            <div className="text-5xl mb-4">🏠</div>
             {/*   <svg
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
                </svg> */}
              </button>

        </div>
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Team: {teamName}</h2>
          <p className="text-lg text-gray-600 mb-4">Aktuelle Punktzahl: {teamScore}</p>
          <div className="animate-pulse">
            <p className="text-gray-500">Warte auf die nächste Runde...</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('teamId')
              setTeamId(null)
            }}
            className="mt-6 text-sm text-red-600 hover:underline"
          >
            Team wechseln
          </button>
        </div>
      </div>
    )
  }

  // Quiz-Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
              <button
                onClick={onBackToHome}
                className="flex items-center text-gray-600 hover:text-gray-800 transition"
              >
                
           <div className="text-5xl mb-4">🏠</div>
               {/* <svg
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
                </svg> */}
              </button>

        </div>
        <div className="bg-white rounded-lg shadow-xl p-6 mb-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Team: {teamName}</h1>
            <div className="text-right">
              <p className="text-sm text-gray-600">Gesamtpunktzahl</p>
              <p className="text-2xl font-bold text-blue-600">{teamScore}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Runde {currentRound.round_number}: {currentRound.category}
          </h2>
          
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-green-600 text-6xl mb-4">✓</div>
              <p className="text-xl font-semibold text-gray-800">Antworten eingereicht!</p>
              <p className="text-gray-600 mt-2">Warte auf die Bewertung...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              {questions.map((q) => (
                <div key={q.id} className="border-b pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frage {q.question_number}: {q.question_text}
                  </label>
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Deine Antwort..."
                  />
                </div>
              ))}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Antworten Einreichen
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
