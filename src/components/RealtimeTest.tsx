import { useEffect, useState } from "react";
import {
  getGame,
  subscribeToGame,
  updateGame,
  type OnlineGame,
} from "../services/gameService";

interface RealtimeTestProps {
  gameId: string;
}

export function RealtimeTest({
  gameId,
}: RealtimeTestProps) {
  const [game, setGame] =
    useState<OnlineGame | null>(null);

  const [message, setMessage] =
    useState("Connexion à Realtime...");

  useEffect(() => {
    let unsubscribe:
      | (() => void)
      | undefined;

    async function connect() {
      try {
        const currentGame =
          await getGame(gameId);

        setGame(currentGame);

        unsubscribe =
          subscribeToGame(
            gameId,
            (updatedGame) => {
              setGame(updatedGame);

              setMessage(
                "⚡ Mise à jour reçue !"
              );
            }
          );

        setMessage(
          "🟢 Realtime connecté"
        );
      } catch (error) {
        console.error(error);

        setMessage(
          error instanceof Error
            ? error.message
            : "Erreur de connexion"
        );
      }
    }

    connect();

    return () => {
      unsubscribe?.();
    };
  }, [gameId]);

  async function simulateMove() {
    if (!game) {
      return;
    }

    try {
      const updatedGame =
        await updateGame(
          game.id,
          game.fen,
          game.turn === "w" ? "b" : "w",
          game.status
        );

      setGame(updatedGame);

      setMessage(
        "📤 Mise à jour envoyée"
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Erreur de mise à jour"
      );
    }
  }

  return (
    <div>
      <h3>🧪 Test Realtime</h3>

      <p>{message}</p>

      {game && (
        <>
          <p>
            <strong>Partie :</strong>{" "}
            {game.id}
          </p>

          <p>
            <strong>Tour :</strong>{" "}
            {game.turn === "w"
              ? "Blancs"
              : "Noirs"}
          </p>

          <p>
            <strong>Status :</strong>{" "}
            {game.status}
          </p>

          <button
            onClick={simulateMove}
          >
            ⚡ Changer le tour
          </button>
        </>
      )}
    </div>
  );
}