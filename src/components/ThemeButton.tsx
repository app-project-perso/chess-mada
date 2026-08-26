import type { Theme } from "../hooks/useTheme";

interface ThemeButtonProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeButton({
  theme,
  onToggle,
}: ThemeButtonProps) {
  return (
    <button
      className="theme-button"
      onClick={onToggle}
      aria-label="Changer de thème"
    >
      {theme === "light"
        ? "🌙 Mode sombre"
        : "☀️ Mode clair"}
    </button>
  );
}
