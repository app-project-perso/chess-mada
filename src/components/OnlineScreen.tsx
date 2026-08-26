import { OnlineChessBoard } from "./OnlineChessBoard";
import { ThemeButton } from "./ThemeButton";
import type { Theme } from "../hooks/useTheme";
import type { PlayerColor } from "../hooks/useOnlineSession";
import type { OnlineGame } from "../services/gameService";

interface OnlineScreenProps {
  theme: Theme;
  onToggleTheme: () => void;
  onlineGameId: string | null;
  onlineGame: OnlineGame | null;
  playerColor: PlayerColor | null;
  onlineMessage: string;
  copied: boolean;
  onCreate: () => void;
  onJoin: () => void;
  onCopy: () => void;
  onLeave: () => void;
  onBackToMenu: () => void;
}

export function OnlineScreen({
  theme,
  onToggleTheme,
  onlineGameId,
  onlineGame,
  playerColor,
  onlineMessage,
  copied,
  onCreate,
  onJoin,
  onCopy,
  onLeave,
  onBackToMenu,
}: OnlineScreenProps) {
  const appClassName =
    theme === "dark"
      ? "app-dark"
      : "app-light";

  return (
    <main className={appClassName}>
      <ThemeButton
        theme={theme}
        onToggle={onToggleTheme}
      />

      <h1>
        ♟️ Échecs
      </h1>

      <h2>
        🌐 Partie en ligne
      </h2>

      {!onlineGameId && (
        <>
          <button onClick={onCreate}>
            🎮 Créer une partie
          </button>

          <button onClick={onJoin}>
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
                onClick={onCopy}
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

          <button onClick={onLeave}>
            ← Quitter la partie
          </button>
        </>
      )}

      <button onClick={onBackToMenu}>
        ← Menu
      </button>
    </main>
  );
}
