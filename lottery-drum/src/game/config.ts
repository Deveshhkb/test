/**
 * Every tunable in the recreation lives here. Values are derived from the
 * reference clip (960x540, 24fps, 8s) and are expressed in a fixed virtual
 * world so the game is resolution independent.
 */

/** Virtual stage the whole scene is authored in. Matches the reference 16:9. */
export const WORLD_WIDTH = 1920;
export const WORLD_HEIGHT = 1080;

/** Centre of the drum in world coordinates. */
export const DRUM_CENTER_X = WORLD_WIDTH * 0.5;
export const DRUM_CENTER_Y = WORLD_HEIGHT * 0.44;

/** Drum geometry, in world units. */
export const DRUM_OUTER_RADIUS = 268;
export const DRUM_GLASS_THICKNESS = 26;
/** Balls are constrained to this circle (the inside face of the rim). */
export const DRUM_INNER_RADIUS = DRUM_OUTER_RADIUS - DRUM_GLASS_THICKNESS - 20;
export const DRUM_HUB_RADIUS = 30;
export const DRUM_SPOKE_COUNT = 5;
export const DRUM_SPOKE_HALF_WIDTH = 5;
/** Slotted cups moulded into the inner rim; the winning ball parks in one. */
export const DRUM_SLOT_COUNT = 18;

/** Ball sizing and appearance. */
export const BALL_COUNT = 18;
export const BALL_RADIUS = 30;
export const BALL_CRIMSON = 0xd23a52;
export const BALL_CRIMSON_DARK = 0x7d1f2f;
export const BALL_ONYX = 0x1d1d22;
export const BALL_ONYX_DARK = 0x0a0a0d;

/** Physics. Units are world-pixels and seconds. */
export const GRAVITY = 2400;
export const BALL_RESTITUTION = 0.42;
export const BALL_FRICTION = 0.06;
export const WALL_RESTITUTION = 0.34;
/** How strongly the rotating rim drags a touching ball along with it. */
export const WALL_TANGENT_GRIP = 0.45;
export const SPOKE_RESTITUTION = 0.5;
export const SPOKE_TANGENT_GRIP = 0.55;
export const LINEAR_DAMPING = 0.12;
/** Fixed physics step. The renderer runs free; physics is deterministic. */
export const PHYSICS_STEP = 1 / 240;
export const PHYSICS_MAX_STEPS_PER_FRAME = 16;
export const PHYSICS_SOLVER_ITERATIONS = 3;

/** Drum spin-up / spin-down behaviour, radians per second. */
export const SPIN_TARGET_SPEED = 8.4;
export const SPIN_ACCELERATION = 6.0;
export const SPIN_DECELERATION = 9.0;
export const SPIN_IDLE_SPEED = 0.55;

/** Draw sequence timings in seconds, read off the reference timeline. */
export const T_SPIN = 3.5;
export const T_DRAIN = 0.9;
export const T_SETTLE = 0.8;
export const T_REVEAL_HOLD = 1.6;
export const T_RETURN = 1.4;

/** Camera dolly. Zoom 1 shows the full virtual stage. */
export const CAM_IDLE_ZOOM = 1.0;
export const CAM_CLOSE_ZOOM = 4.35;
export const CAM_IDLE_FOCUS_Y = DRUM_CENTER_Y;
/** The close-up frames the lower rim where the winner lands. */
export const CAM_CLOSE_FOCUS_Y = DRUM_CENTER_Y + DRUM_INNER_RADIUS * 0.62;

/** Result number range. The reference draws 19 from a roulette-style pool. */
export const NUMBER_MIN = 0;
export const NUMBER_MAX = 36;
export const DEFAULT_RESULT = 19;

/** Palette sampled directly from the reference footage. */
export const COLOR_NEON = 0x17c6fb;
export const COLOR_NEON_DIM = 0x0d6f92;
export const COLOR_RESULT_RED = 0xff6865;
export const COLOR_RESULT_CYAN = 0x7fe6ff;
export const COLOR_GREEN_DOT = 0x31bc64;
export const COLOR_GOLD = 0xe9c787;
export const COLOR_GOLD_DEEP = 0xb8801f;
export const COLOR_BACKDROP_TOP = 0x0b1220;
export const COLOR_BACKDROP_BOTTOM = 0x172839;
export const COLOR_PILL_BG = 0x111114;
export const COLOR_GLASS = 0xbcd6e8;
export const COLOR_STEEL = 0x8b97a6;
export const COLOR_PEDESTAL = 0x141822;

/** HUD pill geometry, authored in world units so it dollies with the camera. */
export const PILL_WIDTH = 560;
export const PILL_HEIGHT = 62;
export const PILL_OFFSET_Y = 100;

/** Motion-blur ghosting on fast balls. */
export const TRAIL_LENGTH = 5;
export const TRAIL_MIN_SPEED = 520;

/** Renderer. */
export const MAX_DEVICE_PIXEL_RATIO = 2;
export const BACKGROUND_CLEAR_COLOR = 0x05080f;
