import { describe, expect, it, vi } from 'vitest';
import { EventBus } from './EventBus';

interface TestEvents extends Record<string, unknown> {
  ping: number;
  ready: undefined;
}

describe('EventBus', () => {
  it('delivers payloads to subscribers', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('ping', listener);
    bus.emit('ping', 42);
    expect(listener).toHaveBeenCalledWith(42);
  });

  it('supports unsubscribe via returned disposer and off()', () => {
    const bus = new EventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    const offA = bus.on('ping', a);
    bus.on('ping', b);

    offA();
    bus.off('ping', b);
    bus.emit('ping', 1);

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('fires once-listeners a single time', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    bus.once('ping', listener);
    bus.emit('ping', 1);
    bus.emit('ping', 2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('tolerates listeners that unsubscribe during emit', () => {
    const bus = new EventBus<TestEvents>();
    const calls: string[] = [];
    const offFirst = bus.on('ping', () => {
      calls.push('first');
      offFirst();
    });
    bus.on('ping', () => calls.push('second'));

    bus.emit('ping', 1);
    bus.emit('ping', 2);

    expect(calls).toEqual(['first', 'second', 'second']);
  });

  it('clear() removes everything', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('ready', listener);
    bus.clear();
    bus.emit('ready', undefined);
    expect(listener).not.toHaveBeenCalled();
  });
});
