import { useEffect, useState } from "react";
import "./App.css";

import { ChessBoard } from "./components/ChessBoard";
import { useChessGame } from "./hooks/useChessGame";
import { useOnlineGame } from "./hooks/useOnlineGame";
import { useStockfish } from "./hooks/useStockfish";

import {
  createGame,
  getGame,
  joinGame,
  type OnlineGame,
} from "./services/gameService";

/* =========================================================
   TYPES
========================================================= */

type GameMode = "menu" | "ai" | "online";

type PlayerColor = "w" | "b";

type Theme = "light" | "dark";

/* =========================================================
   LOCAL STORAGE KEYS
========================================================= */

const ONLINE_GAME_ID_KEY =
  "echecs-online-game-id";

const ONLINE_PLAYER_COLOR_KEY =
  "echecs-online-player-color";

const ONLINE_MODE_KEY =
  "echecs-online-mode";

/* =========================================================
   PLAYER ID
========================================================= */

function getPlayerId(): string {
  const storageKey = "echecs-player-id";

  const existingId =
    localStorage.getItem(storageKey);

  if (existingId) {
    return existingId;
  }

  const newId =
    crypto.randomUUID();

  localStorage.setItem(
    storageKey,
    newId
  );

  return newId;
}

/* =========================================================
   MOVE HISTORY
========================================================= */

interface GameMove {
  notation: string;
}

interface MoveHistoryProps {
  moves: string[] | GameMove[];
  title?: string;
}

function MoveHistory({
  moves,
  title = "📜 Historique des coups",
}: MoveHistoryProps) {
  const displayMoves = moves.map(
    (move) => {
      if (typeof move === "string") {
        return move;
      }

      return move.notation;
    }
  );

  return (
    <div className="move-history">
      <h3>{title}</h3>

      {displayMoves.length === 0 ? (
        <p
          style={{
            marginBottom: 0,
            opacity: 0.7,
          }}
        >
          Aucun coup joué.
        </p>
      ) : (
        <div className="move-history-grid">
          {Array.from(
            {
              length: Math.ceil(
                displayMoves.length / 2
              ),
            },
            (_, index) => {
              const whiteMove =
                displayMoves[
                  index * 2
                ];

              const blackMove =
                displayMoves[
                  index * 2 + 1
                ];

              return (
                <div
                  key={index}
                  style={{
                    display: "contents",
                  }}
                >
                  <strong>
                    {index + 1}.
                  </strong>

                  <span>
                    {whiteMove || "…"}
                  </span>

                  <span>
                    {blackMove || "…"}
                  </span>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

function App() {
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
     GLOBAL STATE
  ------------------------------------------------------- */

  const [mode, setMode] =
    useState<GameMode>(() => {
      const savedMode =
        localStorage.getItem(
          ONLINE_MODE_KEY
        );

      return savedMode === "online"
        ? "online"
        : "menu";
    });

  const [onlineGameId, setOnlineGameId] =
    useState<string | null>(() => {
      return localStorage.getItem(
        ONLINE_GAME_ID_KEY
      );
    });

  const [onlineGame, setOnlineGame] =
    useState<OnlineGame | null>(null);

  const [playerColor, setPlayerColor] =
    useState<PlayerColor | null>(() => {
      const savedColor =
        localStorage.getItem(
          ONLINE_PLAYER_COLOR_KEY
        );

      if (
        savedColor === "w" ||
        savedColor === "b"
      ) {
        return savedColor;
      }

      return null;
    });

  const [onlineMessage, setOnlineMessage] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  /* -------------------------------------------------------
     THEME
  ------------------------------------------------------- */

  const [theme, setTheme] =
    useState<Theme>(() => {
      const savedTheme =
        localStorage.getItem(
          "echecs-theme"
        );

      return savedTheme === "dark"
        ? "dark"
        : "light";
    });

  /* =======================================================
     PERSISTENCE DU MODE ONLINE
  ======================================================= */

  useEffect(() => {
    if (
      mode === "online" &&
      onlineGameId &&
      playerColor
    ) {
      localStorage.setItem(
        ONLINE_MODE_KEY,
        "online"
      );

      localStorage.setItem(
        ONLINE_GAME_ID_KEY,
        onlineGameId
      );

      localStorage.setItem(
        ONLINE_PLAYER_COLOR_KEY,
        playerColor
      );
    }
  }, [
    mode,
    onlineGameId,
    playerColor,
  ]);

  /* =======================================================
     RESTAURATION APRÈS F5
  ======================================================= */

  useEffect(() => {
    if (
      mode !== "online" ||
      !onlineGameId ||
      !playerColor
    ) {
      return;
    }

    /*
     * IMPORTANT :
     * On capture les valeurs validées dans
     * des constantes locales avant d'entrer
     * dans la fonction async.
     *
     * Cela évite l'erreur TypeScript :
     * string | null -> string
     */

    const savedGameId =
      onlineGameId;

    const savedPlayerColor =
      playerColor;

    let cancelled = false;

    async function restoreOnlineGame() {
      try {
        setOnlineMessage(
          "🔄 Restauration de la partie..."
        );

        const restoredGame =
          await getGame(
            savedGameId
          );

        if (cancelled) {
          return;
        }

        /*
         * Vérification supplémentaire :
         * le joueur doit toujours appartenir
         * à cette partie.
         */

        const playerId =
          getPlayerId();

        const isWhitePlayer =
          restoredGame.white_player ===
          playerId;

        const isBlackPlayer =
          restoredGame.black_player ===
          playerId;

        if (
          !isWhitePlayer &&
          !isBlackPlayer
        ) {
          throw new Error(
            "Cette partie n'est plus associée à ce joueur."
          );
        }

        /*
         * Détermination de la vraie couleur
         * depuis la partie distante.
         */

        const restoredColor: PlayerColor =
          isWhitePlayer
            ? "w"
            : "b";

        /*
         * Petite vérification avec la couleur
         * sauvegardée.
         */

        if (
          savedPlayerColor !==
          restoredColor
        ) {
          console.warn(
            "La couleur sauvegardée ne correspondait pas à la partie. Correction automatique."
          );
        }

        setPlayerColor(
          restoredColor
        );

        setOnlineGame(
          restoredGame
        );

        setOnlineMessage(
          restoredGame.status ===
            "waiting"
            ? "🔄 Partie restaurée. En attente du deuxième joueur..."
            : "🔄 Partie restaurée."
        );

        /*
         * Mise à jour du localStorage
         * avec la couleur réelle.
         */

        localStorage.setItem(
          ONLINE_PLAYER_COLOR_KEY,
          restoredColor
        );
      } catch (error) {
        console.error(
          "Impossible de restaurer la partie :",
          error
        );

        if (cancelled) {
          return;
        }

        /*
         * Si la partie n'existe plus ou si
         * le joueur n'en fait plus partie,
         * on supprime uniquement les données
         * de reconnexion.
         */

        localStorage.removeItem(
          ONLINE_MODE_KEY
        );

        localStorage.removeItem(
          ONLINE_GAME_ID_KEY
        );

        localStorage.removeItem(
          ONLINE_PLAYER_COLOR_KEY
        );

        setMode("menu");

        setOnlineGameId(
          null
        );

        setOnlineGame(
          null
        );

        setPlayerColor(
          null
        );

        setOnlineMessage("");
      }
    }

    restoreOnlineGame();

    return () => {
      cancelled = true;
    };
  }, [
    mode,
    onlineGameId,
    playerColor,
  ]);

  /* =======================================================
     SAVE THEME
  ======================================================= */

  useEffect(() => {
    localStorage.setItem(
      "echecs-theme",
      theme
    );
  }, [theme]);

  /* =======================================================
     TOGGLE THEME
  ======================================================= */

  function toggleTheme() {
    setTheme(
      (currentTheme) =>
        currentTheme === "light"
          ? "dark"
          : "light"
    );
  }

  /* =======================================================
     STOCKFISH
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
     CREATE ONLINE GAME
  ======================================================= */

  async function handleCreateOnlineGame() {
    try {
      setOnlineMessage(
        "Création de la partie..."
      );

      const playerId =
        getPlayerId();

      const newGame =
        await createGame(
          playerId
        );

      setOnlineGameId(
        newGame.id
      );

      setOnlineGame(
        newGame
      );

      setPlayerColor("w");

      localStorage.setItem(
        ONLINE_MODE_KEY,
        "online"
      );

      localStorage.setItem(
        ONLINE_GAME_ID_KEY,
        newGame.id
      );

      localStorage.setItem(
        ONLINE_PLAYER_COLOR_KEY,
        "w"
      );

      setMode("online");

      setCopied(false);

      setOnlineMessage(
        "Partie créée ! Tu joues les Blancs. En attente du deuxième joueur..."
      );
    } catch (error) {
      console.error(error);

      setOnlineMessage(
        error instanceof Error
          ? error.message
          : "Impossible de créer la partie."
      );
    }
  }

  /* =======================================================
     JOIN ONLINE GAME
  ======================================================= */

  async function handleJoinOnlineGame() {
    const id =
      window.prompt(
        "Entre l'identifiant de la partie :"
      );

    if (!id) {
      return;
    }

    try {
      setOnlineMessage(
        "Recherche de la partie..."
      );

      const playerId =
        getPlayerId();

      const existingGame =
        await getGame(id);

      /* ---------------------------------------------------
         Déjà joueur Blanc
      --------------------------------------------------- */

      if (
        existingGame.white_player ===
        playerId
      ) {
        setPlayerColor("w");

        setOnlineGame(
          existingGame
        );

        setOnlineGameId(
          existingGame.id
        );

        localStorage.setItem(
          ONLINE_MODE_KEY,
          "online"
        );

        localStorage.setItem(
          ONLINE_GAME_ID_KEY,
          existingGame.id
        );

        localStorage.setItem(
          ONLINE_PLAYER_COLOR_KEY,
          "w"
        );

        setMode("online");

        setOnlineMessage(
          "Tu es déjà le joueur Blanc de cette partie."
        );

        return;
      }

      /* ---------------------------------------------------
         Partie déjà complète
      --------------------------------------------------- */

      if (
        existingGame.black_player &&
        existingGame.black_player !==
          playerId
      ) {
        throw new Error(
          "Cette partie possède déjà deux joueurs."
        );
      }

      /* ---------------------------------------------------
         Rejoindre comme Noir
      --------------------------------------------------- */

      const joinedGame =
        await joinGame(
          id,
          playerId
        );

      setOnlineGameId(
        joinedGame.id
      );

      setOnlineGame(
        joinedGame
      );

      setPlayerColor("b");

      localStorage.setItem(
        ONLINE_MODE_KEY,
        "online"
      );

      localStorage.setItem(
        ONLINE_GAME_ID_KEY,
        joinedGame.id
      );

      localStorage.setItem(
        ONLINE_PLAYER_COLOR_KEY,
        "b"
      );

      setMode("online");

      setOnlineMessage(
        "Partie rejointe ! Tu joues les Noirs."
      );
    } catch (error) {
      console.error(error);

      setOnlineMessage(
        error instanceof Error
          ? error.message
          : "Impossible de rejoindre la partie."
      );
    }
  }

  /* =======================================================
     COPY GAME ID
  ======================================================= */

  async function handleCopyGameId() {
    if (!onlineGameId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        onlineGameId
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Impossible de copier l'ID :",
        error
      );
    }
  }

  /* =======================================================
     NEW AI GAME
  ======================================================= */

  function handleNewGame() {
    resetGame();

    setMode("ai");

    setOnlineGameId(null);

    setOnlineGame(null);

    setPlayerColor(null);

    setOnlineMessage("");

    setCopied(false);

    localStorage.removeItem(
      ONLINE_MODE_KEY
    );

    localStorage.removeItem(
      ONLINE_GAME_ID_KEY
    );

    localStorage.removeItem(
      ONLINE_PLAYER_COLOR_KEY
    );
  }

  /* =======================================================
     LEAVE ONLINE GAME
  ======================================================= */

  function handleLeaveOnlineGame() {
    localStorage.removeItem(
      ONLINE_MODE_KEY
    );

    localStorage.removeItem(
      ONLINE_GAME_ID_KEY
    );

    localStorage.removeItem(
      ONLINE_PLAYER_COLOR_KEY
    );

    setMode("menu");

    setOnlineGameId(null);

    setOnlineGame(null);

    setPlayerColor(null);

    setOnlineMessage("");

    setCopied(false);
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
      <main className={appClassName}>
        <button
          className="theme-button"
          onClick={
            toggleTheme
          }
          aria-label="Changer de thème"
        >
          {theme === "light"
            ? "🌙 Mode sombre"
            : "☀️ Mode clair"}
        </button>

        <h1>
          ♟️ Échecs
        </h1>

        <h2>
          Choisir un mode
        </h2>

        <button
          onClick={() =>
            setMode("ai")
          }
        >
          🤖 Jouer contre Stockfish
        </button>

        <button
          onClick={() =>
            setMode("online")
          }
        >
          🌐 Jouer en ligne
        </button>
      </main>
    );
  }

  /* =======================================================
     ONLINE MODE
  ======================================================= */

  if (mode === "online") {
    return (
      <main className={appClassName}>
        <button
          className="theme-button"
          onClick={
            toggleTheme
          }
          aria-label="Changer de thème"
        >
          {theme === "light"
            ? "🌙 Mode sombre"
            : "☀️ Mode clair"}
        </button>

        <h1>
          ♟️ Échecs
        </h1>

        <h2>
          🌐 Partie en ligne
        </h2>

        {!onlineGameId && (
          <>
            <button
              onClick={
                handleCreateOnlineGame
              }
            >
              🎮 Créer une partie
            </button>

            <button
              onClick={
                handleJoinOnlineGame
              }
            >
              🔗 Rejoindre une partie
            </button>
          </>
        )}

        {onlineMessage && (
          <p>
            {onlineMessage}
          </p>
        )}

        {onlineGameId && (
          <>
            <div className="panel">
              <p
                style={{
                  marginTop: 0,
                  marginBottom:
                    "8px",
                  fontWeight:
                    "bold",
                }}
              >
                🆔 Identifiant de la partie
              </p>

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  flexWrap:
                    "wrap",
                }}
              >
                <code
                  style={{
                    padding:
                      "10px 12px",
                    backgroundColor:
                      "#ffffff",
                    border:
                      "1px solid #ddd",
                    borderRadius:
                      "8px",
                    fontSize:
                      "14px",
                    wordBreak:
                      "break-all",
                    flex: 1,
                  }}
                >
                  {onlineGameId}
                </code>

                <button
                  onClick={
                    handleCopyGameId
                  }
                  style={{
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {copied
                    ? "✅ Copié !"
                    : "📋 Copier"}
                </button>
              </div>

              {onlineGame?.status ===
                "waiting" && (
                <p
                  style={{
                    marginBottom: 0,
                    fontSize:
                      "14px",
                    opacity: 0.8,
                  }}
                >
                  💡 Envoie cet
                  identifiant à
                  ton adversaire
                  pour qu'il
                  puisse rejoindre
                  la partie.
                </p>
              )}
            </div>

            {playerColor && (
              <p>
                <strong>
                  Tu joues :
                </strong>{" "}
                {playerColor ===
                "w"
                  ? "⚪ Blancs"
                  : "⚫ Noirs"}
              </p>
            )}

            {onlineGame && (
              <>
                <p>
                  <strong>
                    Statut :
                  </strong>{" "}
                  {onlineGame.status ===
                  "waiting"
                    ? "⏳ En attente du deuxième joueur"
                    : onlineGame.status ===
                        "playing"
                    ? "🟢 Partie en cours"
                    : "🏁 Partie terminée"}
                </p>

                <p>
                  <strong>
                    Tour :
                  </strong>{" "}
                  {onlineGame.turn ===
                  "w"
                    ? "⚪ Blancs"
                    : "⚫ Noirs"}
                </p>

                {playerColor &&
                  onlineGameId && (
                  <OnlineChessBoard
                    gameId={
                      onlineGameId
                    }
                    playerColor={
                      playerColor
                    }
                  />
                )}
              </>
            )}

            <button
              onClick={
                handleLeaveOnlineGame
              }
            >
              ← Quitter la partie
            </button>
          </>
        )}

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

  /* =======================================================
     AI MODE
  ======================================================= */

  return (
    <main className={appClassName}>
      <button
        className="theme-button"
        onClick={
          toggleTheme
        }
        aria-label="Changer de thème"
      >
        {theme === "light"
          ? "🌙 Mode sombre"
          : "☀️ Mode clair"}
      </button>

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
   ONLINE CHESS BOARD
========================================================= */

interface OnlineChessBoardProps {
  gameId: string;
  playerColor: PlayerColor;
}

function OnlineChessBoard({
  gameId,
  playerColor,
}: OnlineChessBoardProps) {
  const {
    game,
    fen,
    moveHistory,
    onlineGame,
    isLoading,
    error,
    makeMove,
  } = useOnlineGame(
    gameId,
    playerColor
  );

  /* -------------------------------------------------------
     TURN
  ------------------------------------------------------- */

  const turn =
    game.turn() === "w"
      ? "Blancs"
      : "Noirs";

  /* -------------------------------------------------------
     STATUS
  ------------------------------------------------------- */

  let status =
    `Tour des ${turn}`;

  if (
    onlineGame?.status ===
    "waiting"
  ) {
    status =
      "⏳ En attente du deuxième joueur...";
  } else if (
    onlineGame?.status ===
    "finished"
  ) {
    if (
      game.isCheckmate()
    ) {
      status =
        `🏁 Échec et mat ! ${
          game.turn() === "w"
            ? "Noirs"
            : "Blancs"
        } gagnent !`;
    } else if (
      game.isStalemate()
    ) {
      status =
        "🏁 Pat !";
    } else if (
      game.isDraw()
    ) {
      status =
        "🏁 Partie nulle !";
    } else {
      status =
        "🏁 Partie terminée !";
    }
  } else if (
    game.turn() !==
    playerColor
  ) {
    status =
      `⏳ Tour de l'adversaire (${turn})`;
  } else if (
    game.isCheck()
  ) {
    status =
      `⚠️ Échec ! À toi de jouer (${turn})`;
  } else {
    status =
      `♟️ À toi de jouer (${turn})`;
  }

  /* -------------------------------------------------------
     LOADING
  ------------------------------------------------------- */

  if (isLoading) {
    return (
      <p>
        Chargement de la partie...
      </p>
    );
  }

  /* -------------------------------------------------------
     ERROR
  ------------------------------------------------------- */

  if (error) {
    return (
      <p>
        ❌ {error}
      </p>
    );
  }

  /* -------------------------------------------------------
     ONLINE MOVE
  ------------------------------------------------------- */

  function handleOnlineMove(
    from: string,
    to: string
  ): boolean {
    if (!onlineGame) {
      return false;
    }

    if (
      onlineGame.status !==
      "playing"
    ) {
      return false;
    }

    if (
      onlineGame.turn !==
      playerColor
    ) {
      return false;
    }

    void makeMove(
      from,
      to
    );

    return true;
  }

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "600px",
      }}
    >
      <p>
        <strong>
          {status}
        </strong>
      </p>

      <ChessBoard
        fen={fen}
        onMove={
          handleOnlineMove
        }
        orientation={
          playerColor === "w"
            ? "white"
            : "black"
        }
      />

      <MoveHistory
        moves={moveHistory}
        title="📜 Historique de la partie"
      />
    </div>
  );
}

/* =========================================================
   EXPORT
========================================================= */

export default App;