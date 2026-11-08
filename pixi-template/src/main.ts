import { Game } from "./core/Game";
import { LoadingScene } from "./scenes/LoadingScene";

(async () => {
  await Game.init(document.getElementById("app")!);
  await Game.goTo(LoadingScene);
})();
