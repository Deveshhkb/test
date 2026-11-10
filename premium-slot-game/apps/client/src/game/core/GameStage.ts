import { Container } from 'pixi.js';

/** Display-list layers of the game. `root` is in design space; `background` is in viewport space. */
export class GameStage {
  readonly background = new Container();
  readonly root = new Container();
  readonly world = new Container(); // shakeable: character + reels
  readonly characterLayer = new Container();
  readonly reelLayer = new Container();
  readonly bonusLayer = new Container();
  readonly overlayLayer = new Container();

  constructor(stage: Container) {
    stage.addChild(this.background, this.root);
    this.world.addChild(this.characterLayer, this.reelLayer);
    this.root.addChild(this.world, this.bonusLayer, this.overlayLayer);
  }
}
