import { GamePhase, SpinMode, WinTier, type SpinResult } from '@/types';
import { gameApi } from '@/api/gameApi';
import { toApiError } from '@/api/client';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getWinTier } from '@/config/gameConfig';
import { winningCells, roundCredits } from '@/utils/paylineEngine';
import { soundManager } from '@/services/SoundManager';
import { animations } from '@/animations/AnimationManager';
import type { GameScene } from '@/scenes/GameScene';
import { getReelStrips } from '@/config/gameConfig';
import { ROW_COUNT } from '@/constants';

/**
 * Orchestrates the full game flow: spin lifecycle, feature presentation,
 * cascades, big wins, free spins, bonus round and auto spin. It is the
 * only place that talks to both the API layer and the Pixi scene.
 */
class GameController {
  private scene: GameScene | null = null;
  private bonusDone: (() => void) | null = null;
  private running = false;

  async start(scene: GameScene): Promise<void> {
    this.scene = scene;
    this.running = true;
    const store = useGameStore.getState();

    try {
      const login = await gameApi.login();
      store.setBalance(login.balance);
      store.setHistory(await gameApi.history());
    } catch (error) {
      store.setError(toApiError(error).message);
    }

    // Fill the reels with a neutral grid from the strips.
    const strips = getReelStrips();
    scene.reelManager.setGrid(
      strips.map((strip) => strip.slice(0, ROW_COUNT)),
    );

    store.setPhase(GamePhase.Idle);
  }

  stop(): void {
    this.running = false;
    this.scene = null;
  }

  get spinMode(): SpinMode {
    const { turbo, quickSpin } = useSettingsStore.getState();
    if (turbo) return SpinMode.Turbo;
    if (quickSpin) return SpinMode.Quick;
    return SpinMode.Normal;
  }

  /** Player pressed SPIN (or auto/free spin fired). */
  async requestSpin(): Promise<void> {
    const store = useGameStore.getState();
    if (!this.scene || !this.running) return;
    if (store.phase !== GamePhase.Idle && store.phase !== GamePhase.AutoSpin) return;

    const bet = store.totalBet();
    const isFreeSpin = store.freeSpinsRemaining > 0;
    if (!isFreeSpin && bet > store.balance) {
      store.setError('Insufficient balance for this bet.');
      store.stopAutoSpin();
      return;
    }

    store.setError(null);
    store.setWin(0);
    store.setPhase(isFreeSpin ? GamePhase.FreeSpin : GamePhase.Spin);
    if (!isFreeSpin) {
      // Optimistic deduction; the server response is authoritative.
      store.setBalance(roundCredits(store.balance - bet));
    }

    const mode = this.spinMode;
    this.scene.winPresentation.clear();
    this.scene.reelManager.startSpin(mode);

    let result: SpinResult;
    try {
      result = await gameApi.spin(bet);
    } catch (error) {
      // Roll the reels back to a idle state and restore the balance.
      soundManager.stopSpinLoop();
      const apiError = toApiError(error);
      store.setError(apiError.message);
      if (!isFreeSpin) store.setBalance(roundCredits(useGameStore.getState().balance + bet));
      await this.scene.reelManager.stopSpin(
        getReelStrips().map((s) => s.slice(0, ROW_COUNT)),
        SpinMode.Turbo,
      );
      store.stopAutoSpin();
      store.setPhase(GamePhase.Idle);
      return;
    }

    await this.presentSpin(result, mode);
    await this.afterSpin(result);
  }

  /** Animate everything the server said happened. */
  private async presentSpin(result: SpinResult, mode: SpinMode): Promise<void> {
    const store = useGameStore.getState();
    const scene = this.scene!;

    // Scatter anticipation: 2+ scatters visible on the first four reels.
    const teaseScatters = result.reels
      .slice(0, 4)
      .flat()
      .filter((s) => s === 'SCATTER').length;
    const anticipation = mode === SpinMode.Normal && teaseScatters >= 2;

    store.setPhase(GamePhase.Stopping);
    await scene.reelManager.stopSpin(result.reels, mode, anticipation);

    store.setPhase(GamePhase.Evaluating);

    // Feature presentation, in the order the server applied them.
    await scene.revealMystery(result.features, result.finalReels);
    await scene.dropRandomWilds(result.features.randomWilds, result.finalReels);
    await scene.expandWilds(result.features.expandedWildReels, result.finalReels);
    if (result.isFreeSpin) scene.markStickyWilds(result.features.stickyWilds);

    const fast = mode !== SpinMode.Normal;

    // Base wins.
    if (result.paylines.length > 0) {
      store.setPhase(GamePhase.Win);
      const baseWin = result.paylines.reduce((s, w) => s + w.win, 0);
      store.setWin(roundCredits(baseWin));
      await scene.winPresentation.show(
        result.paylines,
        baseWin,
        scene.reelManager,
        scene.particles,
        fast,
      );
    }

    // Cascades.
    let shownWin = result.paylines.reduce((s, w) => s + w.win, 0);
    let previousWins = result.paylines.filter((w) => w.lineIndex >= 0);
    for (const step of result.cascades) {
      await scene.reelManager.playCascade(winningCells(previousWins), step.reels);
      if (step.paylines.length > 0) {
        shownWin = roundCredits(shownWin + step.stepWin);
        store.setWin(shownWin);
        await scene.winPresentation.show(
          step.paylines,
          step.stepWin,
          scene.reelManager,
          scene.particles,
          fast,
        );
      }
      previousWins = step.paylines;
    }

    // Server balance is authoritative once presentation ends.
    store.setWin(result.totalWin);
    store.setBalance(result.balance);
    if (result.isFreeSpin) store.addFreeSpinsWin(result.totalWin);

    // Big win celebration.
    const tier = getWinTier(result.totalWin, result.bet);
    if (tier !== WinTier.None && tier !== WinTier.Regular) {
      await scene.bigWin.show(tier, result.totalWin, scene.particles);
    }

    // Scatter → free spins trigger.
    if (result.freeSpins > 0) {
      await scene.celebrateScatters(result.finalReels);
    }
  }

  /** Post-presentation bookkeeping: bonus, free spins, auto spin. */
  private async afterSpin(result: SpinResult): Promise<void> {
    const store = useGameStore.getState();
    const scene = this.scene!;
    if (!this.running) return;

    store.setLastResult(result);
    gameApi.history().then(store.setHistory).catch(() => undefined);

    // Bonus game (pick a prize) — resolved by the React modal.
    if (result.bonusTriggered) {
      soundManager.play('bonus');
      store.setPhase(GamePhase.Bonus);
      await new Promise<void>((resolve) => {
        this.bonusDone = resolve;
      });
      this.bonusDone = null;
    }

    // Entering free spins?
    const wasInFreeSpins = store.inFreeSpins;
    if (result.freeSpinsRemaining > 0 && !wasInFreeSpins) {
      store.resetFreeSpinsWin();
      if (result.isFreeSpin) store.addFreeSpinsWin(result.totalWin);
      store.setFreeSpins(result.freeSpinsRemaining, true);
      await scene.enterFreeSpins(result.freeSpins);
    } else {
      store.setFreeSpins(result.freeSpinsRemaining, result.freeSpinsRemaining > 0);
    }

    if (store.freeSpinsRemaining > 0) {
      // Free spins run automatically.
      scene.updateFreeSpins(
        useGameStore.getState().freeSpinsRemaining,
        useGameStore.getState().freeSpinsTotalWin,
      );
      store.setPhase(GamePhase.Idle);
      await animations.delay(0.9);
      if (this.running) await this.requestSpin();
      return;
    }

    // Free spins just finished.
    if (wasInFreeSpins && result.freeSpinsRemaining === 0) {
      const total = useGameStore.getState().freeSpinsTotalWin;
      store.setFreeSpins(0, false);
      await scene.exitFreeSpins(total);
      store.resetFreeSpinsWin();
    }

    // Game over?
    const state = useGameStore.getState();
    if (state.balance <= 0) {
      store.stopAutoSpin();
      store.setPhase(GamePhase.GameOver);
      return;
    }

    // Auto spin continuation — each fired spin consumes one credit.
    if (state.autoSpinsRemaining > 0) {
      store.decrementAutoSpin();
      store.setPhase(GamePhase.AutoSpin);
      await animations.delay(this.spinMode === SpinMode.Normal ? 0.7 : 0.25);
      if (this.running) {
        await this.requestSpin();
        return;
      }
    }

    store.setPhase(GamePhase.Idle);
  }

  /** Called by the bonus modal once the player has collected their prize. */
  finishBonus(): void {
    this.bonusDone?.();
  }

  startAutoSpin(count: number): void {
    const store = useGameStore.getState();
    store.startAutoSpin(count);
    if (store.phase === GamePhase.Idle) {
      store.decrementAutoSpin();
      void this.requestSpin();
    }
  }

  /** Reset a busted demo session (mock only — reloads the page state). */
  restart(): void {
    window.location.reload();
  }
}

export const gameController = new GameController();
