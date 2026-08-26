import { ChessBoard } from "./ChessBoard";
import { MoveHistory } from "./MoveHistory";
import { useOnlineGame } from "../hooks/useOnlineGame";
import type { PlayerColor } from "../hooks/useOnlineSession";

/* =========================================================
   ONLINE CHESS BOARD
========================================================= */

interface OnlineChessBoardProps {
  gameId: string;
  playerColor: PlayerColor;
}

export function OnlineChessBoard({
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
