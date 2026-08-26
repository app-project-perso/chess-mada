import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { db } from "../lib/db";
import type { Difficulty } from "./useStockfish";

export function useChessGame(
  difficulty: Difficulty,
  onDifficultyLoaded?: (
    difficulty: Difficulty
  ) => void
) {
  const [game, setGame] =
    useState(() => new Chess());

  const [fen, setFen] =
    useState(game.fen());

  const [moveHistory, setMoveHistory] =
    useState<string[]>([]);

  useEffect(() => {
    async function loadSavedGame() {
      const savedGame =
        await db.games.get("current");

      if (!savedGame) {
        return;
      }

      try {
        const loadedGame =
          new Chess();

        /*
         * Si l'ancien enregistrement
         * possède un historique, on
         * reconstruit la partie coup
         * par coup.
         */
        if (
          savedGame.history &&
          savedGame.history.length > 0
        ) {
          for (
            const move of savedGame.history
          ) {
            loadedGame.move(move);
          }
        } else {
          /*
           * Compatibilité avec les anciennes
           * sauvegardes qui ne possèdent
           * que le FEN.
           */
          loadedGame.load(
            savedGame.fen
          );
        }

        setGame(loadedGame);
        setFen(loadedGame.fen());

        setMoveHistory(
          loadedGame.history()
        );

        if (onDifficultyLoaded) {
          onDifficultyLoaded(
            savedGame.difficulty
          );
        }
      } catch (error) {
        console.error(
          "Impossible de charger la partie sauvegardée :",
          error
        );
      }
    }

    loadSavedGame();
  }, [onDifficultyLoaded]);

  async function saveGame(
    currentGame: Chess
  ) {
    await db.games.put({
      id: "current",
      fen: currentGame.fen(),
      difficulty,
      history: currentGame.history(),
      updatedAt: new Date(),
    });
  }

  function makeMove(
    from: string,
    to: string
  ): string | null {
    try {
      game.move({
        from,
        to,
      });

      const newFen =
        game.fen();

      const newHistory =
        game.history();

      setFen(newFen);
      setMoveHistory(
        newHistory
      );
      setGame(game);

      void saveGame(game);

      return newFen;
    } catch {
      return null;
    }
  }

  function makeEngineMove(
    move: string
  ): boolean {
    try {
      game.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move[4] as
          | "q"
          | "r"
          | "b"
          | "n"
          | undefined,
      });

      const newFen =
        game.fen();

      const newHistory =
        game.history();

      setFen(newFen);
      setMoveHistory(
        newHistory
      );
      setGame(game);

      void saveGame(game);

      return true;
    } catch {
      return false;
    }
  }

  async function resetGame() {
    const newGame =
      new Chess();

    setGame(newGame);
    setFen(newGame.fen());
    setMoveHistory([]);

    await saveGame(newGame);
  }

  return {
    game,
    fen,
    moveHistory,
    makeMove,
    makeEngineMove,
    resetGame,
  };
}