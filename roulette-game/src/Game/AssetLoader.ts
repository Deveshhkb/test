import { Assets, Texture } from 'pixi.js';
import { GameEvent } from '../Types';
import { EventBus } from '../Utilities/EventBus';
import { Logger } from '../Utilities/Logger';

/** One entry in the manifest. */
export interface AssetEntry {
  readonly alias: string;
  readonly src: string;
  /** Optional - a missing non-required asset never blocks the boot. */
  readonly required?: boolean;
}

export interface AssetBundle {
  readonly name: string;
  readonly assets: readonly AssetEntry[];
}

/**
 * Page-wide reference counts per alias.
 *
 * Pixi's `Assets` cache is global, not per-application, so two engine instances
 * that load the same alias share one GPU texture. Unloading on the first
 * instance's teardown would pull that texture out from under the second, which
 * then faults on its next draw. Counting references here means the texture
 * survives until the last holder lets go.
 */
const globalRefCounts = new Map<string, number>();

/**
 * Asset pipeline.
 *
 * Every visual in the engine has a procedural implementation in
 * {@link TextureFactory}, and this loader supplies the artwork that overrides
 * it. It is bundle-aware, progress-reporting and, crucially, *non-fatal*: an
 * asset that fails to load is logged and skipped, and the procedural fallback
 * stands in for it. The game is therefore fully playable with an empty
 * manifest, a partial one, or a CDN having a bad day.
 *
 * That policy matters in production. A CDN hiccup on one sprite should degrade
 * one sprite, not black-screen a table full of players mid-session.
 *
 * See docs/ASSETS.md for the manifest format and the swap-in procedure.
 */
export class AssetLoader {
  private readonly log = Logger.create('AssetLoader');
  private readonly loaded = new Set<string>();
  private readonly failed = new Set<string>();
  private baseUrl: string;

  public constructor(
    private readonly bus: EventBus,
    baseUrl = '',
  ) {
    this.baseUrl = baseUrl;
  }

  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * Load a set of bundles, reporting progress on `ASSETS_PROGRESS`.
   *
   * Resolves once every bundle has settled - successfully or otherwise.
   */
  public async load(bundles: readonly AssetBundle[]): Promise<void> {
    const entries = bundles.flatMap((bundle) => bundle.assets);

    if (entries.length === 0) {
      // The default configuration takes this path: nothing to fetch, so the
      // loading scene is driven purely by the procedural bake.
      this.bus.emit(GameEvent.ASSETS_PROGRESS, { progress: 1 });
      this.bus.emit(GameEvent.ASSETS_COMPLETE);
      return;
    }

    let completed = 0;
    const report = (): void => {
      completed += 1;
      this.bus.emit(GameEvent.ASSETS_PROGRESS, { progress: completed / entries.length });
    };

    await Promise.all(
      entries.map(async (entry) => {
        try {
          // `Assets.add` is idempotent for an alias already registered by
          // another instance, and `load` then resolves from cache.
          Assets.add({ alias: entry.alias, src: this.resolve(entry.src) });
          await Assets.load(entry.alias);

          this.loaded.add(entry.alias);
          globalRefCounts.set(entry.alias, (globalRefCounts.get(entry.alias) ?? 0) + 1);
        } catch (error) {
          this.failed.add(entry.alias);
          const level = entry.required ? 'error' : 'warn';
          this.log[level](`asset "${entry.alias}" failed to load`, error);
        } finally {
          report();
        }
      }),
    );

    this.bus.emit(GameEvent.ASSETS_COMPLETE);
    this.log.info(`assets loaded: ${this.loaded.size}, failed: ${this.failed.size}`);
  }

  /** A loaded texture, or `undefined` when the caller should fall back. */
  public getTexture(alias: string): Texture | undefined {
    if (!this.loaded.has(alias)) return undefined;
    return Assets.get<Texture>(alias);
  }

  public has(alias: string): boolean {
    return this.loaded.has(alias);
  }

  public getFailed(): readonly string[] {
    return [...this.failed];
  }

  /**
   * Drop this loader's references, unloading only the assets no other live
   * engine instance is still using.
   */
  public async destroy(): Promise<void> {
    await Promise.all(
      [...this.loaded].map(async (alias) => {
        const remaining = (globalRefCounts.get(alias) ?? 1) - 1;

        if (remaining > 0) {
          globalRefCounts.set(alias, remaining);
          return;
        }
        globalRefCounts.delete(alias);

        try {
          await Assets.unload(alias);
        } catch (error) {
          this.log.debug(`failed to unload "${alias}"`, error);
        }
      }),
    );
    this.loaded.clear();
    this.failed.clear();
  }

  /** Absolute URLs pass through; relative ones are prefixed with the base. */
  private resolve(src: string): string {
    if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src;
    if (!this.baseUrl) return src;
    return `${this.baseUrl.replace(/\/$/, '')}/${src.replace(/^\//, '')}`;
  }
}

/**
 * Aliases the engine prefers over a procedural bake when they are present.
 *
 * Every one is optional. {@link TextureFactory} checks the loader first and
 * falls back to drawing the piece itself, so a partial art set is fine - you
 * can ship the wheel photography and leave the chips procedural.
 */
export const ASSET_ALIASES = {
  /** Wooden bowl with the deflector diamonds. Square, wheel-diameter. */
  WHEEL_RIM: 'wheel.rim',
  /** Rotating pocket ring with the numbers printed on it. */
  WHEEL_POCKETS: 'wheel.pockets',
  /** Central cone / turret. */
  WHEEL_CONE: 'wheel.cone',
  /** Metal spindle cross over the cone. */
  WHEEL_SPINDLE: 'wheel.spindle',
  /** Ivory ball. */
  BALL: 'wheel.ball',
  /** Tapered wedge laid over the winning pocket. */
  POCKET_HIGHLIGHT: 'wheel.pocketHighlight',
  /** Felt texture tiled behind the betting layout. */
  FELT: 'table.felt',
  /** Ring drawn around the selected chip denomination. */
  CHIP_RING: 'ui.chipRing',
} as const;

/**
 * Default manifest.
 *
 * Paths are relative to `assetBaseUrl` (empty by default, i.e. served from the
 * site root). Nothing here is `required`, so a deployment that does not ship
 * these files still boots - it just renders the procedural wheel instead.
 */
export const DEFAULT_BUNDLES: readonly AssetBundle[] = [
  {
    name: 'wheel',
    assets: [
      { alias: ASSET_ALIASES.WHEEL_RIM, src: 'assets/wheel-rim.png' },
      { alias: ASSET_ALIASES.WHEEL_POCKETS, src: 'assets/wheel-pockets.png' },
      { alias: ASSET_ALIASES.WHEEL_CONE, src: 'assets/wheel-cone.png' },
      { alias: ASSET_ALIASES.WHEEL_SPINDLE, src: 'assets/wheel-spindle.png' },
      { alias: ASSET_ALIASES.BALL, src: 'assets/ball.png' },
      { alias: ASSET_ALIASES.POCKET_HIGHLIGHT, src: 'assets/pocket-highlight.png' },
    ],
  },
  {
    name: 'table',
    assets: [
      { alias: ASSET_ALIASES.FELT, src: 'assets/felt.jpg' },
      { alias: ASSET_ALIASES.CHIP_RING, src: 'assets/chip-ring.png' },
    ],
  },
];
