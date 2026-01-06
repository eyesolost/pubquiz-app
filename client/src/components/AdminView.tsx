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

interface Category {
  id: string;
  bezeichnung: string;
}

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  category_id: string | null;
  categories: Category | null;
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

interface TeamScore {
  team_id: string;
  team_name: string;
  total_points: number;
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
const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => event.target.select();
  const [newCategory, setNewCategory] = useState("");
  const [newQuestions, setNewQuestions] = useState<string[]>(
    Array(10).fill("")
  );
  const [newQuestionCategories, setNewQuestionCategories] = useState<(string | null)[]>(
    Array(10).fill(null)
  );
  const [categories, setCategories] = useState<Category[]>([]);

  const [mainView, setMainView] = useState<
    "overview" | "rounds" | "teams" | "history" | "create-round" | "games" | "game-detail"
  >("overview");
  const [roundView, setRoundView] = useState<"list" | "detail" | "evaluate" | "create">(
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
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameRounds, setGameRounds] = useState<Round[]>([]);
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [newGameName, setNewGameName] = useState("");
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);

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
      loadCategories();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeGame) {
      loadRounds();
    }
  }, [activeGame]);

  useEffect(() => {
    if (selectedGame && mainView === "rounds") {
      loadRounds();
    }
  }, [selectedGame, mainView]);

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

    setActiveGame(data || null);
  };

  const loadAllGames = async () => {
    const { data } = await supabase
      .from("games")
      .select("*")
      .order("date", { ascending: false });

    setAllGames(data || []);
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("bezeichnung");

    setCategories(data || []);
  };

  const loadRounds = async () => {
    const targetGame = selectedGame || activeGame;
    if (!targetGame) return;

    const { data } = await supabase
      .from("rounds")
      .select("*")
      .eq("game_id", targetGame.id)
      .order("round_number");

    setRounds(data || []);
  };

  const loadTeams = async () => {
    const targetGame = selectedGame || activeGame;
    if (!targetGame) {
      setTeams([]);
      return;
    }

    const { data } = await supabase
      .from("game_teams")
      .select("teams(*)")
      .eq("game_id", targetGame.id)
      .order("created_at");

    if (data) {
      setTeams(data.map((gt: any) => gt.teams).filter(Boolean));
    } else {
      setTeams([]);
    }
  };

  const loadAvailableTeamsForAdding = async () => {
    const targetGame = selectedGame || activeGame;
    if (!targetGame) {
      setAvailableTeams([]);
      return;
    }

    // Lade Teams, die NICHT in diesem Spiel sind
    const { data: allTeamsData } = await supabase
      .from("teams")
      .select("*")
      .order("name");

    const { data: gameTeamsData } = await supabase
      .from("game_teams")
      .select("team_id")
      .eq("game_id", targetGame.id);

    if (allTeamsData && gameTeamsData) {
      const gameTeamIds = new Set(gameTeamsData.map((gt: any) => gt.team_id));
      const availableTeams = allTeamsData.filter(
        (team) => !gameTeamIds.has(team.id)
      );
      setAvailableTeams(availableTeams);
    } else {
      setAvailableTeams([]);
    }
  };

  const addTeamToGame = async (teamId: string) => {
    const targetGame = selectedGame || activeGame;
    if (!targetGame) return;

    const { error } = await supabase
      .from("game_teams")
      .insert([{ game_id: targetGame.id, team_id: teamId }]);

    if (!error) {
      await loadTeams();
      await loadAvailableTeamsForAdding();
      alert("Team hinzugefügt!");
    } else {
      alert("Fehler beim Hinzufügen des Teams!");
    }
  };

  const loadQuestions = async () => {
    if (!selectedRound) return;

    const { data, error } = await supabase
      .from("round_questions")
      .select(
        `
        question_id,
        questions(
          id,
          question_number,
          question_text,
          category_id,
          categories(id, bezeichnung)
        )
      `
      )
      .eq("round_id", selectedRound.id)
      .order("question_order");

    if (error) {
      console.error("Error loading questions:", error);
      setQuestions([]);
      return;
    }

    if (data && data.length > 0) {
      const questions = data
        .map((rq: any) => rq.questions)
        .filter(Boolean)
        .sort((a: any, b: any) => (a.question_number || 0) - (b.question_number || 0));
      setQuestions(questions);
    } else {
      setQuestions([]);
    }
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
      .eq("round_id", selectedRound.id)
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
      .eq("round_id", selectedRound.id)
      .eq("team_id", teamId)
      .in("question_id", questionIds);

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
      formatted.sort((a, b) => a.question_number - b.question_number);
    setTeamAnswers(formatted);
  };

  const createNewRound = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetGame = selectedGame || activeGame;
    if (!targetGame) {
      alert("Bitte wähle ein Spiel aus!");
      return;
    }

    const nextRoundNumber = rounds.length + 1;

    const { data: round } = await supabase
      .from("rounds")
      .insert([
        {
          game_id: targetGame.id,
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
        question_number: index + 1,
        question_text: q,
        category_id: newQuestionCategories[index] || null,
      }));

    // Erst die Questions erstellen
    const { data: createdQuestions } = await supabase
      .from("questions")
      .insert(questionsToInsert)
      .select();

    // Dann die round_questions Einträge erstellen
    if (createdQuestions && createdQuestions.length > 0) {
      const roundQuestions = createdQuestions.map((q, index) => ({
        round_id: round.id,
        question_id: q.id,
        question_order: index + 1,
      }));

      await supabase.from("round_questions").insert(roundQuestions);
    }

    setNewCategory("");
    setNewQuestions(Array(10).fill(""));
    setNewQuestionCategories(Array(10).fill(null));
    loadRounds();
    setRoundView("list");
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
        try {
          // round_questions Einträge werden durch CASCADE automatisch gelöscht
          // answers Einträge werden auch cascading gelöscht
          const { error } = await supabase
            .from("rounds")
            .delete()
            .eq("id", round.id);

          if (error) throw error;

          loadRounds();
          setConfirmDialog({ ...confirmDialog, show: false });
          alert("Runde gelöscht!");
        } catch (error) {
          console.error("Fehler beim Löschen der Runde:", error);
          alert("Fehler beim Löschen der Runde!");
        }
      },
    });
  };

  const deleteTeam = (team: Team) => {
    setConfirmDialog({
      show: true,
      title: "Team löschen",
      message: `Möchten Sie das Team "${team.name}" wirklich löschen? Alle Antworten und Verbindungen dieses Teams werden ebenfalls gelöscht.`,
      onConfirm: async () => {
        try {
          // 1. Lösche game_teams Einträge
          await supabase.from("game_teams").delete().eq("team_id", team.id);

          // 2. Lösche das Team selbst (cascades löscht auch answers)
          await supabase.from("teams").delete().eq("id", team.id);

          loadTeams();
          setConfirmDialog({ ...confirmDialog, show: false });
          alert("Team gelöscht!");
        } catch (error) {
          console.error("Fehler beim Löschen des Teams:", error);
          alert("Fehler beim Löschen des Teams!");
        }
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

  const updateRoundCategory = async (roundId: string, newCategory: string) => {
    const { error } = await supabase
      .from("rounds")
      .update({ category: newCategory })
      .eq("id", roundId);

    if (!error && selectedRound) {
      setSelectedRound({ ...selectedRound, category: newCategory });
      // Aktualisiere auch den rounds State für die Runden-Verwaltung
      setRounds(
        rounds.map((r) =>
          r.id === roundId ? { ...r, category: newCategory } : r
        )
      );
      loadGameRounds(selectedRound.game_id);
    }
  };

  const handleCategorySelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (selectedRound && value) {
      await updateRoundCategory(selectedRound.id, value);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.trim() || !selectedRound) return;

    const { data, error } = await supabase
      .from("categories")
      .insert([{ bezeichnung: newCategory }])
      .select()
      .single();

    if (!error && data) {
      setCategories([...categories, data]);
      await updateRoundCategory(selectedRound.id, newCategory);
      setNewCategory("");
    }
  };

  const createNewCategoryForRound = async (categoryName: string) => {
    if (!categoryName.trim()) return;

    const { data, error } = await supabase
      .from("categories")
      .insert([{ bezeichnung: categoryName }])
      .select()
      .single();

    if (!error && data) {
      setCategories([...categories, data]);
      setNewCategory(categoryName);
      return true;
    }
    return false;
  };

  const loadGameRounds = async (gameId: string) => {
    const { data } = await supabase
      .from("rounds")
      .select("*")
      .eq("game_id", gameId)
      .order("round_number");

    setGameRounds(data || []);
  };

  const loadTeamScores = async (gameId: string) => {
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name")
      .eq("game_id", gameId);

    if (!teamsData) return;

    const scores: TeamScore[] = [];

    for (const team of teamsData) {
      const { data: answers } = await supabase
        .from("answers")
        .select("points")
        .eq("team_id", team.id)
        .eq("evaluated", true);

      const total = answers?.reduce((sum, a) => sum + (a.points || 0), 0) || 0;
      scores.push({
        team_id: team.id,
        team_name: team.name,
        total_points: total,
      });
    }

    scores.sort((a, b) => b.total_points - a.total_points);
    setTeamScores(scores);
  };

  const loadGameTeams = async (gameId: string) => {
    const { data } = await supabase
      .from("teams")
      .select("*")
      .eq("game_id", gameId)
      .order("name");

    setTeams(data || []);
  };

  const completeGame = async (gameId: string) => {
    setConfirmDialog({
      show: true,
      title: "Spiel beenden",
      message: "Möchten Sie dieses Spiel wirklich beenden?",
      onConfirm: async () => {
        await supabase
          .from("games")
          .update({ status: "completed" })
          .eq("id", gameId);

        await loadAllGames();
        await loadActiveGame();
        setConfirmDialog({ ...confirmDialog, show: false });
        alert("Spiel beendet!");
      },
    });
  };

  const reactivateGame = async (gameId: string) => {
    setConfirmDialog({
      show: true,
      title: "Spiel reaktivieren",
      message: "Möchten Sie dieses Spiel reaktivieren?",
      onConfirm: async () => {
        await supabase
          .from("games")
          .update({ status: "active" })
          .eq("id", gameId);

        await loadAllGames();
        await loadActiveGame();
        setConfirmDialog({ ...confirmDialog, show: false });
        alert("Spiel reaktiviert!");
      },
    });
  };

  const deleteGame = async (gameId: string) => {
    setConfirmDialog({
      show: true,
      title: "Spiel löschen",
      message: "Möchten Sie dieses Spiel wirklich löschen? Alle Runden und Antworten werden ebenfalls gelöscht!",
      onConfirm: async () => {
        try {
          // 1. Alle Runden dieses Spiels abrufen
          const { data: roundsData, error: roundsError } = await supabase
            .from("rounds")
            .select("id")
            .eq("game_id", gameId);

          if (roundsError) throw roundsError;

          // 2. Alle Answers aller Runden dieses Spiels löschen
          if (roundsData && roundsData.length > 0) {
            const roundIds = roundsData.map((r) => r.id);
            
            // 1. Alle round_questions Einträge für diese Runden finden
            const { data: roundQuestionsData } = await supabase
              .from("round_questions")
              .select("question_id")
              .in("round_id", roundIds);

            if (roundQuestionsData && roundQuestionsData.length > 0) {
              const questionIds = roundQuestionsData.map((rq) => rq.question_id);
              
              // 2. Alle Answers für diese Fragen löschen
              const { error: answersError } = await supabase
                .from("answers")
                .delete()
                .in("question_id", questionIds);

              if (answersError) throw answersError;
            }

            // 3. round_questions Einträge löschen (CASCADE wird Answers berücksichtigen)
            const { error: deleteRoundQuestionsError } = await supabase
              .from("round_questions")
              .delete()
              .in("round_id", roundIds);

            if (deleteRoundQuestionsError) throw deleteRoundQuestionsError;

            // 4. Rounds löschen (CASCADE wird team_scores berücksichtigen)
            const { error: deleteRoundsError } = await supabase
              .from("rounds")
              .delete()
              .in("id", roundIds);

            if (deleteRoundsError) throw deleteRoundsError;
          }

          // 3. Teams dieses Spiels löschen
          const { error: deleteTeamsError } = await supabase
            .from("teams")
            .delete()
            .eq("game_id", gameId);

          if (deleteTeamsError) throw deleteTeamsError;

          // 4. Das Spiel selbst löschen
          const { error: deleteGameError } = await supabase
            .from("games")
            .delete()
            .eq("id", gameId);

          if (deleteGameError) throw deleteGameError;

          await loadAllGames();
          setSelectedGame(null);
          setConfirmDialog({ ...confirmDialog, show: false });
          alert("Spiel gelöscht!");
        } catch (error) {
          console.error("Fehler beim Löschen des Spiels:", error);
          alert("Fehler beim Löschen des Spiels!");
        }
      },
    });
  };

  const createNewGame = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data, error } = await supabase
      .from("games")
      .insert([
        {
          name: newGameName,
          date: new Date().toISOString().split("T")[0],
          status: "active",
        },
      ])
      .select()
      .single();

    if (data && !error) {
      await loadAllGames();
      setNewGameName("");
      alert(`Neues Spiel "${data.name}" erstellt!`);
    } else {
      alert("Fehler beim Erstellen des Spiels: " + error?.message);
    }
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
                  localPoints[answer.id] ?? answer.points;
  
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
                        onFocus={handleFocus}
                        onChange={(e) => handlePointsInput(answer.id, e.currentTarget.value)}                     
                        className="w-20 px-3 py-2 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />

                      {/* Increment Button */}
                    {/*  <button
                        onClick={() => incrementPoints(answer.id)}
                        onKeyDown={(e) => handlePointsInput(answer.id, (e.target as HTMLInputElement).value)}
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
    const canRestart = selectedRound.status === "completed" && teamsWithAnswers.length < teams.length|| selectedRound.status === "active" && teamsWithAnswers.length < teams.length;

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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Runde {selectedRound.round_number}
              </h2>
              {canEdit && (
                <div className="flex gap-2 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kategorie
                    </label>
                    <select
                      value={selectedRound.category}
                      onChange={handleCategorySelect}
                      title="Kategorie auswählen"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Kategorie wählen...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.bezeichnung}>
                          {cat.bezeichnung}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Neue Kategorie..."
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleCreateCategory();
                        }
                      }}
                    />
                    <button
                      onClick={handleCreateCategory}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium"
                    >
                      Neu
                    </button>
                  </div>
                </div>
              )}
              {isReadOnly && (
                <div className="text-lg font-semibold text-red-600">
                  {selectedRound.category}
                </div>
              )}
            </div>

            {canEdit && (
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-4">
                  Fragen bearbeiten
                </h3>
                <div className="space-y-3">
                  {questions.map((q) => (
                    <div key={q.id} className="border-l-4 border-red-600 pl-3 py-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-600 font-medium w-8">
                          {q.question_number}.
                        </span>
                      </div>
                      <input
                        title="Bearbeiten"
                        type="text"
                        value={q.question_text}
                        onChange={(e) => updateQuestion(q.id, e.target.value)}
                        className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
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
                    <div key={q.id} className="p-3 bg-gray-50 rounded-lg border-l-4 border-red-600">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-700">
                          {q.question_number}.
                        </span>
                      </div>
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

          {canRestart && (
            <div className="bg-white rounded-lg shadow-xl p-6 mt-6">
              <button
                onClick={() => startRound(selectedRound.id)}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Runde neu starten
              </button>
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

          {selectedGame && (
            <div className="text-gray-600 mt-2">
              Ausgewähltes Spiel:{" "}
              <span className="font-semibold text-blue-600">{selectedGame.name}</span>
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
              onClick={() => setMainView("games")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                mainView === "games"
                  ? "bg-red-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Spiele
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
            {roundView === "list" && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Runden-Verwaltung
                  </h2>
                  <button
                    onClick={() => setRoundView("create")}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                  >
                    + Neue Runde
                  </button>
                </div>
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
              </>
            )}

            {roundView === "create" && (
              <>
                <button
                  onClick={() => setRoundView("list")}
                  className="flex items-center text-gray-600 hover:text-gray-800 transition mb-4"
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
                  Zurück zur Liste
                </button>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  Neue Runde erstellen
                </h3>
                <form onSubmit={createNewRound} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategorie
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        title="Kategorie auswählen oder neue erstellen"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      >
                        <option value="">Kategorie wählen...</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.bezeichnung}>
                            {cat.bezeichnung}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          // Ermögliche freie Eingabe für neue Kategorie
                          const input = prompt("Neue Kategorie eingeben:");
                          if (input?.trim()) {
                            const created = await createNewCategoryForRound(input.trim());
                            if (created) {
                              alert(`Kategorie "${input.trim()}" erstellt und ausgewählt!`);
                            }
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                      >
                        Neu
                      </button>
                    </div>

                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fragen (10 Stück) mit Kategorien
                    </label>
                    {newQuestions.map((q, index) => (
                      <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <input
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
                      
                      </div>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                  >
                    Runde Erstellen
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {mainView === "teams" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Teams im Spiel
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
                    Noch keine Teams in diesem Spiel
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Teams hinzufügen
              </h2>
              <button
                onClick={() => loadAvailableTeamsForAdding()}
                className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Verfügbare Teams laden
              </button>
              {availableTeams.length > 0 ? (
                <div className="space-y-3">
                  {availableTeams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {team.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {team.members_count}{" "}
                          {team.members_count === 1 ? "Mitglied" : "Mitglieder"}
                        </p>
                      </div>
                      <button
                        onClick={() => addTeamToGame(team.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Hinzufügen
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Keine verfügbaren Teams vorhanden
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
                  <button
                    onClick={() => {
                      setSelectedGame(game);
                      loadGameRounds(game.id);
                      loadGameTeams(game.id);
                      loadTeamScores(game.id);
                      setMainView("game-detail");
                    }}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Details anzeigen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {mainView === "games" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Spiele-Verwaltung
              </h2>
              
              {activeGame && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Aktives Spiel: {activeGame.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(activeGame.date).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <button
                      onClick={() => completeGame(activeGame.id)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      Spiel beenden
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={createNewGame} className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  Neues Spiel erstellen
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spiel-Name
                  </label>
                  <input
                    type="text"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="z.B. Pubquiz Winterturnier 2026"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  Neues Spiel Erstellen
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-xl p-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">
                Alle Spiele
              </h3>
              <div className="space-y-3">
                {allGames.map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {game.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {new Date(game.date).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          game.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {game.status === "active" ? "Aktiv" : "Beendet"}
                      </span>
                      {game.status === "completed" && (
                        <button
                          onClick={() => reactivateGame(game.id)}
                          title="Spiel reaktivieren"
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                      )}
                      {game.status === "active" && (
                        <button
                          onClick={() => completeGame(game.id)}
                          className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                        >
                          Beenden
                        </button>
                      )}
                      <button
                        onClick={() => deleteGame(game.id)}
                        title="Spiel löschen"
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedGame(game);
                          loadGameRounds(game.id);
                          loadGameTeams(game.id);
                          loadTeamScores(game.id);
                          setMainView("game-detail");
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {mainView === "game-detail" && selectedGame && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <button
                    onClick={() => setMainView("games")}
                    className="flex items-center text-gray-600 hover:text-gray-800 transition mb-4"
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
                    Zurück zur Spiele-Liste
                  </button>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedGame.name}
                  </h2>
                  <p className="text-gray-600">
                    {new Date(selectedGame.date).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-sm font-semibold ${
                    selectedGame.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {selectedGame.status === "active" ? "Aktiv" : "Beendet"}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-gray-700 mb-4">
                🏆 Spielstand
              </h3>
              {teamScores.length > 0 ? (
                <div className="space-y-2 mb-6">
                  {teamScores.map((team, index) => (
                    <div
                      key={team.team_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-gray-400">
                          #{index + 1}
                        </span>
                        <span className="font-semibold text-gray-800">
                          {team.team_name}
                        </span>
                      </div>
                      <span className="text-xl font-bold text-red-600">
                        {team.total_points} Pkt
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 mb-6">Noch keine Punkte vergeben</p>
              )}

              <h3 className="text-xl font-semibold text-gray-700 mb-4">
                📋 Runden
              </h3>
              {gameRounds.length > 0 ? (
                <div className="space-y-3">
                  {gameRounds.map((round) => (
                    <div
                      key={round.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedRound(round);
                        setRoundView("detail");
                        setMainView("rounds");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            Runde {round.round_number}: {round.category}
                          </h4>
                          {round.completed_at && (
                            <p className="text-sm text-gray-600">
                              Abgeschlossen:{" "}
                              {new Date(round.completed_at).toLocaleDateString(
                                "de-DE"
                              )}
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            round.status === "active"
                              ? "bg-green-100 text-green-800"
                              : round.status === "completed"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {round.status === "active"
                            ? "Läuft"
                            : round.status === "completed"
                            ? "Beendet"
                            : "Wartet"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Noch keine Runden erstellt</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
