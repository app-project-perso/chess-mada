import { supabase } from "../lib/supabase";

/* =========================================================
   TYPES
   ========================================================= */

export interface OnlineGame {
  id: string;
  fen: string;
  white_player: string | null;
  black_player: string | null;
  turn: "w" | "b";
  status: "waiting" | "playing" | "finished";
  created_at: string;
  updated_at: string;
}

export interface GameMove {
  id: string;
  game_id: string;
  move_number: number;
  player_color: "w" | "b";
  from_square: string;
  to_square: string;
  notation: string;
  created_at: string;
}

/* =========================================================
   CONSTANTES
   ========================================================= */

const INITIAL_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/* =========================================================
   GESTION DE LA PARTIE
   ========================================================= */

/**
 * Crée une nouvelle partie.
 *
 * Le joueur qui crée la partie devient automatiquement
 * le joueur Blanc.
 */
export async function createGame(
  playerId: string
): Promise<OnlineGame> {
  const { data, error } = await supabase
    .from("games")
    .insert({
      fen: INITIAL_FEN,
      white_player: playerId,
      black_player: null,
      turn: "w",
      status: "waiting",
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Impossible de créer la partie : ${error.message}`
    );
  }

  return data as OnlineGame;
}

/**
 * Récupère une partie grâce à son identifiant.
 */
export async function getGame(
  gameId: string
): Promise<OnlineGame> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error) {
    throw new Error(
      `Impossible de récupérer la partie : ${error.message}`
    );
  }

  return data as OnlineGame;
}

/**
 * Rejoint une partie en tant que Noir.
 */
export async function joinGame(
  gameId: string,
  playerId: string
): Promise<OnlineGame> {
  const game = await getGame(gameId);

  if (game.white_player === playerId) {
    return game;
  }

  if (game.black_player !== null) {
    throw new Error(
      "Cette partie possède déjà deux joueurs."
    );
  }

  const { data, error } = await supabase
    .from("games")
    .update({
      black_player: playerId,
      status: "playing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId)
    .is("black_player", null)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Impossible de rejoindre la partie : ${error.message}`
    );
  }

  return data as OnlineGame;
}

/**
 * Met à jour la position et le statut d'une partie.
 */
export async function updateGame(
  gameId: string,
  fen: string,
  turn: "w" | "b",
  status: OnlineGame["status"]
): Promise<OnlineGame> {
  const { data, error } = await supabase
    .from("games")
    .update({
      fen,
      turn,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Impossible de mettre à jour la partie : ${error.message}`
    );
  }

  return data as OnlineGame;
}

/* =========================================================
   SYNCHRONISATION DE LA PARTIE
   ========================================================= */

/**
 * Écoute les changements d'une partie en temps réel.
 *
 * Retourne une fonction permettant de se désabonner.
 */
export function subscribeToGame(
  gameId: string,
  onUpdate: (game: OnlineGame) => void
): () => void {
  const channel = supabase
    .channel(`game-${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        onUpdate(payload.new as OnlineGame);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/* =========================================================
   HISTORIQUE DES COUPS
   ========================================================= */

/**
 * Enregistre un coup dans l'historique de la partie.
 */
export async function addGameMove(
  gameId: string,
  moveNumber: number,
  playerColor: "w" | "b",
  fromSquare: string,
  toSquare: string,
  notation: string
): Promise<GameMove> {
  const { data, error } = await supabase
    .from("game_moves")
    .insert({
      game_id: gameId,
      move_number: moveNumber,
      player_color: playerColor,
      from_square: fromSquare,
      to_square: toSquare,
      notation,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Impossible d'enregistrer le coup : ${error.message}`
    );
  }

  return data as GameMove;
}

/**
 * Récupère l'historique complet d'une partie.
 */
export async function getGameMoves(
  gameId: string
): Promise<GameMove[]> {
  const { data, error } = await supabase
    .from("game_moves")
    .select("*")
    .eq("game_id", gameId)
    .order("move_number", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Impossible de récupérer l'historique : ${error.message}`
    );
  }

  return (data ?? []) as GameMove[];
}

/* =========================================================
   SYNCHRONISATION DE L'HISTORIQUE
   ========================================================= */

/**
 * Écoute les nouveaux coups joués dans une partie.
 *
 * Retourne une fonction permettant de se désabonner.
 */
export function subscribeToGameMoves(
  gameId: string,
  onMove: (move: GameMove) => void
): () => void {
  const channel = supabase
    .channel(`game-moves-${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "game_moves",
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => {
        onMove(payload.new as GameMove);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}