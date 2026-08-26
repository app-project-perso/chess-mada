/* =========================================================
   PLAYER ID
========================================================= */

export function getPlayerId(): string {
  const storageKey = "echecs-player-id";

  const existingId =
    localStorage.getItem(storageKey);

  if (existingId) {
    return existingId;
  }

  const newId =
    crypto.randomUUID();

  localStorage.setItem(
    storageKey,
    newId
  );

  return newId;
}
