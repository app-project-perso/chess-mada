import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] =
    useState<Theme>(() => {
      const savedTheme =
        localStorage.getItem(
          "echecs-theme"
        );

      return savedTheme === "dark"
        ? "dark"
        : "light";
    });

  useEffect(() => {
    localStorage.setItem(
      "echecs-theme",
      theme
    );
  }, [theme]);

  function toggleTheme() {
    setTheme(
      (currentTheme) =>
        currentTheme === "light"
          ? "dark"
          : "light"
    );
  }

  return { theme, toggleTheme };
}
