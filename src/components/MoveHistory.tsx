/* =========================================================
   MOVE HISTORY
========================================================= */

interface GameMove {
  notation: string;
}

interface MoveHistoryProps {
  moves: string[] | GameMove[];
  title?: string;
}

export function MoveHistory({
  moves,
  title = "📜 Historique des coups",
}: MoveHistoryProps) {
  const displayMoves = moves.map(
    (move) => {
      if (typeof move === "string") {
        return move;
      }

      return move.notation;
    }
  );

  return (
    <div className="move-history">
      <h3>{title}</h3>

      {displayMoves.length === 0 ? (
        <p
          style={{
            marginBottom: 0,
            opacity: 0.7,
          }}
        >
          Aucun coup joué.
        </p>
      ) : (
        <div className="move-history-grid">
          {Array.from(
            {
              length: Math.ceil(
                displayMoves.length / 2
              ),
            },
            (_, index) => {
              const whiteMove =
                displayMoves[
                  index * 2
                ];

              const blackMove =
                displayMoves[
                  index * 2 + 1
                ];

              return (
                <div
                  key={index}
                  style={{
                    display: "contents",
                  }}
                >
                  <strong>
                    {index + 1}.
                  </strong>

                  <span>
                    {whiteMove || "…"}
                  </span>

                  <span>
                    {blackMove || "…"}
                  </span>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
