import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ControlBar } from '../src/components/ControlBar';
import { Header } from '../src/components/Header';
import { SpinButton } from '../src/components/SpinButton';
import { SettingsModal } from '../src/components/SettingsModal';
import { runtime } from '../src/game/runtime';
import { useBetStore } from '../src/stores/betStore';
import { useGameStore } from '../src/stores/gameStore';
import { usePlayerStore } from '../src/stores/playerStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useUiStore } from '../src/stores/uiStore';

const controller = { spin: vi.fn(async () => {}), quickStop: vi.fn(), unlockAudio: vi.fn() };

beforeEach(() => {
  controller.spin.mockClear();
  controller.quickStop.mockClear();
  runtime.controller = controller as never;
  runtime.app = null;
  useGameStore.getState().reset();
  useGameStore.getState().set({ ready: true });
  useSettingsStore.getState().stopAuto();
  useSettingsStore.getState().set({ turbo: false, muted: false });
  useBetStore.getState().setLevels([1000, 2000, 5000, 10000], 5000);
  useUiStore.getState().close();
});

describe('SpinButton', () => {
  it('spins when idle', () => {
    render(<SpinButton />);
    const btn = screen.getByTestId('spin-button');
    expect(btn).toHaveAttribute('data-state', 'idle');
    fireEvent.click(btn);
    expect(controller.spin).toHaveBeenCalledTimes(1);
  });
  it('quick-stops while spinning and shows the lucky state', () => {
    useGameStore.getState().transition('SPIN_REQUESTED');
    useGameStore.getState().transition('SPINNING');
    render(<SpinButton />);
    const btn = screen.getByTestId('spin-button');
    expect(btn).toHaveAttribute('data-state', 'spinning');
    fireEvent.click(btn);
    expect(controller.quickStop).toHaveBeenCalled();
    expect(controller.spin).not.toHaveBeenCalled();
    act(() => useGameStore.getState().set({ luckySpin: true }));
    expect(btn).toHaveAttribute('data-state', 'lucky');
    expect(screen.getByText('LUCKY')).toBeInTheDocument();
  });
  it('is disabled during win presentation and before ready', () => {
    useGameStore.getState().set({ ready: false });
    const { rerender } = render(<SpinButton />);
    expect(screen.getByTestId('spin-button')).toBeDisabled();
    act(() => {
      useGameStore.getState().set({ ready: true, phase: 'WIN_PRESENTATION' });
    });
    rerender(<SpinButton />);
    expect(screen.getByTestId('spin-button')).toHaveAttribute('data-state', 'disabled');
  });
  it('shows auto counter and stops auto on click', () => {
    useSettingsStore.getState().startAuto(25);
    render(<SpinButton />);
    const btn = screen.getByTestId('spin-button');
    expect(btn).toHaveAttribute('data-state', 'auto');
    expect(btn).toHaveTextContent('25');
    fireEvent.click(btn);
    expect(useSettingsStore.getState().autoSpinsRemaining).toBe(0);
  });
  it('shows the turbo badge', () => {
    useSettingsStore.getState().set({ turbo: true });
    render(<SpinButton />);
    expect(screen.getByTestId('spin-button').className).toContain('is-turbo');
  });
});

describe('ControlBar', () => {
  it('changes bet and max bet', () => {
    render(<ControlBar />);
    expect(screen.getByTestId('bet-value')).toHaveTextContent('50.00');
    fireEvent.click(screen.getByTestId('bet-plus'));
    expect(screen.getByTestId('bet-value')).toHaveTextContent('100.00');
    expect(screen.getByTestId('bet-plus')).toBeDisabled();
    fireEvent.click(screen.getByTestId('bet-minus'));
    fireEvent.click(screen.getByTestId('bet-minus'));
    fireEvent.click(screen.getByTestId('bet-minus'));
    expect(screen.getByTestId('bet-value')).toHaveTextContent('10.00');
    fireEvent.click(screen.getByTestId('max-bet'));
    expect(screen.getByTestId('bet-value')).toHaveTextContent('100.00');
  });
  it('locks bet changes while a round is running', () => {
    useGameStore.getState().transition('SPIN_REQUESTED');
    render(<ControlBar />);
    expect(screen.getByTestId('bet-plus')).toBeDisabled();
    expect(screen.getByTestId('max-bet')).toBeDisabled();
  });
  it('toggles turbo and opens auto spin options', () => {
    render(<ControlBar />);
    fireEvent.click(screen.getByTestId('turbo-button'));
    expect(useSettingsStore.getState().turbo).toBe(true);
    expect(screen.getByTestId('turbo-button')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('auto-button'));
    expect(useUiStore.getState().modal).toBe('auto');
  });
});

describe('Header', () => {
  it('shows the display balance and toggles sound', () => {
    usePlayerStore.getState().setBalance(12560000);
    render(<Header />);
    expect(screen.getByTestId('balance')).toHaveTextContent('125,600.00');
    fireEvent.click(screen.getByTestId('sound-toggle'));
    expect(useSettingsStore.getState().muted).toBe(true);
    expect(controller.unlockAudio).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('menu-button'));
    expect(useUiStore.getState().modal).toBe('menu');
  });
});

describe('Settings / audio controls', () => {
  it('updates volume sliders and mute', () => {
    render(<SettingsModal />);
    fireEvent.change(screen.getByTestId('vol-music'), { target: { value: '20' } });
    expect(useSettingsStore.getState().musicVolume).toBeCloseTo(0.2);
    fireEvent.change(screen.getByTestId('vol-master'), { target: { value: '65' } });
    expect(useSettingsStore.getState().masterVolume).toBeCloseTo(0.65);
    fireEvent.click(screen.getByTestId('mute-toggle'));
    expect(useSettingsStore.getState().muted).toBe(true);
  });
});
