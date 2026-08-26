import { useEffect, useState } from "react";

import { getPlayerId } from "../lib/playerId";

import {
  createGame,
  getGame,
  joinGame,
  type OnlineGame,
} from "../services/gameService";

/* =========================================================
   TYPES
========================================================= */

export type GameMode = "menu" | "ai" | "online";

export type PlayerColor = "w" | "b";

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
   HOOK
========================================================= */

export function useOnlineSession() {
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
     CREATE ONLINE GAME
  ======================================================= */

  async function createOnlineGame() {
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

  async function joinOnlineGame() {
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

  async function copyGameId() {
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
     LEAVE ONLINE GAME
  ======================================================= */

  function leaveOnlineGame() {
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
     RESET (utilisé lors du démarrage d'une nouvelle
     partie IA depuis l'écran IA)
  ======================================================= */

  function resetOnlineState() {
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

  return {
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
  };
}
