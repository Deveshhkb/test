import { describe, expect, it } from 'vitest';
import { BREAKPOINTS, getBreakpoint, getOrientation } from './viewport';

describe('getBreakpoint', () => {
  it('classifies phone widths as compact', () => {
    expect(getBreakpoint(320)).toBe('compact');
    expect(getBreakpoint(414)).toBe('compact');
    expect(getBreakpoint(BREAKPOINTS.medium - 1)).toBe('compact');
  });

  it('classifies small-tablet widths as medium', () => {
    expect(getBreakpoint(BREAKPOINTS.medium)).toBe('medium');
    expect(getBreakpoint(768)).toBe('medium');
    expect(getBreakpoint(BREAKPOINTS.expanded - 1)).toBe('medium');
  });

  it('classifies desktop widths as expanded', () => {
    expect(getBreakpoint(BREAKPOINTS.expanded)).toBe('expanded');
    expect(getBreakpoint(1920)).toBe('expanded');
    expect(getBreakpoint(3840)).toBe('expanded');
  });
});

describe('getOrientation', () => {
  it('detects portrait when height exceeds width', () => {
    expect(getOrientation(390, 844)).toBe('portrait');
    expect(getOrientation(320, 568)).toBe('portrait');
  });

  it('detects landscape when width is at least height', () => {
    expect(getOrientation(844, 390)).toBe('landscape');
    expect(getOrientation(1920, 1080)).toBe('landscape');
    // Square viewports count as landscape (widest layout wins).
    expect(getOrientation(800, 800)).toBe('landscape');
  });
});
