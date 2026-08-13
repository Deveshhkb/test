import { Assets, BitmapFont, type Spritesheet, Texture, type Renderer } from "pixi.js";

import type { GameConfig } from "./Config";
import { Fonts } from "./Constants";
import { AtlasFactory, type GeneratedAtlas } from "./utils/AtlasFactory";
import { Logger } from "./utils/Logger";

export interface LoadProgress {
  readonly progress: number;
  readonly label: string;
}

export type ProgressCallback = (progress: LoadProgress) => void;

interface LoadTask {
  readonly label: string;
  readonly weight: number;
  readonly run: () => Promise<void>;
}

/**
 * Owns every GPU resource in the game.
 *
 * Resolution order for a texture key is: externally configured URL, then the
 * production spritesheet if one is configured, then the procedural atlas. That
 * ordering lets a brand override a single card back without shipping a whole
 * new sheet, and lets the engine boot with no assets at all.
 */
export class AssetLoader {
  private readonly log = Logger.create("assets");
  private readonly renderer: Renderer;
  private config: GameConfig;

  private readonly textures = new Map<string, Texture>();
  private generated: GeneratedAtlas | null = null;
  /** Atlases replaced by `rebuild()`, held until consumers have re-resolved. */
  private readonly stale: GeneratedAtlas[] = [];
  private readonly externalUrls = new Set<string>();
  private loaded = false;

  constructor(renderer: Renderer, config: GameConfig) {
    this.renderer = renderer;
    this.config = config;
  }

  get isLoaded(): boolean {
    return this.loaded;
  }

  async load(onProgress?: ProgressCallback): Promise<void> {
    if (this.loaded) return;

    const tasks: LoadTask[] = [
      { label: "Preparing table", weight: 1, run: () => this.installFonts() },
    ];

    if (this.config.assets.atlasUrl) {
      tasks.push({ label: "Loading artwork", weight: 3, run: () => this.loadSpritesheet() });
    }
    if (this.config.assets.useProceduralAtlas) {
      tasks.push({ label: "Generating cards", weight: 3, run: () => this.buildProceduralAtlas() });
    }
    if (Object.keys(this.config.assets.textures).length > 0) {
      tasks.push({ label: "Loading textures", weight: 2, run: () => this.loadExternalTextures() });
    }

    const totalWeight = tasks.reduce((sum, task) => sum + task.weight, 0);
    let done = 0;

    for (const task of tasks) {
      onProgress?.({ progress: done / totalWeight, label: task.label });
      try {
        await task.run();
      } catch (error) {
        // A missing optional asset must never block the table from opening.
        this.log.error(`task "${task.label}" failed`, error);
      }
      done += task.weight;
      onProgress?.({ progress: done / totalWeight, label: task.label });
    }

    this.loaded = true;
    onProgress?.({ progress: 1, label: "Ready" });
    this.log.info(`loaded ${this.textures.size} textures`);
  }

  /* ---------------------------------------------------------------- *
   * Sources
   * ---------------------------------------------------------------- */

  private installFonts(): Promise<void> {
    const family = this.config.theme.numericFontFamily;

    // BitmapText for anything that changes every frame: countdown, totals,
    // scores. Rasterising the glyph set once removes per-frame texture uploads.
    BitmapFont.install({
      name: Fonts.Numeric,
      style: { fontFamily: family, fontSize: 44, fontWeight: "700", fill: 0xffffff },
      chars: [["0", "9"], ".,+-%: ", "KMB$\u20ac\u00a3\u00a5"],
      resolution: 2,
      padding: 4,
    });

    BitmapFont.install({
      name: Fonts.Countdown,
      style: { fontFamily: family, fontSize: 96, fontWeight: "800", fill: 0xffffff },
      chars: [["0", "9"], ":"],
      resolution: 2,
      padding: 6,
    });

    BitmapFont.install({
      name: Fonts.Score,
      style: { fontFamily: family, fontSize: 72, fontWeight: "800", fill: 0xffffff },
      chars: [["0", "9"]],
      resolution: 2,
      padding: 6,
    });

    BitmapFont.install({
      name: Fonts.Label,
      style: { fontFamily: this.config.theme.fontFamily, fontSize: 34, fontWeight: "700", fill: 0xffffff },
      chars: [
        ["a", "z"],
        ["A", "Z"],
        ["0", "9"],
        " .,:%/×+-'$()",
      ],
      resolution: 2,
      padding: 4,
    });

    return Promise.resolve();
  }

  private buildProceduralAtlas(): Promise<void> {
    const factory = new AtlasFactory(this.renderer, this.config);
    this.generated = factory.build();
    for (const [key, texture] of Object.entries(this.generated.textures)) {
      if (!this.textures.has(key)) this.textures.set(key, texture);
    }
    return Promise.resolve();
  }

  private async loadSpritesheet(): Promise<void> {
    const url = this.config.assets.atlasUrl;
    if (!url) return;
    const sheet = await Assets.load<Spritesheet>(url);
    this.externalUrls.add(url);
    for (const [key, texture] of Object.entries(sheet.textures)) {
      this.textures.set(stripExtension(key), texture);
    }
  }

  private async loadExternalTextures(): Promise<void> {
    const entries = Object.entries(this.config.assets.textures);
    const results = await Promise.allSettled(
      entries.map(async ([key, path]) => {
        const url = resolveUrl(this.config.assets.basePath, path);
        const texture = await Assets.load<Texture>(url);
        this.externalUrls.add(url);
        return [key, texture] as const;
      }),
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const [key, texture] = result.value;
        this.textures.set(key, texture);
      } else {
        this.log.warn(`texture "${entries[index]?.[0]}" failed, using fallback`, result.reason);
      }
    });
  }

  /* ---------------------------------------------------------------- *
   * Access
   * ---------------------------------------------------------------- */

  /** Returns the requested texture, or `Texture.WHITE` if the key is unknown. */
  get(key: string): Texture {
    const texture = this.textures.get(key);
    if (texture) return texture;
    this.log.warn(`missing texture "${key}"`);
    return Texture.WHITE;
  }

  has(key: string): boolean {
    return this.textures.has(key);
  }

  /** Only for optional decoration — returns undefined instead of a fallback. */
  find(key: string): Texture | undefined {
    return this.textures.get(key);
  }

  /**
   * Rebuilds the procedural atlas after a config change that affects artwork
   * (chip ladder, theme colours, atlas resolution).
   *
   * The outgoing atlas is *not* freed here. Live sprites still hold its
   * textures, and destroying a bound GPU source out from under them crashes the
   * renderer mid-frame. Callers re-point their sprites and then call
   * `disposeStale()`.
   */
  async rebuild(config: GameConfig): Promise<void> {
    this.config = config;
    if (!config.assets.useProceduralAtlas) return;

    const previous = this.generated;
    if (previous) {
      for (const key of Object.keys(previous.textures)) this.textures.delete(key);
      this.stale.push(previous);
    }
    this.generated = null;
    await this.buildProceduralAtlas();
  }

  /** Frees atlases replaced by `rebuild()`. Call after refreshing consumers. */
  disposeStale(): void {
    for (const atlas of this.stale.splice(0)) atlas.destroy();
  }

  destroy(): void {
    this.disposeStale();
    this.generated?.destroy();
    this.generated = null;
    for (const url of this.externalUrls) {
      // Unload only what this loader pulled in — never touch the host app's cache.
      Assets.unload(url).catch(() => undefined);
    }
    this.externalUrls.clear();
    this.textures.clear();
    this.loaded = false;
  }
}

function stripExtension(key: string): string {
  const dot = key.lastIndexOf(".");
  return dot > 0 ? key.slice(0, dot) : key;
}

function resolveUrl(basePath: string, path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("/") || path.startsWith("data:")) return path;
  return `${basePath.replace(/\/$/, "")}/${path}`;
}
