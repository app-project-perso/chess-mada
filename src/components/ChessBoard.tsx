import { Chessboard } from "react-chessboard";

interface ChessBoardProps {
  fen: string;
  onMove: (from: string, to: string) => boolean;
  orientation?: "white" | "black";
}

export function ChessBoard({
  fen,
  onMove,
  orientation = "white",
}: ChessBoardProps) {
  return (
    <Chessboard
      options={{
        position: fen,
        boardOrientation: orientation,
        onPieceDrop: ({ sourceSquare, targetSquare }) => {
          if (!targetSquare) {
            return false;
          }

          return onMove(sourceSquare, targetSquare);
        },
      }}
    />
  );
}