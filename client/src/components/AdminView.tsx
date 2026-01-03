import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface Game {
  id: string;
  name: string;
  date: string;
  status: string;
}

interface Round {
  id: string;
  game_id: string;
  round_number: number;
  category: string;
  status: string;
  completed_at: string | null;
}

interface Question {
  id: string;
  question_number: number;
  question_text: string;
}

interface Team {
  id: string;
  name: string;
  members_count: number;
  game_id: string;
}

interface TeamAnswer {
  id: string;
  team_id: string;
  team_name: string;
  answer_text: string;
  points: number | null;
  evaluated: boolean;
  question_number: number;
  question_text: string;
  question_id: string;
}

interface TeamWithAnswers {
  team_id: string;
  team_name: string;
  answer_count: number;
  evaluated_count: number;
}

interface AdminViewProps {
  onBackToHome: () => void;
}

interface ConfirmDialog {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export default function AdminView({ onBackToHome }: AdminViewProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [teamAnswers, setTeamAnswers] = useState<TeamAnswer[]>([]);
  const [teamsWithAnswers, setTeamsWithAnswers] = useState<TeamWithAnswers[]>(
    []
  );
  const [selectedTeamForEval, setSelectedTeamForEval] = useState<string | null>(
    null
  );

  const [newCategory, setNewCategory] = useState("");
  const [newQuestions, setNewQuestions] = useState<string[]>(
    Array(10).fill("")
  );

  const [mainView, setMainView] = useState<
    "overview" | "rounds" | "teams" | "history" | "create-round"
  >("overview");
  const [roundView, setRoundView] = useState<"list" | "detail" | "evaluate">(
    "list"
  );

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin123";
  const [localPoints, setLocalPoints] = useState<{
    [answerId: string]: number;
  }>({});

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth");
    if (adminAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadActiveGame();
      loadAllGames();
      loadTeams();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeGame) {
      loadRounds();
    }
  }, [activeGame]);

  useEffect(() => {
    if (selectedRound) {
      loadQuestions();
    }
  }, [selectedRound]);

  useEffect(() => {
    if (selectedRound && questions.length > 0) {
      loadTeamsWithAnswers();
    }
  }, [selectedRound, questions]);

  useEffect(() => {
    if (selectedRound && selectedTeamForEval && questions.length > 0) {
      loadTeamAnswers(selectedTeamForEval);
    }
  }, [selectedRound, selectedTeamForEval, questions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("adminAuth", "true");
    } else {
      alert("Falsches Passwort!");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("adminAuth");
    onBackToHome();
  };

  const loadActiveGame = async () => {
    const { data } = await supabase
      .from("games")
      .select("*")
      .eq("status", "active")
      .single();

    if (!data) {
      const { data: newGame } = await supabase
        .from("games")
        .insert([
          {
            name: `Pubquiz ${new Date().getFullYear()}`,
            date: new Date().toISOString().split("T")[0],
            status: "active",
          },
        ])
        .select()
        .single();
      setActiveGame(newGame || null);
    } else {
      setActiveGame(data);
    }
  };

  const loadAllGames = async () => {
    const { data } = await supabase
      .from("games")
      .select("*")
      .order("date", { ascending: false });

    setAllGames(data || []);
  };

  const loadRounds = async () => {
    if (!activeGame) return;

    const { data } = await supabase
      .from("rounds")
      .select("*")
      .eq("game_id", activeGame.id)
      .order("round_number");

    setRounds(data || []);
  };

  const loadTeams = async () => {
    const { data } = await supabase.from("teams").select("*").order("name");

    setTeams(data || []);
  };

  const loadQuestions = async () => {
    if (!selectedRound) return;

    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("round_id", selectedRound.id)
      .order("question_number");

    setQuestions(data || []);
  };

  const loadTeamsWithAnswers = async () => {
    if (!selectedRound || questions.length === 0) return;

    const questionIds = questions.map((q) => q.id);

    const { data } = await supabase
      .from("answers")
      .select(
        `
        id,
        team_id,
        evaluated,
        teams!inner(name)
      `
      )
      .in("question_id", questionIds);

    if (!data) return;

    // Gruppiere nach Team
    const teamMap = new Map<string, TeamWithAnswers>();

    data.forEach((answer: any) => {
      const teamId = answer.team_id;
      const teamName = answer.teams.name;

      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, {
          team_id: teamId,
          team_name: teamName,
          answer_count: 0,
          evaluated_count: 0,
        });
      }

      const team = teamMap.get(teamId)!;
      team.answer_count++;
      if (answer.evaluated) {
        team.evaluated_count++;
      }
    });

    setTeamsWithAnswers(
      Array.from(teamMap.values()).sort((a, b) =>
        a.team_name.localeCompare(b.team_name)
      )
    );
  };

  const loadTeamAnswers = async (teamId: string) => {
    if (!selectedRound || questions.length === 0) return;

    const questionIds = questions.map((q) => q.id);

    const { data } = await supabase
      .from("answers")
      .select(
        `
        id,
        team_id,
        answer_text,
        points,
        evaluated,
        question_id,
        teams!inner(name),
        questions!inner(question_number, question_text)
      `
      )
      .eq("team_id", teamId)
      .in("question_id", questionIds)
      .order("question_id");

    const formatted =
      data?.map((a: any) => ({
        id: a.id,
        team_id: a.team_id,
        team_name: a.teams.name,
        answer_text: a.answer_text,
        points: a.points,
        evaluated: a.evaluated,
        question_number: a.questions.question_number,
        question_text: a.questions.question_text,
        question_id: a.question_id,
      })) || [];

    setTeamAnswers(formatted);
  };

  const createNewRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGame) return;

    const nextRoundNumber = rounds.length + 1;

    const { data: round } = await supabase
      .from("rounds")
      .insert([
        {
          game_id: activeGame.id,
          round_number: nextRoundNumber,
          category: newCategory,
          status: "waiting",
        },
      ])
      .select()
      .single();

    if (!round) return;

    const questionsToInsert = newQuestions
      .filter((q) => q.trim())
      .map((q, index) => ({
        round_id: round.id,
        question_number: index + 1,
        question_text: q,
      }));

    await supabase.from("questions").insert(questionsToInsert);

    setNewCategory("");
    setNewQuestions(Array(10).fill(""));
    loadRounds();
    setMainView("rounds");
    alert("Runde erfolgreich erstellt!");
  };

  const startRound = async (roundId: string) => {
    await supabase
      .from("rounds")
      .update({ status: "waiting" })
      .eq("status", "active")
      .eq("game_id", activeGame?.id);

    await supabase
      .from("rounds")
      .update({ status: "active" })
      .eq("id", roundId);

    loadRounds();
    alert("Runde gestartet!");
  };

  const completeRound = async (roundId: string) => {
    await supabase
      .from("rounds")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", roundId);

    loadRounds();
    alert("Runde beendet!");
  };

  const deleteRound = (round: Round) => {
    setConfirmDialog({
      show: true,
      title: "Runde löschen",
      message: `Möchten Sie die Runde "${round.category}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      onConfirm: async () => {
        await supabase.from("rounds").delete().eq("id", round.id);

        loadRounds();
        setConfirmDialog({ ...confirmDialog, show: false });
        alert("Runde gelöscht!");
      },
    });
  };

  const deleteTeam = (team: Team) => {
    setConfirmDialog({
      show: true,
      title: "Team löschen",
      message: `Möchten Sie das Team "${team.name}" wirklich löschen? Alle Antworten dieses Teams werden ebenfalls gelöscht.`,
      onConfirm: async () => {
        await supabase.from("teams").delete().eq("id", team.id);

        loadTeams();
        setConfirmDialog({ ...confirmDialog, show: false });
        alert("Team gelöscht!");
      },
    });
  };

  const updateQuestion = async (questionId: string, newText: string) => {
    await supabase
      .from("questions")
      .update({ question_text: newText })
      .eq("id", questionId);

    loadQuestions();
  };

  const evaluateAnswer = async (answerId: string, points: number) => {
    const clampedPoints = Math.max(0, Math.min(5, Math.round(points * 2) / 2));

    // OPTIMISTIC: Sofort UI aktualisieren
    setLocalPoints((prev) => ({ ...prev, [answerId]: clampedPoints }));
    setTeamAnswers((prev) =>
      prev.map((a) =>
        a.id === answerId ? { ...a, points: clampedPoints, evaluated: true } : a
      )
    );

    // DB im Hintergrund
    try {
      await supabase
        .from("answers")
        .update({ points: clampedPoints, evaluated: true })
        .eq("id", answerId);
      await loadTeamsWithAnswers(); // Nur Fortschritt!
    } catch (error) {
      if(selectedTeamForEval != null)
        await loadTeamAnswers(selectedTeamForEval); // Bei Fehler: Rollback
    }
  };

  {/*
     const incrementPoints = (answerId: string) => {
    const current = localPoints[answerId] ?? 0;
    const newPoints = Math.min(5, current + 0.5);
    evaluateAnswer(answerId, newPoints);
  };

  const decrementPoints = (answerId: string) => {
    const current = localPoints[answerId] ?? 0;
    const newPoints = Math.max(0, current - 0.5);
    evaluateAnswer(answerId, newPoints);
  };
     */}
 

  const handlePointsInput = (answerId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    evaluateAnswer(answerId, numValue);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="mb-6">
            <button
              onClick={onBackToHome}
              className="flex items-center text-gray-600 hover:text-gray-800 transition"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Zurück zum Hauptmenü
            </button>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            🔐 Admin Login
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Admin-Passwort eingeben"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Login
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            Passwort ändern in .env: VITE_ADMIN_PASSWORD
          </div>
        </div>
      </div>
    );
  }

  // Team Evaluation View
  if (roundView === "evaluate" && selectedRound && selectedTeamForEval) {
    const teamName = teamAnswers[0]?.team_name || "";

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-600 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => {
                setRoundView("detail");
                setSelectedTeamForEval(null);
              }}
              className="flex items-center text-white hover:text-gray-200 transition"
            >
              <svg
                className="w-6 h-6 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Zurück zur Team-Übersicht
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{teamName}</h2>
              <p className="text-gray-600">
                Runde {selectedRound.round_number}: {selectedRound.category}
              </p>
            </div>

            <div className="space-y-4">
              {teamAnswers.map((answer) => {
                const currentPoints =
                  localPoints[answer.id] ?? answer.points ?? 0;

                return (
                  <div
                    key={answer.id}
                    className={`border rounded-lg p-4 ${
                      answer.evaluated
                        ? "bg-gray-50"
                        : "bg-yellow-50 border-yellow-300"
                    }`}
                  >
                    <div className="mb-3">
                      <div className="font-semibold text-gray-800 mb-1">
                        Frage {answer.question_number}: {answer.question_text}
                      </div>
                      <div className="text-gray-900 bg-white p-3 rounded border">
                        {answer.answer_text}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        Punkte:
                      </span>

                      {/* Decrement Button 
                      <button
                        onClick={() => decrementPoints(answer.id)}
                        className="w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center font-bold text-xl text-gray-700 transition"
                      >
                        −
                      </button>*/}

                      {/* Points Input */}
                      <input
                      title="Punkte Eingabe"
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        value={currentPoints}
                        onChange={(e) =>
                          handlePointsInput(answer.id, e.target.value)
                        }
                        className="w-20 px-3 py-2 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />

                      {/* Increment Button */}
                    {/*  <button
                        onClick={() => incrementPoints(answer.id)}
                        className="w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center font-bold text-xl text-gray-700 transition"
                      >
                        +
                      </button>
                      <span className="text-sm text-gray-600">von 5</span>
*/}

                      {/* Quick Actions */}
                      <div className="flex gap-2 ml-auto">
                        <button
                          onClick={() => evaluateAnswer(answer.id, 1)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                        >
                          1 Pkt
                        </button>
                        <button
                          onClick={() => evaluateAnswer(answer.id, 0)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                        >
                          0 Pkt
                        </button>
                      </div>
                    </div>

                    {answer.evaluated && (
                      <div className="mt-2 text-sm text-green-600 flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Bewertet
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Round Detail View
  if (roundView === "detail" && selectedRound) {
    const canEdit = selectedRound.status === "waiting";
    const canEvaluate =
      selectedRound.status === "active" || selectedRound.status === "completed";
    const isReadOnly = selectedRound.status === "active";

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-600 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => {
                setRoundView("list");
                setSelectedRound(null);
                setSelectedTeamForEval(null);
              }}
              className="flex items-center text-white hover:text-gray-200 transition"
            >
              <svg
                className="w-6 h-6 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Zurück zur Runden-Liste
            </button>
            <div className="flex gap-2">
              <span
                className={`px-3 py-1 rounded text-sm font-semibold ${
                  selectedRound.status === "waiting"
                    ? "bg-yellow-100 text-yellow-800"
                    : selectedRound.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {selectedRound.status === "waiting"
                  ? "Wartet"
                  : selectedRound.status === "active"
                  ? "Läuft"
                  : "Abgeschlossen"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Runde {selectedRound.round_number}: {selectedRound.category}
            </h2>

            {canEdit && (
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-4">
                  Fragen bearbeiten
                </h3>
                <div className="space-y-3">
                  {questions.map((q) => (
                    <div key={q.id} className="flex items-center gap-3">
                      <span className="text-gray-600 font-medium w-8">
                        {q.question_number}.
                      </span>
                      <input
                        title="Bearbeiten"
                        type="text"
                        value={q.question_text}
                        onChange={(e) => updateQuestion(q.id, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isReadOnly && (
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-4">
                  Fragen (Nur-Lese-Modus)
                </h3>
                <div className="space-y-2">
                  {questions.map((q) => (
                    <div key={q.id} className="p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">
                        {q.question_number}.{" "}
                      </span>
                      <span className="text-gray-600">{q.question_text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Team-Navigation für Bewertung */}
          {canEvaluate && teamsWithAnswers.length > 0 && (
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">
                Antworten bewerten ({teamsWithAnswers.length} Teams)
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {teamsWithAnswers.map((team) => (
                  <button
                    key={team.team_id}
                    onClick={() => {
                      setSelectedTeamForEval(team.team_id);
                      setRoundView("evaluate");
                    }}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800">
                        {team.team_name}
                      </h4>
                      <svg
                        className="w-5 h-5 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                    <div className="text-sm text-gray-600">
                      {team.evaluated_count}/{team.answer_count} bewertet
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          team.evaluated_count === team.answer_count
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                        style={{
                          width: `${
                            (team.evaluated_count / team.answer_count) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {canEvaluate && teamsWithAnswers.length === 0 && (
            <div className="bg-white rounded-lg shadow-xl p-6">
              <p className="text-center text-gray-500 py-8">
                Noch keine Antworten eingereicht
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-600 p-4">
      <div className="max-w-7xl mx-auto">
        {confirmDialog.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                {confirmDialog.title}
              </h3>
              <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() =>
                    setConfirmDialog({ ...confirmDialog, show: false })
                  }
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
            <div className="flex gap-3">
              <button
                onClick={onBackToHome}
                className="flex items-center text-gray-600 hover:text-gray-800 transition"
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
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-600 hover:text-gray-800 transition"
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>

          {activeGame && (
            <div className="text-gray-600">
              Aktuelles Spiel:{" "}
              <span className="font-semibold">{activeGame.name}</span>
            </div>
          )}

          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={() => {
                setMainView("overview");
                setRoundView("list");
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                mainView === "overview"
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Übersicht
            </button>
            <button
              onClick={() => {
                setMainView("rounds");
                setRoundView("list");
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                mainView === "rounds"
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Runden
            </button>
            <button
              onClick={() => setMainView("create-round")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                mainView === "create-round"
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              + Neue Runde
            </button>
            <button
              onClick={() => setMainView("teams")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                mainView === "teams"
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Teams
            </button>
            <button
              onClick={() => setMainView("history")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                mainView === "history"
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Historie
            </button>
          </div>
        </div>

        {mainView === "overview" && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Runden
              </h3>
              <p className="text-4xl font-bold text-red-600">{rounds.length}</p>
              <p className="text-sm text-gray-500 mt-2">
                Aktiv: {rounds.filter((r) => r.status === "active").length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Teams
              </h3>
              <p className="text-4xl font-bold text-red-600">{teams.length}</p>
              <p className="text-sm text-gray-500 mt-2">Registrierte Teams</p>
            </div>
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Spiele
              </h3>
              <p className="text-4xl font-bold text-red-600">
                {allGames.length}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Gesamt (inkl. Historie)
              </p>
            </div>
          </div>
        )}

        {mainView === "rounds" && (
          <div className="bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Runden-Verwaltung
            </h2>
            <div className="space-y-3">
              {rounds.map((round) => (
                <div
                  key={round.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-800">
                        Runde {round.round_number}: {round.category}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          round.status === "active"
                            ? "bg-green-100 text-green-800"
                            : round.status === "completed"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {round.status === "active"
                          ? "Läuft"
                          : round.status === "completed"
                          ? "Abgeschlossen"
                          : "Wartet"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedRound(round);
                        setRoundView("detail");
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Details
                    </button>
                    {round.status === "waiting" && (
                      <>
                        <button
                          onClick={() => startRound(round.id)}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          Starten
                        </button>
                        <button
                          onClick={() => deleteRound(round)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                          Löschen
                        </button>
                      </>
                    )}
                    {round.status === "active" && (
                      <button
                        onClick={() => completeRound(round.id)}
                        className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                      >
                        Beenden
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {rounds.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  Noch keine Runden erstellt
                </p>
              )}
            </div>
          </div>
        )}

        {mainView === "create-round" && (
          <div className="bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Neue Runde erstellen
            </h2>
            <form onSubmit={createNewRound} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategorie
                </label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="z.B. Geschichte, Sport, Musik..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fragen (10 Stück)
                </label>
                {newQuestions.map((q, index) => (
                  <input
                    key={index}
                    type="text"
                    value={q}
                    onChange={(e) => {
                      const updated = [...newQuestions];
                      updated[index] = e.target.value;
                      setNewQuestions(updated);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder={`Frage ${index + 1}`}
                    required
                  />
                ))}
              </div>
              <button
                type="submit"
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Runde Erstellen
              </button>
            </form>
          </div>
        )}

        {mainView === "teams" && (
          <div className="bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Team-Verwaltung
            </h2>
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <h3 className="font-semibold text-gray-800">{team.name}</h3>
                    <p className="text-sm text-gray-600">
                      {team.members_count}{" "}
                      {team.members_count === 1 ? "Mitglied" : "Mitglieder"}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTeam(team)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Löschen
                  </button>
                </div>
              ))}
              {teams.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  Noch keine Teams registriert
                </p>
              )}
            </div>
          </div>
        )}

        {mainView === "history" && (
          <div className="bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Spiele-Historie
            </h2>
            <div className="space-y-4">
              {allGames.map((game) => (
                <div key={game.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">
                        {game.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(game.date).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        game.status === "active"
                          ? "bg-green-100 text-green-800"
                          : game.status === "completed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {game.status === "active"
                        ? "Aktiv"
                        : game.status === "completed"
                        ? "Abgeschlossen"
                        : "Archiviert"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 italic">
                    Rankings folgen in zukünftiger Version
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
