import { useEffect, useRef, useState } from "react";

export type Difficulty = "easy" | "medium" | "hard";

const DEPTH_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 3,
  medium: 8,
  hard: 14,
};

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);

  const [bestMove, setBestMove] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const [difficulty, setDifficulty] =
    useState<Difficulty>("medium");

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/stockfish.worker.ts", import.meta.url),
      {
        type: "module",
      }
    );

    workerRef.current = worker;

    worker.onmessage = (event) => {
      const message = String(event.data);

      if (message.startsWith("bestmove")) {
        const [, move] = message.split(" ");

        setBestMove(move ?? null);
        setIsThinking(false);
      }
    };

    worker.postMessage("uci");

    return () => {
      worker.terminate();
    };
  }, []);

  function getBestMove(fen: string) {
    const worker = workerRef.current;

    if (!worker) {
      return;
    }

    setBestMove(null);
    setIsThinking(true);

    const depth = DEPTH_BY_DIFFICULTY[difficulty];

    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);
  }

  return {
    bestMove,
    isThinking,
    difficulty,
    setDifficulty,
    getBestMove,
  };
}