import { BlackjackGame } from "./BlackjackGame";

/**
 * Entry point. Boots the game into #game-root and removes the loading splash
 * once the first frame is ready.
 */
async function bootstrap(): Promise<void> {
  const host = document.getElementById("game-root");
  if (!host) throw new Error("#game-root is missing from the page");

  const game = await BlackjackGame.create(host);
  document.body.classList.add("game-ready");

  // Vite hot reload would otherwise leave a second canvas and its listeners.
  import.meta.hot?.dispose(() => game.destroy());
}

void bootstrap().catch((error) => {
  console.error("Failed to start Blackjack", error);
  const loader = document.getElementById("loader-message");
  if (loader) loader.textContent = "Unable to start the game.";
});
