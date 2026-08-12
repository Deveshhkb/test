import {
  Application,
  Assets,
  Sprite,
  Container,
  Graphics,
  Text,
} from "pixi.js";
import gsap from "gsap";

(async () => {
  const app = new Application();
  await app.init({
    background: "#fff",
    resizeTo: window,
  });

  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const gameContainer = new Container();
  app.stage.addChild(gameContainer);

  // --- background ---
  const bg = await Assets.load("/assets/bg-image.png");
  const bg_img = new Sprite(bg);
  bg_img.anchor.set(0.5);
  app.stage.addChildAt(bg_img, 0);

  const bettingPanel = await Assets.load("/assets/bord.png");
  const bettPanel = new Sprite(bettingPanel);
  bettPanel.position.set(180, 65);
  bettPanel.scale.set(0.8);
  app.stage.addChildAt(bettPanel, 1);

  // --- Dragon area (blue skewed rect) ---
  const dragonArea = new Graphics()
    .moveTo(0, 0) // top-left
    .lineTo(295.5, 0) // top-right
    .lineTo(288.7, 213) // bottom-right (slightly inward for skew)
    // rounded bottom-left corner instead of sharp line
    .arcTo(0, 213, -28, 213, 20) // from (288.7,213) toward (0,213), then curve to (-28,213) with radius 20
    .lineTo(-28, 213) // ensure it reaches the bottom-left
    .closePath()
    .fill({ color: 0x0000ff, alpha: 0.25 });

  dragonArea.position.set(bettPanel.x + 1, bettPanel.y + 230);

  // --- Tie area (green skewed rect) ---
  const tieArea = new Graphics()
    .moveTo(0, 0)
    .lineTo(300, 0)
    .lineTo(309, 213)
    .lineTo(-10, 213)
    .closePath()
    .fill({ color: 0x00ff00, alpha: 0.25 });

  tieArea.position.set(bettPanel.x + 308, bettPanel.y + 230);

  // --- Tiger area (red skewed rect) ---
  const tigerArea = new Graphics()
    .moveTo(0, 0)
    .lineTo(300, 0)
    .lineTo(330, 213)
    .lineTo(10, 213)
    .closePath()
    .fill({ color: 0xff0000, alpha: 0.25 });

  tigerArea.position.set(bettPanel.x + 616, bettPanel.y + 230);

  // enable interaction
  [dragonArea, tieArea, tigerArea].forEach((area) => {
    area.eventMode = "static";
    area.cursor = "pointer";
    gameContainer.addChild(area);
  });

  // --- store placed coins ---
  const placedCoins: Container[] = [];

  // helper: random point inside rect area bounds
  function getRandomPoint(area: Graphics, margin: number = 20) {
    // local bounds of the area
    const bounds = area.getBounds();

    // pick random X/Y within bounds, leaving margin
    const x = Math.random() * (bounds.width - margin * 2) + bounds.x + margin;
    const y = Math.random() * (bounds.height - margin * 2) + bounds.y + margin;

    return { x, y };
  }

  // function to place coin with animation
  // function placeCoin(targetArea: Graphics) {
  //   if (!activeCoin) return;

  //   // create coin copy
  //   const coinSprite = new Sprite((activeCoin.children[0] as Sprite).texture);
  //   coinSprite.anchor.set(0.5);
  //   coinSprite.scale.set(0.3);
  //   app.stage.addChild(coinSprite);

  //   // starting pos = active coin button
  //   coinSprite.x = activeCoin.x;
  //   coinSprite.y = activeCoin.y;

  //   // random destination inside target area
  //   const { x: tx, y: ty } = getRandomPoint(targetArea);

  //   // animate coin flying
  //   gsap.to(coinSprite, {
  //     x: tx,
  //     y: ty,
  //     duration: 0.3,
  //     ease: "power2.out",
  //     onComplete: () => {
  //       placedCoins.push(coinSprite);
  //     },
  //   });
  // }
  function placeCoin(targetArea: Graphics) {
    if (!activeCoin) return;
    const coinClone = new Container();
    const baseSprite = activeCoin.children[0] as Sprite;
    const spriteCopy = new Sprite(baseSprite.texture);
    spriteCopy.anchor.set(0.5);
    spriteCopy.scale.set(0.4);
    const baseText = activeCoin.children[1] as Text;
    const textCopy = new Text({
      text: baseText.text,
      style: {
        fontFamily: baseText.style.fontFamily,
        fill: baseText.style.fill,
        fontWeight: baseText.style.fontWeight,
        stroke: baseText.style.stroke,
        fontSize: 16,
      },
    });
    textCopy.anchor.set(0.5);
    coinClone.addChild(spriteCopy, textCopy);
    coinClone.scale.set(0.8);
    app.stage.addChild(coinClone);
    coinClone.x = activeCoin.x;
    coinClone.y = activeCoin.y;
    const { x: tx, y: ty } = getRandomPoint(targetArea);
    gsap.to(coinClone, {
      x: tx,
      y: ty,
      duration: 0.6,
      ease: "power2.out",
      onComplete: () => {
        placedCoins.push(coinClone);
      },
    });
  }

  // attach to each bet area
  dragonArea.on("pointerdown", () => {
    placeCoin(dragonArea);
  });
  tieArea.on("pointerdown", () => {
    placeCoin(tieArea);
  });
  tigerArea.on("pointerdown", () => {
    placeCoin(tigerArea);
  });

  const textStyle = {
    fontFamily: "Arial",
    fontSize: 25,
    fill: 0xffffff,
    fontWeight: "bold",
    stroke: { color: 0x000000, width: 5 },
  } as const;

  const scoreLabels = {} as Record<
    "dragon" | "tie" | "tiger",
    { left: Text; right: Text }
  >;

  function createScoreLabel(
    key: "dragon" | "tie" | "tiger",
    x: number,
    y: number,
  ) {
    const leftNum = new Text({ text: "0", style: textStyle });
    leftNum.anchor.set(0.5);
    leftNum.position.set(x - 30, y);

    const slash = new Text({ text: "/", style: textStyle });
    slash.anchor.set(0.5);
    slash.position.set(x, y);

    const rightNum = new Text({ text: "0", style: textStyle });
    rightNum.anchor.set(0.5);
    rightNum.position.set(x + 30, y);

    app.stage.addChild(leftNum, slash, rightNum);

    scoreLabels[key] = { left: leftNum, right: rightNum };
  }

  createScoreLabel("dragon", bettPanel.x + 300, bettPanel.y + 313);
  createScoreLabel("tie", bettPanel.x + 775, bettPanel.y + 313);
  createScoreLabel("tiger", bettPanel.x + 1250, bettPanel.y + 313);

  function updateScore(
    key: "dragon" | "tie" | "tiger",
    left: number,
    right: number,
  ) {
    scoreLabels[key].left.text = String(left);
    scoreLabels[key].right.text = String(right);
  }

  updateScore("dragon", 2, 7);
  updateScore("tie", 5, 5);
  updateScore("tiger", 9, 1);

  const dragonbg = await Assets.load("/assets/dragon.png");
  const drnbg = new Sprite(dragonbg);
  drnbg.position.set(470, 45);
  drnbg.scale.set(0.2);
  app.stage.addChildAt(drnbg, 2);

  const tiger = await Assets.load("/assets/tiger.png");
  const tigerBg = new Sprite(tiger);
  tigerBg.position.set(1250, 95);
  tigerBg.scale.set(0.2);
  app.stage.addChildAt(tigerBg, 3);

  // --- coins ---
  const imagePaths = [
    "/assets/100_b.png",
    "/assets/500_b.png",
    "/assets/10k_b.png",
    "/assets/25k_b.png",
    "/assets/100k_b.png",
  ];
  const coinLabels = ["100", "500", "10k", "25k", "100k"];

  const textures = await Promise.all(
    imagePaths.map((path) => Assets.load(path)),
  );

  const coins: Container[] = [];
  let activeCoin: Container | null = null;

  textures.forEach((tex, i) => {
    const coinContainer = new Container();

    // Coin sprite
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    sprite.scale.set(0.6);

    // Label
    const label = new Text({
      text: coinLabels[i],
      style: {
        fontFamily: "Arial",
        fontSize: 20,
        fill: 0xffffff,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 },
      },
    });
    label.anchor.set(0.5);

    coinContainer.addChild(sprite);
    coinContainer.addChild(label);
    coinContainer.position.set(520 + i * 140, 900);

    // Interaction
    coinContainer.eventMode = "static";
    coinContainer.cursor = "pointer";

    coinContainer.on("pointerdown", () => {
      // reset previous
      if (activeCoin && activeCoin !== coinContainer) {
        gsap.to(activeCoin, {
          y: 900,
          scaleX: 0.6,
          scaleY: 0.6,
          duration: 0.2,
          ease: "power1.out",
        });
      }

      // animate current
      gsap.to(coinContainer, {
        y: 870, // move up
        scaleX: 0.75,
        scaleY: 0.75,
        duration: 0.2,
        ease: "power1.out",
      });

      activeCoin = coinContainer;
      coinAnm.visible = true;
      coinAnm.scale.set(0.13);
      app.stage.setChildIndex(coinAnm, app.stage.children.length - 1);
    });

    coins.push(coinContainer);
    app.stage.addChild(coinContainer);
  });

  activeCoin = coins[0];
  const initialCoin = activeCoin;
  if (initialCoin) {
    gsap.to(initialCoin, {
      y: 870, // move up
      scaleX: 0.75,
      scaleY: 0.75,
      duration: 0.2,
      ease: "power1.out",
      onComplete: () => {
        coinAnm.visible = true;
        coinAnm.scale.set(0.13);
        coinAnm.x = initialCoin.x;
        coinAnm.y = initialCoin.y;
        app.stage.setChildIndex(coinAnm, app.stage.children.length - 1);
      },
    });
  }

  // --- rotating overlay ---
  const coinbg = await Assets.load("/assets/coinOverCircal.png");
  const coinAnm = new Sprite(coinbg);
  coinAnm.anchor.set(0.5);
  coinAnm.visible = false;
  app.stage.addChild(coinAnm);

  app.ticker.add(() => {
    if (coinAnm.visible && activeCoin) {
      coinAnm.rotation += 0.05;
      coinAnm.x = activeCoin.x;
      coinAnm.y = activeCoin.y;
    }
  });

  // --- resize ---
  function resize() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    bg_img.width = screenWidth;
    bg_img.height = screenHeight;
    bg_img.position.set(screenWidth / 2, screenHeight / 2);

    const baseWidth = 1280;
    const baseHeight = 720;

    const scaleX = screenWidth / baseWidth;
    const scaleY = screenHeight / baseHeight;
    const scale = Math.max(scaleX, scaleY);

    gameContainer.scale.set(scale);
    gameContainer.x = screenWidth / 2;
    gameContainer.y = screenHeight / 2;

    if (gameContainer.pivot.x === 0 && gameContainer.pivot.y === 0) {
      gameContainer.pivot.set(baseWidth / 2, baseHeight / 2);
    }
  }

  resize();
  window.addEventListener("resize", resize);
})();
