import type { PublicBossFight, SessionState, SpinResponse } from '@neon/shared';
import { ApiRequestError } from '../../services/api';
import { GameClient, newIdempotencyKey } from '../../services/gameClient';
import { useBetStore } from '../../stores/betStore';
import { useBonusStore } from '../../stores/bonusStore';
import { useConfigStore } from '../../stores/configStore';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { wait } from './constants';
import type { GameApplication } from './GameApplication';

const ERROR_TEXT: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Not enough credits for this bet.',
  INVALID_BET: 'That bet level is not available.',
  SPIN_IN_PROGRESS: 'A spin is already in progress.',
  BONUS_PENDING: 'Finish the boss fight first.',
  NETWORK: 'Connection lost – reconnecting…',
};

/**
 * Orchestrates a round on the client: request → reel spin → server-confirmed stop →
 * cascades → win tiers → features. It never calculates outcomes or payouts.
 */
export class GameFlowController {
  readonly client = new GameClient();
  private running = false;
  private unsubs: (() => void)[] = [];

  constructor(readonly game: GameApplication) {}

  private get gs() {
    return useGameStore.getState();
  }

  async init() {
    const game = this.game;
    game.onStageTap = () => this.quickStop();
    game.onError = (m) => useUiStore.getState().showToast(m);

    // settings -> engine
    const applySettings = () => {
      const s = useSettingsStore.getState();
      game.audio.setVolumes({ master: s.masterVolume, music: s.musicVolume, sfx: s.sfxVolume, muted: s.muted });
      game.reelController.setTurbo(s.turbo);
    };
    applySettings();
    this.unsubs.push(useSettingsStore.subscribe(applySettings));

    const [{ state }, cfg] = await Promise.all([this.client.authenticate(), this.client.config()]);
    useBetStore.getState().setLevels(cfg.config.betLevels, cfg.config.defaultBet);
    useConfigStore.getState().set({ config: cfg.config });
    this.applySession(state, true);
    this.client.connectSocket({
      onConnection: (c) => usePlayerStore.getState().setConnected(c),
      onBalance: (b) => {
        // only sync idle balance; during presentations the visual balance lags intentionally
        if (this.gs.phase === 'IDLE' && !this.gs.requestInFlight) usePlayerStore.getState().setBalance(b.balance);
        else usePlayerStore.getState().setBalance(b.balance, false);
      },
    });
    useGameStore.getState().set({ ready: true });

    // recovery of unfinished features after reload / reconnection
    if (state.bossFight && !state.bossFight.completed) await this.runBossFight(state.bossFight);
    else if (state.freeSpins) await this.continueFreeSpins();
  }

  private applySession(state: SessionState, initial: boolean) {
    const p = usePlayerStore.getState();
    p.setAuth(this.client.token!, state.userId, state.nickname);
    p.setBalance(state.balance);
    if (state.lastRound && initial) this.game.reels.setGrid(state.lastRound.outcome.finalGrid);
    useBonusStore.getState().setFreeSpins(state.freeSpins, !!state.freeSpins);
    useBonusStore.getState().setBossFight(state.bossFight);
    if (state.freeSpins) {
      this.game.setMode('free');
      useBetStore.getState().setBet(state.freeSpins.bet);
    }
  }

  unlockAudio() {
    this.game.audio.unlock();
    if (this.game.audio.unlocked) this.game.audio.startMusic();
  }

  quickStop() {
    if (this.gs.phase === 'SPINNING' || this.gs.phase === 'REEL_STOPPING' || this.gs.phase === 'SPIN_REQUESTED') this.game.reelController.quickStop();
  }

  /** Player-initiated spin (also used by auto spin). */
  async spin(): Promise<void> {
    this.unlockAudio();
    if (this.running || !this.gs.canSpin()) {
      this.quickStop();
      return;
    }
    if (useBonusStore.getState().freeSpinsActive) return; // free spins play automatically
    this.running = true;
    try {
      await this.playRound();
      await this.autoLoop();
    } finally {
      this.running = false;
    }
  }

  private async autoLoop() {
    const settings = useSettingsStore.getState;
    while (settings().autoSpinsRemaining > 0 && this.gs.phase === 'IDLE') {
      const bet = useBetStore.getState().bet;
      if (usePlayerStore.getState().balance < bet) {
        settings().stopAuto();
        useUiStore.getState().showToast(ERROR_TEXT.INSUFFICIENT_FUNDS);
        break;
      }
      await wait(settings().turbo ? 150 : 400);
      if (settings().autoSpinsRemaining <= 0) break;
      settings().consumeAuto();
      const ok = await this.playRound();
      if (!ok) {
        settings().stopAuto();
        break;
      }
    }
  }

  /** One complete paid or free round. Returns false on error. */
  private async playRound(): Promise<boolean> {
    const gs = this.gs;
    const game = this.game;
    const bonus = useBonusStore.getState();
    const freeSpin = bonus.freeSpinsActive;
    const bet = freeSpin && bonus.freeSpins ? bonus.freeSpins.bet : useBetStore.getState().bet;
    const player = usePlayerStore.getState();
    if (!freeSpin && player.balance < bet) {
      useUiStore.getState().showToast(ERROR_TEXT.INSUFFICIENT_FUNDS);
      return false;
    }
    if (!gs.transition('SPIN_REQUESTED')) return false;
    gs.setRequestInFlight(true);
    gs.set({ roundWin: 0, cascadeIndex: 0, cascadeMultiplier: freeSpin && bonus.freeSpins ? bonus.freeSpins.multiplier : 1, luckySpin: false, error: null });
    game.winAnimator.clear();
    game.audio.play('click');
    if (!freeSpin) player.setDisplayBalance(player.displayBalance - bet);

    const key = newIdempotencyKey();
    game.reelController.spinAllReels();
    gs.transition('SPINNING');
    let res: SpinResponse;
    try {
      res = await this.client.spin(bet, key);
    } catch (e) {
      gs.setRequestInFlight(false);
      const code = e instanceof ApiRequestError ? e.code : 'INTERNAL';
      useUiStore.getState().showToast(ERROR_TEXT[code] ?? (e as Error).message);
      // land the reels back on the last confirmed grid
      gs.transition('ERROR');
      await game.reelController.stopAllReels(game.reels.getGrid());
      player.setDisplayBalance(usePlayerStore.getState().balance);
      useGameStore.getState().transition('IDLE');
      if (code === 'BONUS_PENDING') await this.resync();
      return false;
    }
    gs.setRequestInFlight(false);
    usePlayerStore.getState().setBalance(res.balanceAfter, false);
    usePlayerStore.getState().setDisplayBalance(res.balanceBefore - (freeSpin ? 0 : bet));

    const outcome = res.outcome;
    gs.set({ luckySpin: outcome.lucky });
    gs.transition('REEL_STOPPING');
    await game.reelController.stopAllReels(outcome.initialGrid);
    gs.transition('EVALUATING');

    // cascades (server-confirmed sequence)
    let acc = 0;
    let n = 0;
    for (const step of outcome.cascades) {
      if (step.wins.length === 0) break;
      n++;
      gs.transition('CASCADING');
      useGameStore.getState().set({ cascadeIndex: n, cascadeMultiplier: step.multiplier });
      await game.cascade.playStep(step, game.reelController.timing, { cascadeNumber: n, bigStep: step.stepWin >= bet * 5 });
      acc += step.stepWin;
      useGameStore.getState().set({ roundWin: acc });
    }
    game.cascade.hideCounter();
    if (n > 0) game.character.smallWin();

    // scatter / bonus emphasis
    if (outcome.scatter.count >= 3) {
      game.winAnimator.highlightPositions(outcome.scatter.positions, 0xff2bd6);
      game.audio.play('bonusTrigger');
      game.character.bonusTrigger();
      game.reels.frame.flash();
      await wait(1300);
      acc += outcome.scatter.payout;
      useGameStore.getState().set({ roundWin: Math.min(outcome.totalWin, acc) });
      game.winAnimator.clear();
    }
    if (outcome.bonusTriggered) {
      game.winAnimator.highlightPositions(outcome.bonusPositions, 0xffb020);
      game.audio.play('bonusTrigger');
      game.character.bonusTrigger();
      await wait(1400);
      game.winAnimator.clear();
    }
    // the final grid must match the server exactly
    if (import.meta.env.DEV) {
      const shown = JSON.stringify(game.getGrid());
      if (shown !== JSON.stringify(outcome.finalGrid)) console.error('[flow] grid mismatch', shown, outcome.finalGrid);
    }
    useGameStore.getState().set({ roundWin: outcome.totalWin, lastWin: outcome.totalWin });

    // win tier presentation
    const turbo = useSettingsStore.getState().turbo;
    if (outcome.totalWin > 0) {
      gs.transition('WIN_PRESENTATION');
      if (outcome.winTier === 'BIG' || outcome.winTier === 'MEGA' || outcome.winTier === 'EPIC') await game.celebrations.play(outcome.winTier, outcome.totalWin, turbo);
      else if (outcome.lucky) await game.lucky.play(outcome.totalWin, turbo);
      else await wait(turbo ? 250 : 600);
    }
    usePlayerStore.getState().setDisplayBalance(freeSpin ? usePlayerStore.getState().balance : res.balanceAfter);

    // free spins state transitions
    const fsOut = outcome.freeSpins;
    if (fsOut?.triggered) {
      if (useSettingsStore.getState().stopAutoOnFeature) useSettingsStore.getState().stopAuto();
      useGameStore.getState().transition('FREE_SPINS');
      await game.freeSpins.intro(fsOut.remaining);
      game.setMode('free');
      useBonusStore.getState().setFreeSpins(res.freeSpins, true);
    } else if (freeSpin) {
      useGameStore.getState().transition('FREE_SPINS');
      if (fsOut && fsOut.retriggered > 0) await game.freeSpins.intro(fsOut.retriggered, true);
      useBonusStore.getState().setFreeSpins(res.freeSpins ?? (fsOut ? { ...fsOut } : null), !!res.freeSpins);
      useGameStore.getState().set({ cascadeMultiplier: res.freeSpins?.multiplier ?? 1 });
    }

    // boss fight
    if (res.bossFight && !res.bossFight.completed) {
      if (useSettingsStore.getState().stopAutoOnFeature) useSettingsStore.getState().stopAuto();
      await this.runBossFight(res.bossFight);
    }

    // free spins completion / continuation
    if (freeSpin && !res.freeSpins && fsOut?.completed) {
      await game.freeSpins.outro(fsOut.totalWin, fsOut.played);
      game.setMode('base');
      useBonusStore.getState().setFreeSpins(null, false);
      usePlayerStore.getState().setBalance(usePlayerStore.getState().balance);
    }
    const phase = useGameStore.getState().phase;
    if (phase !== 'IDLE') useGameStore.getState().transition('IDLE');
    if (!useBonusStore.getState().freeSpinsActive) usePlayerStore.getState().setDisplayBalance(usePlayerStore.getState().balance);
    if (fsOut?.triggered || (freeSpin && useBonusStore.getState().freeSpinsActive)) {
      void this.continueFreeSpins();
    }
    return true;
  }

  private fsLoop = false;
  /** Free spins play automatically until the server reports completion. */
  private async continueFreeSpins() {
    if (this.fsLoop) return;
    this.fsLoop = true;
    try {
      while (useBonusStore.getState().freeSpinsActive) {
        if (!useGameStore.getState().ready) break;
        await wait(useSettingsStore.getState().turbo ? 250 : 650);
        if (useGameStore.getState().phase !== 'IDLE') {
          await wait(200);
          continue;
        }
        this.running = true;
        const ok = await this.playRound().finally(() => (this.running = false));
        if (!ok) await wait(1500);
      }
    } finally {
      this.fsLoop = false;
    }
  }

  private async runBossFight(bf: PublicBossFight) {
    const game = this.game;
    const gs = useGameStore.getState();
    if (gs.phase !== 'BONUS') {
      if (!gs.transition('BONUS')) {
        useGameStore.getState().set({ phase: 'BONUS' });
      }
    }
    useBonusStore.getState().setBossFight(bf);
    game.setMode('boss');
    const final = await game.boss.run(bf, async (targetIndex) => {
      const res = await this.client.bonusPick(bf.roundId, targetIndex, newIdempotencyKey());
      useBonusStore.getState().setBossFight(res.bossFight);
      usePlayerStore.getState().setBalance(res.balanceAfter, false);
      return res;
    });
    useBonusStore.getState().setBossFight(null);
    useGameStore.getState().set({ lastWin: final.totalWin, roundWin: final.totalWin });
    usePlayerStore.getState().setDisplayBalance(usePlayerStore.getState().balance);
    game.setMode(useBonusStore.getState().freeSpinsActive ? 'free' : 'base');
    const next = useBonusStore.getState().freeSpinsActive ? 'FREE_SPINS' : 'IDLE';
    useGameStore.getState().transition(next);
    if (next === 'FREE_SPINS') useGameStore.getState().transition('IDLE');
  }

  private async resync() {
    const state = await this.client.authenticate().then((r) => r.state);
    this.applySession(state, false);
    if (state.bossFight && !state.bossFight.completed) await this.runBossFight(state.bossFight);
  }

  destroy() {
    this.unsubs.forEach((u) => u());
    this.client.socket.disconnect();
    useGameStore.getState().set({ ready: false });
  }
}
