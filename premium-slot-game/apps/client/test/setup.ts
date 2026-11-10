import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
// jsdom has no canvas; PixiJS only needs it for rendering, which unit tests don't do
HTMLCanvasElement.prototype.getContext = (() => null) as never;
