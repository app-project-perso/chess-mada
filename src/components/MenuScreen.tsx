import { ThemeButton } from "./ThemeButton";
import type { Theme } from "../hooks/useTheme";

interface MenuScreenProps {
  theme: Theme;
  onToggleTheme: () => void;
  onSelectAi: () => void;
  onSelectOnline: () => void;
}

export function MenuScreen({
  theme,
  onToggleTheme,
  onSelectAi,
  onSelectOnline,
}: MenuScreenProps) {
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
        Choisir un mode
      </h2>

      <button onClick={onSelectAi}>
        🤖 Jouer contre Stockfish
      </button>

      <button onClick={onSelectOnline}>
        🌐 Jouer en ligne
      </button>
    </main>
  );
}
