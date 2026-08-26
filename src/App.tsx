import { useEffect } from "react";
import "./App.css";

import { ChessBoard } from "./components/ChessBoard";
import { MenuScreen } from "./components/MenuScreen";
import { MoveHistory } from "./components/MoveHistory";
import { OnlineScreen } from "./components/OnlineScreen";
import { ThemeButton } from "./components/ThemeButton";

import { useChessGame } from "./hooks/useChessGame";
import { useOnlineSession } from "./hooks/useOnlineSession";
import { useStockfish } from "./hooks/useStockfish";
import { useTheme } from "./hooks/useTheme";

/* =========================================================
   MAIN APP
========================================================= */

function App() {
  /* -------------------------------------------------------
     THEME
  ------------------------------------------------------- */

  const { theme, toggleTheme } =
    useTheme();

  /* -------------------------------------------------------
     STOCKFISH
  ------------------------------------------------------- */

  const {
    bestMove,
    isThinking,
    difficulty,
    setDifficulty,
    getBestMove,
  } = useStockfish();

  /* -------------------------------------------------------
     LOCAL / AI GAME
  ------------------------------------------------------- */

  const {
    game,
    fen,
    moveHistory,
    makeMove,
    makeEngineMove,
    resetGame,
  } = useChessGame(difficulty);

  /* -------------------------------------------------------
     ONLINE SESSION (mode, lobby, reconnexion, handlers)
  ------------------------------------------------------- */

  const {
    mode,
    setMode,
    onlineGameId,
    onlineGame,
    playerColor,
    onlineMessage,
    copied,
    createOnlineGame,
    joinOnlineGame,
    copyGameId,
    leaveOnlineGame,
    resetOnlineState,
  } = useOnlineSession();

  /* =======================================================
     STOCKFISH -> COUP ENGINE
  ======================================================= */

  useEffect(() => {
    if (
      !bestMove ||
      mode !== "ai"
    ) {
      return;
    }

    makeEngineMove(bestMove);
  }, [
    bestMove,
    mode,
    makeEngineMove,
  ]);

  /* =======================================================
     AI MOVE
  ======================================================= */

  function handlePlayerMove(
    from: string,
    to: string
  ): boolean {
    if (mode !== "ai") {
      return false;
    }

    if (isThinking) {
      return false;
    }

    if (game.turn() !== "w") {
      return false;
    }

    const newFen =
      makeMove(
        from,
        to
      );

    if (newFen) {
      setTimeout(() => {
        getBestMove(newFen);
      }, 100);
    }

    return newFen !== null;
  }

  /* =======================================================
     NEW AI GAME
  ======================================================= */

  function handleNewGame() {
    resetGame();

    setMode("ai");

    resetOnlineState();
  }

  /* =======================================================
     AI STATUS
  ======================================================= */

  const turn =
    game.turn() === "w"
      ? "Blancs"
      : "Noirs";

  let status =
    `Tour des ${turn}`;

  if (isThinking) {
    status =
      "🤖 Stockfish réfléchit...";
  } else if (
    game.isCheckmate()
  ) {
    status =
      `Échec et mat ! ${
        turn === "Blancs"
          ? "Noirs"
          : "Blancs"
      } gagnent !`;
  } else if (
    game.isStalemate()
  ) {
    status = "Pat !";
  } else if (
    game.isDraw()
  ) {
    status =
      "Partie nulle !";
  } else if (
    game.isCheck()
  ) {
    status =
      `Échec ! Tour des ${turn}`;
  }

  /* =======================================================
     THEME CLASS
  ======================================================= */

  const appClassName =
    theme === "dark"
      ? "app-dark"
      : "app-light";

  /* =======================================================
     MENU
  ======================================================= */

  if (mode === "menu") {
    return (
      <MenuScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelectAi={() =>
          setMode("ai")
        }
        onSelectOnline={() =>
          setMode("online")
        }
      />
    );
  }

  /* =======================================================
     ONLINE MODE
  ======================================================= */

  if (mode === "online") {
    return (
      <OnlineScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        onlineGameId={onlineGameId}
        onlineGame={onlineGame}
        playerColor={playerColor}
        onlineMessage={onlineMessage}
        copied={copied}
        onCreate={createOnlineGame}
        onJoin={joinOnlineGame}
        onCopy={copyGameId}
        onLeave={leaveOnlineGame}
        onBackToMenu={() =>
          setMode("menu")
        }
      />
    );
  }

  /* =======================================================
     AI MODE
  ======================================================= */

  return (
    <main className={appClassName}>
      <ThemeButton
        theme={theme}
        onToggle={toggleTheme}
      />

      <h1>
        ♟️ Échecs
      </h1>

      <p>
        {status}
      </p>

      <div>
        <label htmlFor="difficulty">
          Difficulté :{" "}
        </label>

        <select
          id="difficulty"
          value={difficulty}
          onChange={(event) =>
            setDifficulty(
              event.target
                .value as
                | "easy"
                | "medium"
                | "hard"
            )
          }
          disabled={
            isThinking
          }
        >
          <option value="easy">
            🟢 Facile
          </option>

          <option value="medium">
            🟡 Moyen
          </option>

          <option value="hard">
            🔴 Difficile
          </option>
        </select>
      </div>

      <ChessBoard
        fen={fen}
        onMove={
          handlePlayerMove
        }
      />

      <MoveHistory
        moves={moveHistory}
        title="📜 Historique des coups"
      />

      <button
        onClick={
          handleNewGame
        }
      >
        🔄 Nouvelle partie
      </button>

      <button
        onClick={() =>
          setMode("menu")
        }
      >
        ← Menu
      </button>
    </main>
  );
}

/* =========================================================
   EXPORT
========================================================= */

export default App;
