import { Application, Assets, Sprite, Container, Graphics, Text, Texture, Circle, Point } from "pixi.js";
import gsap from "gsap";
import { Card } from "./Card";
import { Deck, DragonTigerRound, CardInfo, Winner } from "./GameLogic";
import { Profile } from "./UserProfile";
import {TopHistory} from "./TopHistory";

const deck = new Deck();

interface BetTotals {
  dragon: number;
  tie: number;
  tiger: number;
}

interface ScoreLabels {
  dragon: { left: Text; right: Text; tooltip: Text };
  tie: { left: Text; right: Text; tooltip: Text };
  tiger: { left: Text; right: Text; tooltip: Text };
}

interface GameAssets {
  background: Texture;
  bettingPanel: Texture;
  dragon: Texture;
  tiger: Texture;
  tie: Texture;
  coinOverlay: Texture;
  clockBg: Texture;
  cleanBg: Texture;
  doubleBg: Texture;
  rebetBg: Texture;
  coinTextures: Texture[];
}

class DragonTigerGame {
  private app!: Application;
  private stage!: Container;
  private mainContainer!: Container;
  private gameContainer!: Container;
  private bettingPanel!: Sprite;
  private cleanbtn!: Sprite;
  private doublebtn!: Sprite;
  private rebetbtn!: Sprite;
  private placedCoins: Container[] = [];
  private coins: Container[] = [];
  private activeCoin: Container | null = null;
  private coinAnimation!: Sprite;
  private betTotals: BetTotals = { dragon: 0, tie: 0, tiger: 0 };
  private scoreLabels: ScoreLabels;
  private dragonArea!: Graphics;
  private tieArea!: Graphics;
  private tigerArea!: Graphics; 
  private timerText!: Text;
  private clockContainer!: Container;
  private clockSprite!: Sprite;
  private timerCircle!: Graphics;
  private timerValue: number = 20;
  private timerDuration: number = 20;
  private timerStartTime: number = 0;
  private timerRunning: boolean = false; 
  private dragonCard!: Card;
  private tigerCard!: Card;
  private profileImg! : Profile;
  private historyContainer!: Container;
  private results: ("D" | "T" | "Tie")[] = [];
  private balance: number = 500000;
  private round!: DragonTigerRound;
  private result!: { dragon: CardInfo; tiger: CardInfo; winner: Winner };
  private currentBets: { area: keyof BetTotals; amount: number; coinIndex: number }[] = [];
  private lastBets: { area: keyof BetTotals; amount: number; coinIndex: number }[] = [];
  private readonly MULTIPLIERS: Record<keyof BetTotals, number> = { dragon: 2, tie: 12, tiger: 2 };
  private readonly COIN_LABELS = ["100", "500", "10k", "25k", "100k"];
  private readonly COIN_PATHS = [
    "/assets/100_b.png",
    "/assets/500_b.png", 
    "/assets/10k_b.png",
    "/assets/25k_b.png",
    "/assets/100k_b.png"
  ];
  
  private readonly LANDSCAPE = { width: 1920, height: 1080 };
  private readonly PORTRAIT = { width: 1080, height: 1920 };
  private logicalWidth = 1920;
  private logicalHeight = 1080;
  private bgSprite!: Sprite;
  private dragonSprite!: Sprite;
  private tigerSprite!: Sprite;
  private tieSprite!: Sprite;
  private coinRestY = 900;
  private coinRaisedY = 870;
  private placedCoinSpots = new Map<Container, { area: Graphics; x: number; y: number }>();

  private get isPortrait(): boolean {
    return this.logicalHeight > this.logicalWidth;
  }

  constructor() {
    this.scoreLabels = {
      dragon: { left: null!, right: null!, tooltip: null! },
      tie: { left: null!, right: null!, tooltip: null! },
      tiger: { left: null!, right: null!, tooltip: null! }
    };
  }

  async init(): Promise<void> {
    try {
      await this.initializeApp();
      const assets = await this.loadAssets();
      this.createBackground(assets);
      this.createBettingPanel(assets);
      this.createBettingAreas();
      this.createScoreDisplay();
      this.createGameSprites(assets);
      this.createCoinAnimation(assets);
      this.createCoins(assets);
      this.createCleanBet(assets);
      this.createDoubleBet(assets);
      this.createRebetBet(assets);
      this.createTimer(assets.clockBg); 
      this.startTimer(20);
      this.setupEventListeners();
      this.setupResize();
      this.results = ["T", "D", "T", "T", "Tie", "D", "D", "T","T", "D", "T", "T", "Tie", "D", "D", "T","D", "D", "T","T", "D","D", "D", "T","T", "D","D", "D"];
      this.createTopHistory();
      await this.setupCards();
      await this.createProfile();
    } catch (error) {
      console.error("Failed to initialize game:", error);
      throw error;
    }
  }

  private async initializeApp(): Promise<void> {
    this.app = new Application();
    await this.app.init({
      background: "#fff",
      width: this.logicalWidth,
      height: this.logicalHeight,
      roundPixels: true,
      resolution: window.devicePixelRatio || 1
    });

    const container = document.getElementById("pixi-container");
    if (!container) {
      throw new Error("Could not find #pixi-container element");
    }
    container.appendChild(this.app.canvas);

    // Create container hierarchy like the reference
    this.stage = new Container();
    this.mainContainer = new Container();
    this.gameContainer = new Container();
    
    this.stage.addChild(this.mainContainer);
    this.mainContainer.addChild(this.gameContainer);
    this.app.stage.addChild(this.stage);
  }

  private async loadAssets(): Promise<GameAssets> {  
    try {
      const [background, bettingPanel, dragon, tiger, tie, coinOverlay,clockBg,cleanBg,doubleBg,rebetBg, ...coinTextures] =
        await Promise.all([
          Assets.load("/assets/bg-image.png"),
          Assets.load("/assets/bord.png"),
          Assets.load("/assets/dragon.png"),
          Assets.load("/assets/tiger.png"),
          Assets.load("/assets/tie.png"),
          Assets.load("/assets/coinOverCircal.png"),
          Assets.load("/assets/clock.png"),
          Assets.load("/assets/clean.png"),
          Assets.load("/assets/2X.png"),
          Assets.load("/assets/rebet.png"),
          ...this.COIN_PATHS.map(path => Assets.load(path))
        ]);
      
      return {
        background,
        bettingPanel,
        dragon,
        tiger,
        tie,
        coinOverlay,
        clockBg,
        cleanBg,
        doubleBg,
        rebetBg,
        coinTextures
      };
    } catch (error) {
      console.error(" Failed to load assets:", error);
      throw error;
    }
  }

  private createBackground(assets: GameAssets): void {
    this.bgSprite = new Sprite(assets.background);
    this.bgSprite.anchor.set(0.5);
    this.layoutBackground();
    this.gameContainer.addChildAt(this.bgSprite, 0);
  }

  private layoutBackground(): void {
    this.bgSprite.position.set(this.logicalWidth / 2, this.logicalHeight / 2);
    if (this.isPortrait) {
      // cover-fit: fill the screen without distorting the wide background
      const tex = this.bgSprite.texture;
      const scale = Math.max(this.logicalWidth / tex.width, this.logicalHeight / tex.height);
      this.bgSprite.scale.set(scale);
    } else {
      this.bgSprite.width = this.logicalWidth;
      this.bgSprite.height = this.logicalHeight;
    }
  }

  private createBettingPanel(assets: GameAssets): void {
    this.bettingPanel = new Sprite(assets.bettingPanel);
    this.bettingPanel.position.set(130, 60);
    this.bettingPanel.scale.set(0.8);
    this.gameContainer.addChildAt(this.bettingPanel, 1);
  }

  private multiplierLabels: Record<"dragon" | "tie" | "tiger", Text> = {
    dragon: null!,
    tie: null!,
    tiger: null!,
  };


  private createBettingAreas(): void {
    this.dragonArea = this.createSkewedArea(0x0000ff, [[-20, 0], [538, 0], [520, 400], [-70, 400]]);
    this.dragonArea.position.set(this.bettingPanel.x, this.bettingPanel.y + 356);
    this.tieArea = this.createSkewedArea(0x00ff00, [[0, 0], [560, 0], [575, 400], [-20, 400]]);
    this.tieArea.position.set(this.bettingPanel.x + 560, this.bettingPanel.y + 356);
    this.tigerArea = this.createSkewedArea(0xff0000, [[0, 0], [562, 0], [605, 400], [20, 400]]);
    this.tigerArea.position.set(this.bettingPanel.x + 1138, this.bettingPanel.y + 356);
    [this.dragonArea, this.tieArea, this.tigerArea].forEach(area => {
      area.alpha = 0.001;
      area.eventMode = "none";
      area.cursor = "default";
      this.bettingPanel.addChild(area);
    });
    this.dragonArea.on("pointerdown", () => this.addBet("dragon"));
    this.tieArea.on("pointerdown", () => this.addBet("tie"));
    this.tigerArea.on("pointerdown", () => this.addBet("tiger"));
  }

  private createSkewedArea(color: number, points: number[][]): Graphics {
    const area = new Graphics();
    area.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      area.lineTo(points[i][0], points[i][1]);
    }
    area.closePath();
    area.fill({ color, alpha: 0.25 });
    return area;
  }

  private createScoreDisplay(): void {
    // Labels are children of the betting panel so they follow it in every
    // layout; sizes/positions are compensated for the panel's 0.8 base scale.
    const PANEL_REF_SCALE = 0.8;
    const textStyle = {
      fontFamily: "Arial",
      fontSize: 31,
      fill: 0xffffff,
      fontWeight: "bold" as const,
      stroke: { color: 0x000000, width: 6 },
    };

    const positions = [
      { key: "dragon" as const, x: 300, y: 313 },
      { key: "tie" as const, x: 775, y: 313 },
      { key: "tiger" as const, x: 1250, y: 313 }
    ];

    positions.forEach(({ key, x, y }) => {
      const localX = x / PANEL_REF_SCALE;
      const localY = y / PANEL_REF_SCALE;

      const leftNum = new Text({text :"0", style: textStyle});
      leftNum.anchor.set(1, 0.5);
      leftNum.position.set(localX - 38, localY);
      leftNum.eventMode = "static";
      leftNum.cursor = "pointer";

      const rightNum = new Text({ text :"0", style : textStyle});
      rightNum.anchor.set(0, 0.5);
      rightNum.position.set(localX + 38, localY);
      rightNum.eventMode = "static";
      rightNum.cursor = "pointer";

      const slash = new Text({text : "/", style: textStyle});
      slash.anchor.set(0.5);
      slash.position.set(localX, localY);

      const tooltip = new Text({text:"", style: { ...textStyle, fill: 0xffd700 }});
      tooltip.anchor.set(0.5);
      tooltip.position.set(localX, localY - 31);
      tooltip.visible = false;
      this.bettingPanel.addChild(tooltip);

      const multiplierLable = new Text({text:"0",style: {
        fontFamily: "Arial",
        fontSize: 31,
        fill: 0x000000,
        fontWeight: "bold" as const,
      }});
      multiplierLable.anchor.set(0.5);
      multiplierLable.position.set(localX, ((this.bettingPanel.y + y) * 1.86 - this.bettingPanel.y) / PANEL_REF_SCALE);
      this.bettingPanel.addChild(multiplierLable)

      const showTotal = () => {
        tooltip.text = this.formatNumber(this.betTotals[key]);
        tooltip.visible = true;
      };
      const hideTotal = () => { tooltip.visible = false; };

      leftNum.on("pointerover", showTotal);
      leftNum.on("pointerout", hideTotal);
      rightNum.on("pointerover", showTotal);
      rightNum.on("pointerout", hideTotal);

      this.bettingPanel.addChild(leftNum, slash, rightNum);
      this.scoreLabels[key] = { left: leftNum, right: rightNum, tooltip };
      this.multiplierLabels[key] = multiplierLable;
    });

    // Initialize with example scores
    this.updateScore("dragon", 0, 0);
    this.updateScore("tie", 0, 0);
    this.updateScore("tiger", 0, 0);
    this.updateMultiplier("dragon", this.MULTIPLIERS.dragon);
    this.updateMultiplier("tie", this.MULTIPLIERS.tie);
    this.updateMultiplier("tiger", this.MULTIPLIERS.tiger);
  }

  private createGameSprites(assets: GameAssets): void {
    this.dragonSprite = new Sprite(assets.dragon);
    this.dragonSprite.label = "dragonSprite";
    this.dragonSprite.anchor.set(0.5);
    this.dragonSprite.position.set(570, 150);
    this.dragonSprite.scale.set(0.2);
    this.gameContainer.addChildAt(this.dragonSprite, 2);

    this.tigerSprite = new Sprite(assets.tiger);
    this.tigerSprite.label = "tigerSprite";
    this.tigerSprite.position.set(1320, 180);
    this.tigerSprite.anchor.set(0.5);
    this.tigerSprite.scale.set(0.2);
    this.gameContainer.addChildAt(this.tigerSprite, 3);

    this.tieSprite = new Sprite(assets.tie);
    this.tieSprite.label = "tieSprite";
    this.tieSprite.position.set(this.logicalWidth / 2 - 50, 165);
    this.tieSprite.anchor.set(0.5);
    this.tieSprite.scale.set(0.2);
    this.tieSprite.visible = false;
    this.gameContainer.addChildAt(this.tieSprite, 4);
  }

  public updateMultiplier(key: "dragon" | "tie" | "tiger", value: number): void { 
    if (this.multiplierLabels[key]) {
      this.multiplierLabels[key].text = `${value}X`;
    }
  }

  private enableBettingAreas(): void {
    [this.dragonArea, this.tieArea, this.tigerArea].forEach(area => {
      area.eventMode = "static";
      area.cursor = "pointer";
    });
    this.updateButtonStates();
 }

  private disableBettingAreas(): void {
    [this.dragonArea, this.tieArea, this.tigerArea].forEach(area => {
      area.eventMode = "none";
      area.cursor = "default";
    });
    this.updateButtonStates();
  }




  private createCoins(assets: GameAssets): void {
    // place coins using LOGICAL coordinates so scaling behaves predictably
    const startX = 520;

    assets.coinTextures.forEach((texture, i) => {
      const coinContainer = this.createCoinContainer(texture, this.COIN_LABELS[i], startX + i * 140, this.coinRestY);
      this.coins.push(coinContainer);
      this.gameContainer.addChild(coinContainer);
    });
    this.setActiveCoin(this.coins[0]);
  }

  private createCoinContainer(texture: Texture, label: string, x: number, y: number): Container {
    const container = new Container();

    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.scale.set(0.6);

    const text = new Text({
      text: label,
      style: {
        fontFamily: "Arial",
        fontSize: 20,
        fill: 0xffffff,
        fontWeight: "bold" as const,
        stroke: { color: 0x000000, width: 4 },
      },
    });
    text.anchor.set(0.5);

    container.addChild(sprite, text);
    container.position.set(x, y);
    container.eventMode = "static";
    container.cursor = "pointer";

    container.on("pointerdown", () => this.setActiveCoin(container));

    return container;
  }

  private createCleanBet(assets: GameAssets): void {
    this.cleanbtn = new Sprite(assets.cleanBg);
    this.cleanbtn.anchor.set(0.5);
    this.cleanbtn.position.set(1300, this.logicalHeight - 180);
    this.cleanbtn.scale.set(0.8);
    this.cleanbtn.eventMode = "static";
    this.cleanbtn.cursor = "pointer";
    const radius = Math.max(this.cleanbtn.width,this.cleanbtn.height) * 0.35;
    this.cleanbtn.hitArea = new Circle(0,0,radius);
    this.cleanbtn.on("pointertap", () => this.resetBets());
    this.addPressEffect(this.cleanbtn, 0.8);
    this.gameContainer.addChild(this.cleanbtn);
  }

  private createRebetBet(assets: GameAssets): void {
    this.rebetbtn = new Sprite(assets.rebetBg);
    this.rebetbtn.anchor.set(0.5);
    this.rebetbtn.position.set(1400, this.logicalHeight - 180);
    this.rebetbtn.scale.set(0.55);
    this.rebetbtn.eventMode = "static";
    this.rebetbtn.cursor = "pointer";
    const radius = Math.max(this.rebetbtn.width,this.rebetbtn.height) * 0.35;
    this.rebetbtn.hitArea = new Circle(0,0,radius);
    this.rebetbtn.on("pointertap", () => this.rebet());
    this.addPressEffect(this.rebetbtn, 0.55);
    this.gameContainer.addChild(this.rebetbtn);
  }

  private createDoubleBet(assets: GameAssets): void {
    this.doublebtn = new Sprite(assets.doubleBg);
    this.doublebtn.anchor.set(0.5);
    this.doublebtn.position.set(1500, this.logicalHeight - 180);
    this.doublebtn.scale.set(0.8);
    this.doublebtn.eventMode = "static";
    this.doublebtn.cursor = "pointer";
    const radius = Math.max(this.doublebtn.width,this.doublebtn.height) * 0.35;
    this.doublebtn.hitArea = new Circle(0,0,radius);
    this.doublebtn.on("pointertap", () => this.doubleBets());
    this.addPressEffect(this.doublebtn, 0.8);
    this.gameContainer.addChild(this.doublebtn);
  }

  private addPressEffect(btn: Container, baseScale: number): void {
    btn.on("pointerdown", () => {
      gsap.to(btn.scale, { x: baseScale * 0.85, y: baseScale * 0.85, duration: 0.08 });
    });
    const restore = () => {
      gsap.to(btn.scale, { x: baseScale, y: baseScale, duration: 0.15, ease: "back.out(2)" });
    };
    btn.on("pointerup", restore);
    btn.on("pointerupoutside", restore);
  }

  private setButtonEnabled(btn: Sprite, enabled: boolean): void {
    btn.eventMode = enabled ? "static" : "none";
    btn.cursor = enabled ? "pointer" : "default";
    btn.alpha = enabled ? 1 : 0.45;
  }

  private updateButtonStates(): void {
    if (!this.cleanbtn || !this.rebetbtn || !this.doublebtn) return;
    const bettingOpen = this.timerRunning;
    const hasBets = this.currentBets.length > 0;
    this.setButtonEnabled(this.cleanbtn, bettingOpen && hasBets);
    this.setButtonEnabled(this.doublebtn, bettingOpen && hasBets);
    this.setButtonEnabled(this.rebetbtn, bettingOpen && !hasBets && this.lastBets.length > 0);
  }

  private setActiveCoin(coin: Container): void {
    if (this.activeCoin && this.activeCoin !== coin) {
      // animate back to resting Y using logical coords
      gsap.to(this.activeCoin.position, {
        y: this.coinRestY,
        duration: 0.2,
        ease: "power1.out",
      });
    }

    gsap.to(coin.position, {
      y: this.coinRaisedY,
      duration: 0.2,
      ease: "power1.out",
    });

    this.activeCoin = coin;
    this.showCoinAnimation();
  }

  private async createProfile(): Promise<void> {
    const profilePath = await Assets.load("/assets/user.png");
    const margin = 80;


    this.profileImg = new Profile(profilePath, "Devesh", this.balance);
    this.profileImg.x = margin;
    this.profileImg.y = margin;
    this.gameContainer.addChild(this.profileImg)
  }

  private createCoinAnimation(assets: GameAssets): void {
    this.coinAnimation = new Sprite(assets.coinOverlay);
    this.coinAnimation.anchor.set(0.5);
    this.coinAnimation.visible = false;
    this.gameContainer.addChild(this.coinAnimation);

    // Animation loop
    this.app.ticker.add(() => {
      if (this.coinAnimation.visible && this.activeCoin) {
        this.coinAnimation.rotation += 0.1;
        // align coinAnimation to the active coin in gameContainer local space
        const globalPos = this.activeCoin.toGlobal(new Point(0, 0));
        const localPos = this.gameContainer.toLocal(globalPos);
        this.coinAnimation.x = localPos.x;
        this.coinAnimation.y = localPos.y;
      }
    });
  }

  private formatNumber(num: number): string {
    if (num >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(2).replace(/\.0$/, "") + " b";
    } else if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(2).replace(/\.0$/, "") + " m";
    } else if (num >= 1_000) {
      return (num / 1_000).toFixed(2).replace(/\.0$/, "") + " k";
    }
    return String(num);
  }

  private showCoinAnimation(): void {
    if (!this.activeCoin || !this.coinAnimation) return;
    this.coinAnimation.visible = true;
    this.coinAnimation.scale.set(0.13);
    // position immediately
    const globalPos = this.activeCoin.toGlobal(new Point(0, 0));
    const localPos = this.gameContainer.toLocal(globalPos);
    this.coinAnimation.x = localPos.x;
    this.coinAnimation.y = localPos.y;
    this.gameContainer.setChildIndex(this.coinAnimation, this.gameContainer.children.length - 1);
  }

  private addBet(area: keyof BetTotals): void {
    if (!this.activeCoin) {
      console.warn("⚠️ No active coin selected");
      return;
    }

    try {
      const amount = this.getCoinAmount();
      const coinIndex = this.coins.indexOf(this.activeCoin);
      this.placeBet(area, amount, coinIndex);
    } catch (error) {
      console.error("Error placing bet:", error);
    }
  }

  private placeBet(area: keyof BetTotals, amount: number, coinIndex: number): boolean {
    if (amount <= 0 || amount > this.balance) return false;

    this.balance -= amount;
    this.profileImg?.updateBalance(this.balance);
    this.betTotals[area] += amount;
    this.scoreLabels[area].left.text = this.formatNumber(this.betTotals[area]);
    this.currentBets.push({ area, amount, coinIndex });
    this.placeCoinFrom(this.coins[coinIndex], this.getBettingArea(area));
    this.updateButtonStates();
    return true;
  }

  private getCoinAmount(): number {
    if (!this.activeCoin) return 0;
    const baseText = this.activeCoin.children[1] as Text;
    const text = baseText.text.toLowerCase().trim();
    let multiplier = 1;
    if (text.endsWith("k")) {
      multiplier = 1_000;
    } else if (text.endsWith("m")) {
      multiplier = 1_000_000;
    } else if (text.endsWith("b")) {
      multiplier = 1_000_000_000;
    }
    const numericPart = parseFloat(text.replace(/[kmb]/, ""));
    return Math.round(numericPart * multiplier);
  }

  private getBettingArea(area: keyof BetTotals): Graphics {
    switch (area) {
      case "dragon": return this.dragonArea;
      case "tie": return this.tieArea;
      case "tiger": return this.tigerArea;
      default: throw new Error(`Invalid betting area: ${area}`);
    }
  }

  private placeCoinFrom(sourceCoin: Container, targetArea: Graphics): void {
    if (!sourceCoin) return;

    const coinClone = this.cloneCoin(sourceCoin);
    this.gameContainer.addChild(coinClone);
    this.placedCoins.push(coinClone);

    const targetPoint = this.getRandomPointInArea(targetArea);
    // remember the area-local spot so the coin can be re-projected on layout changes
    this.placedCoinSpots.set(coinClone, { area: targetArea, x: targetPoint.localX, y: targetPoint.localY });
    // animate coinClone.position which is in gameContainer local coords
    gsap.to(coinClone.position, {
      x: targetPoint.x,
      y: targetPoint.y,
      duration: 0.6,
      ease: "power2.out",
    });
  }

  private cloneCoin(original: Container): Container {
    const clone = new Container();
    
    const originalSprite = original.children[0] as Sprite;
    const spriteClone = new Sprite(originalSprite.texture);
    spriteClone.anchor.set(0.5);
    spriteClone.scale.set(0.4);

    const originalText = original.children[1] as Text;
    const textClone = new Text({
      text: originalText.text,
      style: {
        fontFamily: originalText.style.fontFamily,
        fill: originalText.style.fill,
        fontWeight: originalText.style.fontWeight,
        stroke: originalText.style.stroke,
        fontSize: 16
      }
    });
    textClone.anchor.set(0.5);

    clone.addChild(spriteClone, textClone);
    clone.scale.set(0.8);

    // start clone at the active coin's global position converted to gameContainer local coords
    const global = original.toGlobal(new Point(0, 0));
    const local = this.gameContainer.toLocal(global);
    clone.x = local.x;
    clone.y = local.y;

    return clone;
  }

  private getRandomPointInArea(area: Graphics, margin: number = 20): { x: number; y: number; localX: number; localY: number } {
    // use local bounds of the area
    const bounds = area.getLocalBounds();
    const minX = bounds.x + margin;
    const minY = bounds.y + margin;
    const maxX = bounds.x + bounds.width - margin;
    const maxY = bounds.y + bounds.height - margin;

    // clamp in case area is smaller than margin
    const safeMinX = Math.min(minX, maxX);
    const safeMinY = Math.min(minY, maxY);
    const safeMaxX = Math.max(minX, maxX);
    const safeMaxY = Math.max(minY, maxY);

    const localX = Math.random() * (safeMaxX - safeMinX) + safeMinX;
    const localY = Math.random() * (safeMaxY - safeMinY) + safeMinY;

    // convert the local point of the area to global then to gameContainer local coordinates
    const globalPoint = area.toGlobal(new Point(localX, localY));
    const pointInGame = this.gameContainer.toLocal(globalPoint);

    return { x: pointInGame.x, y: pointInGame.y, localX, localY };
  }

  private updateScore(area: keyof BetTotals, left: number, right: number): void {
    this.scoreLabels[area].left.text = String(left);
    this.scoreLabels[area].right.text = String(right);
  }

  private setupEventListeners(): void {
    // Any additional event listeners can be added here
  }

  // Repositions everything for the current logical size (landscape or portrait)
  private applyLayout(): void {
    const p = this.isPortrait;

    this.layoutBackground();

    // betting panel — its children (areas, labels, history) follow automatically
    if (p) {
      const bounds = this.bettingPanel.getLocalBounds();
      const scale = (this.logicalWidth - 40) / bounds.width;
      this.bettingPanel.scale.set(scale);
      this.bettingPanel.position.set(20 - bounds.x * scale, 560 - bounds.y * scale);
    } else {
      this.bettingPanel.scale.set(0.8);
      this.bettingPanel.position.set(130, 60);
    }

    // top cluster: clock and cards stay on top; in portrait the mascots
    // move into the free band between the cards and the betting panel
    this.dragonSprite.position.set(p ? 150 : 570, p ? 400 : 150);
    this.tigerSprite.position.set(p ? 930 : 1320, p ? 400 : 180);
    this.tieSprite.position.set(this.logicalWidth / 2 - 50, p ? 400 : 165);
    this.clockContainer.position.set(this.logicalWidth / 2 - 50, 165);
    if (this.dragonCard) this.dragonCard.placeAt(this.logicalWidth / 2 - 200, 180);
    if (this.tigerCard) this.tigerCard.placeAt(this.logicalWidth / 2 + 100, 180);

    // coin tray
    this.coinRestY = p ? this.logicalHeight - 350 : this.logicalHeight - 180;
    this.coinRaisedY = this.coinRestY - 30;
    const spacing = 140;
    const startX = p ? (this.logicalWidth - spacing * (this.coins.length - 1)) / 2 : 520;
    this.coins.forEach((coin, i) => {
      gsap.killTweensOf(coin.position);
      coin.position.set(startX + i * spacing, coin === this.activeCoin ? this.coinRaisedY : this.coinRestY);
    });

    // action buttons
    if (p) {
      const cx = this.logicalWidth / 2;
      const by = this.logicalHeight - 200;
      this.cleanbtn.position.set(cx - 130, by);
      this.rebetbtn.position.set(cx, by);
      this.doublebtn.position.set(cx + 130, by);
    } else {
      this.cleanbtn.position.set(1300, this.logicalHeight - 180);
      this.rebetbtn.position.set(1400, this.logicalHeight - 180);
      this.doublebtn.position.set(1500, this.logicalHeight - 180);
    }

    // re-project coins already placed on the betting areas
    this.placedCoins.forEach(coin => {
      const spot = this.placedCoinSpots.get(coin);
      if (!spot) return;
      gsap.killTweensOf(coin.position);
      const global = spot.area.toGlobal(new Point(spot.x, spot.y));
      const local = this.gameContainer.toLocal(global);
      coin.position.set(local.x, local.y);
    });
  }

  // Improved resize handler based on the reference example
  private setupResize(): void {
    const resizeHandler = () => {
      try {
        // pick the logical orientation that matches the window
        const wantPortrait = window.innerHeight > window.innerWidth;
        const dims = wantPortrait ? this.PORTRAIT : this.LANDSCAPE;
        if (dims.width !== this.logicalWidth) {
          this.logicalWidth = dims.width;
          this.logicalHeight = dims.height;
          this.applyLayout();
        }

        const scaleFactor = Math.min(
          window.innerWidth / this.logicalWidth,
          window.innerHeight / this.logicalHeight
        );
        
        const newWidth = Math.ceil(this.logicalWidth * scaleFactor);
        const newHeight = Math.ceil(this.logicalHeight * scaleFactor);
        
        // Update canvas style dimensions
        this.app.canvas.style.width = `${newWidth}px`;
        this.app.canvas.style.height = `${newHeight}px`;
        
        // Resize the renderer (pixel size)
        this.app.renderer.resize(newWidth, newHeight);
        
        // Scale the main container using logical-to-viewport factor
        this.mainContainer.scale.set(scaleFactor);
        
        // Center the canvas in the viewport
        const container = document.getElementById("pixi-container");
        if (container) {
          container.style.display = "flex";
          container.style.justifyContent = "center";
          container.style.alignItems = "center";
          container.style.width = "100vw";
          container.style.height = "100vh";
        }

        // When resize happens, ensure coinAnimation & activeCoin alignment is recalculated
        if (this.coinAnimation && this.activeCoin) {
          const globalPos = this.activeCoin.toGlobal(new Point(0, 0));
          const localPos = this.gameContainer.toLocal(globalPos);
          this.coinAnimation.x = localPos.x;
          this.coinAnimation.y = localPos.y;
        }

      } catch (error) {
        console.error("Error during resize:", error);
      }
    };

    // Initial resize
    resizeHandler();
    
    // Listen for resize events
    window.addEventListener("resize", resizeHandler);
  }

  // Clears bets from the table without touching the balance (used between rounds)
  private clearBets(): void {
    this.betTotals = { dragon: 0, tie: 0, tiger: 0 };
    Object.keys(this.scoreLabels).forEach(key => {
      this.scoreLabels[key as keyof BetTotals].left.text = "0";
    });
    this.placedCoins.forEach(coin => {
      gsap.killTweensOf(coin.position);
      this.gameContainer.removeChild(coin);
    });
    this.placedCoins = [];
    this.placedCoinSpots.clear();
    this.currentBets = [];
    this.updateButtonStates();
  }

  // Clean button: cancel current bets and refund the money
  public resetBets(): void {
    if (!this.timerRunning) return;
    const total = this.betTotals.dragon + this.betTotals.tie + this.betTotals.tiger;
    if (total > 0) {
      this.balance += total;
      this.profileImg?.updateBalance(this.balance);
    }
    this.clearBets();
  }

  // Double button: repeat every current bet once more
  public doubleBets(): void {
    if (!this.timerRunning) return;
    const bets = [...this.currentBets];
    bets.forEach(bet => this.placeBet(bet.area, bet.amount, bet.coinIndex));
  }

  // Rebet button: replay the previous round's bets
  public rebet(): void {
    if (!this.timerRunning || this.currentBets.length > 0) return;
    this.lastBets.forEach(bet => this.placeBet(bet.area, bet.amount, bet.coinIndex));
  }

  private createTimer(clockTexture: Texture): void {
    this.clockContainer = new Container();
    this.clockContainer.position.set(this.logicalWidth / 2 - 50, 165);
    this.gameContainer.addChild(this.clockContainer);
    this.timerCircle = new Graphics();
    this.timerCircle.position.set(0,8);
    this.timerCircle.scale.set(0.8);
    this.clockContainer.addChild(this.timerCircle);
    this.clockSprite = new Sprite(clockTexture);
    this.clockSprite.anchor.set(0.5);
    this.clockSprite.scale.set(0.7);
    this.clockContainer.addChild(this.clockSprite);
    const style = {fontFamily: "Arial",
        fontSize: 40,
        fill: 0xffffff,
        fontWeight: "bold" as const,
        stroke: { color: 0x000000, width: 5 },
    };
    this.timerText = new Text({text :this.timerValue.toString(),style: style});
    this.timerText.anchor.set(0.5);
    this.timerText.position.set(0, 8);
    this.clockContainer.addChild(this.timerText);
    this.app.ticker.add(() => this.updateTimer());
  }

  public startTimer(duration: number = 20): void {
    if (this.currentBets.length > 0) {
      this.lastBets = [...this.currentBets];
    }
    this.clearBets();
    if (this.dragonCard) {
      this.gameContainer.removeChild(this.dragonCard);
      this.dragonCard = undefined!;
    }
    if (this.tigerCard) {
      this.gameContainer.removeChild(this.tigerCard);
      this.tigerCard = undefined!;
    }

    this.round = new DragonTigerRound(deck);
    this.result = this.round.playRound();
    this.animateStartGame();
    setTimeout(() => {
      this.timerDuration = duration;
      this.timerValue = duration;
      this.timerStartTime = performance.now();
      this.timerRunning = true;
      this.enableBettingAreas();
    },4000);
  }

  private updateTimer(): void {
    if (!this.timerRunning) return;

    const elapsed = (performance.now() - this.timerStartTime) / 1000;
    const remaining = Math.max(this.timerDuration - elapsed, 0);
    this.timerValue = Math.ceil(remaining);
    this.timerText.text = this.timerValue.toString();

    const fraction = remaining / this.timerDuration;
    let color = 0x00ff00;

    if (remaining <= 10 && remaining > 5) {
      const t = (10 - remaining) / 5;
      const r = Math.round(0x00 + (0xff - 0x00) * t);
      const g = Math.round(0xff - (0xff - 0x00) * t);
      color = (r << 16) | (g << 8);
    } else if (remaining <= 5) {
      color = 0xff0000;
    }

    this.timerCircle.clear();
    this.timerCircle.moveTo(0, 0);
    this.timerCircle.arc(
      0,
      0,
      this.clockSprite.width * 0.45,
      -Math.PI / 2,
      -Math.PI / 2 - Math.PI * 2 * fraction,
      true
    );
    this.timerCircle.lineTo(0, 0);
    this.timerCircle.fill(color);

    if (remaining <= 0) {
      this.timerRunning = false;
      this.endRound();
    }
  }

  private async setupCards(): Promise<void> {
    const dragonCardName = this.result.dragon.filename;
    const tigerCardName = this.result.tiger.filename;

    const backTexture = await Assets.load("/assets/card_back.png");
    const dragonTexture = await Assets.load(`/assets/cards/${dragonCardName}`);
    const tigerTexture = await Assets.load(`/assets/cards/${tigerCardName}`);

    this.dragonCard = new Card(backTexture, dragonTexture);
    this.dragonCard.placeAt(this.logicalWidth / 2 - 200, 180);
    this.gameContainer.addChild(this.dragonCard);

    this.tigerCard = new Card(backTexture, tigerTexture);
    this.tigerCard.placeAt(this.logicalWidth / 2 + 100, 180);
    this.gameContainer.addChild(this.tigerCard);
  }

  private endRound(): void {
    this.disableBettingAreas();
    Promise.all([
      this.dragonCard?.flip(0),
      this.tigerCard?.flip(0.5)
    ]).then(() => {
      setTimeout(() => {
        setTimeout(() => {
          this.startTimer(20);
          this.setupCards();
        }, 10000);
        const winner = this.result.winner;
        const winAmount = this.betTotals[winner] * this.MULTIPLIERS[winner];
        if (winAmount > 0) {
          this.balance += winAmount;
          this.profileImg?.updateBalance(this.balance);
        }
        this.addResult(winner);
        this.animateWinnerSprite(winner);
      }, 3000);
    });
  }

  private addResult(winner: string): void {
    let symbol: "D" | "T" | "Tie";

    if (winner === "dragon") {
      symbol = "D";
    } else if (winner === "tiger") {
      symbol = "T";
    } else {
      symbol = "Tie";
    }
    this.results.unshift(symbol);
    if (this.results.length > 27) {
      this.results.pop();
    }
    this.createTopHistory();
  }


  private animateWinnerSprite(winner: "dragon" | "tiger" | "tie"): void {
    const winnerSprite =
      winner === "dragon" ? this.dragonSprite :
      winner === "tiger" ? this.tigerSprite :
      this.tieSprite;

    if (!winnerSprite) {
      console.warn(`animateWinnerSprite: ${winner} sprite not found`);
      return;
    }

    winnerSprite.visible = true;
    winnerSprite.anchor.set(0.5);

    const parent = winnerSprite.parent ?? this.gameContainer;
    const originalGlobal = winnerSprite.getGlobalPosition();
    const originalScale = { x: winnerSprite.scale.x, y: winnerSprite.scale.y };

    parent.setChildIndex(winnerSprite, parent.children.length - 1);

    // ✅ Use tieArea instead of tieBetArea
    if (!this.tieArea) {
      console.warn("animateWinnerSprite: tieArea not defined");
      return;
    }

    // Find the center of tieArea
    const bounds = this.tieArea.getLocalBounds();
    const localCenter = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };

    const globalCenter = this.tieArea.toGlobal(localCenter);
    const centerLocal = parent.toLocal(globalCenter);

    // GSAP timeline animation
    const tl = gsap.timeline();
    tl.to(winnerSprite, {
      x: centerLocal.x,
      y: centerLocal.y,
      duration: 1,
      ease: "power2.out"
    }, 0);
    tl.to(winnerSprite.scale, {
      x: 0.5,
      y: 0.5,
      duration: 1,
      ease: "power2.out"
    }, 0);

    // Pause, then return to original position
    tl.to({}, {
      duration: 2,
      onComplete: () => {
        const originalLocal = parent.toLocal(originalGlobal);
        gsap.to(winnerSprite, {
          x: originalLocal.x,
          y: originalLocal.y,
          duration: 1,
          ease: "power2.inOut",
          onComplete: () => {
            if (winner === "tie") {
              winnerSprite.visible = false;
            }
          }
        });
        gsap.to(winnerSprite.scale, {
          x: originalScale.x,
          y: originalScale.y,
          duration: 1,
          ease: "power2.inOut"
        });
      }
    });
  }
  
 private createTopHistory(): void {
  if (this.historyContainer) {
    this.historyContainer.removeChildren();
  } else {
    this.historyContainer = new Container();
    this.historyContainer.x = 150;
    this.historyContainer.y = 300;
    this.bettingPanel.addChild(this.historyContainer);
  }

  this.results.forEach((result, i) => {
    const item = new TopHistory(result);
    item.x = i * 61;
    this.historyContainer.addChild(item);
  });
}


  private async animateStartGame(): Promise<void> {
    const dragonSprite = this.dragonSprite;
    const tigerSprite = this.tigerSprite;
    if (!dragonSprite || !tigerSprite) return;

    const midY = this.isPortrait ? 500 : this.logicalHeight / 2;
    const texture = await Assets.load("/assets/vs.png");
    const middleSprite = new Sprite(texture);
    middleSprite.label = "middleSprite";
    middleSprite.anchor.set(0.5);
    middleSprite.x = this.logicalWidth / 2 - 50;
    middleSprite.y = midY;
    middleSprite.scale.set(0.25);
    middleSprite.alpha = 0;
    middleSprite.visible = false;
    this.gameContainer.addChild(middleSprite);

    dragonSprite.anchor.set(0.5);
    tigerSprite.anchor.set(0.5);

    const dragonOriginalY = dragonSprite.y;
    const tigerOriginalY = tigerSprite.y;
    const dragonOriginalScale = { x: dragonSprite.scale.x, y: dragonSprite.scale.y };
    const tigerOriginalScale = { x: tigerSprite.scale.x, y: tigerSprite.scale.y };
    const middleOriginalY = midY;

    const tl = gsap.timeline();
    tl.to(dragonSprite, { y: "+=350", duration: 1, ease: "power2.out" });
    tl.to(tigerSprite, { y: "+=350", duration: 1, ease: "power2.out" }, "<");
    tl.to(dragonSprite.scale, { x: "+=0.25", y: "+=0.25", duration: 1, ease: "power2.out" }, "<");
    tl.to(tigerSprite.scale, { x: "+=0.25", y: "+=0.25", duration: 1, ease: "power2.out" }, "<");
    tl.to({}, { duration: 0.2, onComplete: () => { middleSprite.visible = true; } });
    tl.to(middleSprite, { y: middleOriginalY, alpha: 1, duration: 1, ease: "bounce.out" });
    tl.to(middleSprite, { 
      y: middleOriginalY - 180, 
      alpha: 0, 
      duration: 1, 
      ease: "power2.in",
      onComplete: () => {
        this.gameContainer.removeChild(middleSprite);
        middleSprite.destroy();
      }
    }, "+=1");
    tl.to(dragonSprite, { y: dragonOriginalY, duration: 1, ease: "power2.inOut" }, "-=0.5");
    tl.to(tigerSprite, { y: tigerOriginalY, duration: 1, ease: "power2.inOut" }, "<");
    tl.to(dragonSprite.scale, { x: dragonOriginalScale.x, y: dragonOriginalScale.y, duration: 1, ease: "power2.inOut" }, "<");
    tl.to(tigerSprite.scale, { x: tigerOriginalScale.x, y: tigerOriginalScale.y, duration: 1, ease: "power2.inOut" }, "<");
  }

  public getBetTotals(): BetTotals {
    return { ...this.betTotals };
  }
}

(async () => {
  try {
    const game = new DragonTigerGame();
    await game.init();
    (window as unknown as { game: DragonTigerGame }).game = game;
  } catch (error) {
    console.error("Game initialization failed:", error);
  }
})();
