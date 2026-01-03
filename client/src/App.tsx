import { useState } from 'react'
import TeamView from './components/TeamView'
import Leaderboard from './components/Leaderboard'
import AdminView from './components/AdminView'

type View = 'home' | 'team' | 'admin' | 'leaderboard'

export default function App() {
  const [view, setView] = useState<View>('home')

  const handleBackToHome = () => {
    setView('home')
  }

  if (view === 'team') {
    return <TeamView onBackToHome={handleBackToHome} />
  }

  if (view === 'admin') {
    return <AdminView onBackToHome={handleBackToHome} /> 
  }

  if (view === 'leaderboard') {
    return <Leaderboard onBackToHome={handleBackToHome} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
            🎯 Pubquiz
          </h1>
          <p className="text-xl text-white/90">
            Willkommen zum ultimativen Quiz-Abend!
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <button
            onClick={() => setView('team')}
            className="bg-white rounded-2xl shadow-2xl p-8 hover:scale-105 transition-transform duration-200"
          >
            <div className="text-5xl mb-4">👥</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Team</h2>
            <p className="text-gray-600">
              Registriere dein Team und beantworte die Fragen
            </p>
          </button>

          <button
            onClick={() => setView('leaderboard')}
            className="bg-white rounded-2xl shadow-2xl p-8 hover:scale-105 transition-transform duration-200"
          >
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Leaderboard</h2>
            <p className="text-gray-600">
              Verfolge die Punktestände in Echtzeit
            </p>
          </button>

          <button
            onClick={() => setView('admin')}
            className="bg-white rounded-2xl shadow-2xl p-8 hover:scale-105 transition-transform duration-200"
          >
            <div className="text-5xl mb-4">⚙️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Admin</h2>
            <p className="text-gray-600">
              Verwalte Runden und bewerte Antworten
            </p>
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/80 text-sm">
            Viel Spaß beim Quiz! 🎉
          </p>
        </div>
      </div>
    </div>
  )
}

