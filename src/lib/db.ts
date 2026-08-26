import Dexie, { type Table } from "dexie";

export interface SavedGame {
  id: string;
  fen: string;
  difficulty: "easy" | "medium" | "hard";
  history: string[];
  updatedAt: Date;
}

class ChessDatabase extends Dexie {
  games!: Table<SavedGame, string>;

  constructor() {
    super("ChessDatabase");

    // Version 1
    this.version(1).stores({
      games: "id",
    });

    // Version 2
    // Ajout de l'historique des coups.
    this.version(2).stores({
      games: "id",
    }).upgrade((transaction) => {
      return transaction
        .table<SavedGame, string>("games")
        .toCollection()
        .modify((game) => {
          if (!game.history) {
            game.history = [];
          }
        });
    });
  }
}

export const db = new ChessDatabase();