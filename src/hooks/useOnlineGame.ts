import { useCallback, useEffect, useState } from "react";
import { Chess } from "chess.js";

import {
  addGameMove,
  getGame,
  getGameMoves,
  subscribeToGame,
  subscribeToGameMoves,
  updateGame,
  type GameMove,
  type OnlineGame,
} from "../services/gameService";

type PlayerColor = "w" | "b";

interface UseOnlineGameResult {
  game: Chess;
  fen: string;
  playerColor: PlayerColor;
  onlineGame: OnlineGame | null;
  moveHistory: GameMove[];
  isLoading: boolean;
  error: string | null;
  makeMove: (
    from: string,
    to: string
  ) => Promise<boolean>;
}

/* =========================================================
   UTILITAIRES
========================================================= */

/**
 * Trie les coups dans l'ordre chronologique.
 */
function sortMoves(
  moves: GameMove[]
): GameMove[] {
  return [...moves].sort(
    (a, b) =>
      a.move_number - b.move_number
  );
}

/**
 * Ajoute un coup à l'historique sans créer
 * de doublon.
 */
function mergeMove(
  currentMoves: GameMove[],
  newMove: GameMove
): GameMove[] {
  const alreadyExists =
    currentMoves.some(
      (move) => move.id === newMove.id
    );

  if (alreadyExists) {
    return currentMoves;
  }

  return sortMoves([
    ...currentMoves,
    newMove,
  ]);
}

/* =========================================================
   HOOK
========================================================= */

export function useOnlineGame(
  gameId: string,
  playerColor: PlayerColor
): UseOnlineGameResult {
  const [game] = useState(
    () => new Chess()
  );

  const [fen, setFen] = useState(
    game.fen()
  );

  const [onlineGame, setOnlineGame] =
    useState<OnlineGame | null>(null);

  const [moveHistory, setMoveHistory] =
    useState<GameMove[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /* =======================================================
     CHARGEMENT INITIAL
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    let unsubscribeGame:
      | (() => void)
      | undefined;

    let unsubscribeMoves:
      | (() => void)
      | undefined;

    async function loadGame() {
      try {
        setIsLoading(true);
        setError(null);

        console.log(
          "🌐 Chargement de la partie :",
          gameId
        );

        /* ---------------------------------------------------
           Récupération de la partie
        --------------------------------------------------- */

        const remoteGame =
          await getGame(gameId);

        if (cancelled) {
          return;
        }

        console.log(
          "🎮 Partie chargée :",
          remoteGame
        );

        setOnlineGame(remoteGame);

        /* ---------------------------------------------------
           Chargement du FEN
        --------------------------------------------------- */

        try {
          game.load(remoteGame.fen);

          setFen(remoteGame.fen);
        } catch (fenError) {
          console.error(
            "❌ FEN invalide :",
            fenError
          );

          throw new Error(
            "La position de la partie est invalide."
          );
        }

        /* ---------------------------------------------------
           Chargement de l'historique
        --------------------------------------------------- */

        const moves =
          await getGameMoves(gameId);

        if (cancelled) {
          return;
        }

        const sortedMoves =
          sortMoves(moves);

        console.log(
          "📜 Historique chargé :",
          sortedMoves
        );

        setMoveHistory(
          sortedMoves
        );

        /* ===================================================
           REALTIME : PARTIE
        =================================================== */

        unsubscribeGame =
          subscribeToGame(
            gameId,
            async (updatedGame) => {
              if (cancelled) {
                return;
              }

              console.log(
                "🔄 Mise à jour de la partie reçue :",
                updatedGame
              );

              try {
                /* ---------------------------------------------
                   Mise à jour du plateau
                --------------------------------------------- */

                game.load(
                  updatedGame.fen
                );

                setFen(
                  updatedGame.fen
                );

                setOnlineGame(
                  updatedGame
                );

                /* ---------------------------------------------
                   IMPORTANT :
                   On recharge également l'historique.
                   
                   Cela permet au joueur adverse de récupérer
                   le coup même si l'événement Realtime de
                   game_moves n'est pas reçu.
                --------------------------------------------- */

                console.log(
                  "📜 Rechargement de l'historique..."
                );

                const latestMoves =
                  await getGameMoves(
                    gameId
                  );

                if (cancelled) {
                  return;
                }

                const sortedLatestMoves =
                  sortMoves(
                    latestMoves
                  );

                console.log(
                  "📜 Historique synchronisé :",
                  sortedLatestMoves
                );

                setMoveHistory(
                  sortedLatestMoves
                );
              } catch (syncError) {
                console.error(
                  "❌ Erreur lors de la synchronisation de la partie :",
                  syncError
                );
              }
            }
          );

        /* ===================================================
           REALTIME : HISTORIQUE
        =================================================== */

        unsubscribeMoves =
          subscribeToGameMoves(
            gameId,
            (newMove) => {
              if (cancelled) {
                return;
              }

              console.log(
                "♟️ Nouveau coup reçu en Realtime :",
                newMove
              );

              setMoveHistory(
                (currentMoves) =>
                  mergeMove(
                    currentMoves,
                    newMove
                  )
              );
            }
          );
      } catch (loadError) {
        console.error(
          "❌ Erreur lors du chargement de la partie :",
          loadError
        );

        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger la partie."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadGame();

    /* =======================================================
       CLEANUP
    ======================================================= */

    return () => {
      cancelled = true;

      console.log(
        "🧹 Nettoyage des abonnements :",
        gameId
      );

      unsubscribeGame?.();
      unsubscribeMoves?.();
    };
  }, [gameId, game]);

  /* =======================================================
     JOUER UN COUP
  ======================================================= */

  const makeMove = useCallback(
    async (
      from: string,
      to: string
    ): Promise<boolean> => {
      /* -----------------------------------------------------
         Vérifications
      ----------------------------------------------------- */

      if (!onlineGame) {
        console.warn(
          "⚠️ Partie non chargée."
        );

        return false;
      }

      if (
        onlineGame.status ===
        "finished"
      ) {
        console.warn(
          "⚠️ La partie est terminée."
        );

        return false;
      }

      if (
        onlineGame.turn !==
        playerColor
      ) {
        console.warn(
          "⚠️ Ce n'est pas ton tour."
        );

        return false;
      }

      if (
        game.turn() !==
        playerColor
      ) {
        console.warn(
          "⚠️ Désynchronisation du tour."
        );

        return false;
      }

      try {
        /* =================================================
           JOUER LE COUP LOCALEMENT
        ================================================= */

        const move = game.move({
          from,
          to,
        });

        if (!move) {
          return false;
        }

        console.log(
          "♟️ Coup joué :",
          move.san
        );

        /* ---------------------------------------------------
           Nouveau FEN
        --------------------------------------------------- */

        const newFen =
          game.fen();

        /* ---------------------------------------------------
           Numéro du demi-coup
           
           1 = e4
           2 = e5
           3 = Nf3
           4 = Nc6
        --------------------------------------------------- */

        const moveNumber =
          game.history().length;

        console.log(
          "🔢 Numéro :",
          moveNumber
        );

        /* ---------------------------------------------------
           Déterminer le statut
        --------------------------------------------------- */

        const isFinished =
          game.isCheckmate() ||
          game.isStalemate() ||
          game.isDraw();

        const status: OnlineGame["status"] =
          isFinished
            ? "finished"
            : "playing";

        /* =================================================
           MISE À JOUR DE LA PARTIE
        ================================================= */

        const updatedGame =
          await updateGame(
            gameId,
            newFen,
            game.turn(),
            status
          );

        console.log(
          "✅ Partie mise à jour."
        );

        /* =================================================
           ENREGISTRER LE COUP
        ================================================= */

        const savedMove =
          await addGameMove(
            gameId,
            moveNumber,
            playerColor,
            from,
            to,
            move.san
          );

        console.log(
          "💾 Coup enregistré :",
          savedMove
        );

        /* =================================================
           MISE À JOUR LOCALE
        ================================================= */

        setFen(
          newFen
        );

        setOnlineGame(
          updatedGame
        );

        setMoveHistory(
          (currentMoves) =>
            mergeMove(
              currentMoves,
              savedMove
            )
        );

        return true;
      } catch (moveError) {
        console.error(
          "❌ Erreur lors de l'enregistrement du coup :",
          moveError
        );

        /* =================================================
           RESYNCHRONISATION
        ================================================= */

        try {
          console.log(
            "🔄 Resynchronisation..."
          );

          /* -------------------------------------------------
             Recharger la partie
          ------------------------------------------------- */

          const remoteGame =
            await getGame(gameId);

          game.load(
            remoteGame.fen
          );

          setFen(
            remoteGame.fen
          );

          setOnlineGame(
            remoteGame
          );

          /* -------------------------------------------------
             Recharger l'historique
          ------------------------------------------------- */

          const moves =
            await getGameMoves(
              gameId
            );

          const sortedMoves =
            sortMoves(moves);

          console.log(
            "📜 Historique après resynchronisation :",
            sortedMoves
          );

          setMoveHistory(
            sortedMoves
          );
        } catch (reloadError) {
          console.error(
            "❌ Impossible de resynchroniser :",
            reloadError
          );
        }

        return false;
      }
    },
    [
      game,
      gameId,
      onlineGame,
      playerColor,
    ]
  );

  /* =======================================================
     RETOUR
  ======================================================= */

  return {
    game,
    fen,
    playerColor,
    onlineGame,
    moveHistory,
    isLoading,
    error,
    makeMove,
  };
}