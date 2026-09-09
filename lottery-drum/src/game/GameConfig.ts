/**
 * Every tunable for the machine, the sequence and the look.
 *
 * The design resolution matches the reference composition (1918x980). All scene
 * geometry is authored in that space and letterboxed to the viewport, so the
 * framing is identical at any window size.
 */

export const DESIGN_WIDTH = 1918;
export const DESIGN_HEIGHT = 980;

/** Centre of the machine in design coordinates. */
export const MACHINE_X = DESIGN_WIDTH * 0.5;
export const MACHINE_Y = DESIGN_HEIGHT * 0.455;

// ---------------------------------------------------------------------------
// Wheel geometry. Radii run outward; every ring is an independent layer.
// ---------------------------------------------------------------------------

/** Outer lip of the machine's cast frame. */
export const FRAME_OUTER_RADIUS = 292;
/** Brushed collar between the frame and the glass. */
export const FRAME_INNER_RADIUS = 268;
/** Front face of the glass dome. */
export const GLASS_RADIUS = 262;
/** Metal ring that caps the glass against the pocket band. */
export const OUTER_RING_RADIUS = 240;
export const OUTER_RING_THICKNESS = 16;
/** Band the numbered pockets are cut into. */
export const POCKET_BAND_OUTER = 232;
export const POCKET_BAND_INNER = 176;
/** Inner metal ring, the boundary of the open playfield. */
export const INNER_RING_RADIUS = 172;
export const INNER_RING_THICKNESS = 10;
/** Balls are contained by this circle. */
export const PLAYFIELD_RADIUS = 226;
/** Radius the balls rest at once they are riding the pocket band. */
export const POCKET_SEAT_RADIUS = 200;

export const POCKET_COUNT = 18;

export const HUB_RADIUS = 34;
export const SPOKE_COUNT = 5;
export const SPOKE_HALF_WIDTH = 6;
export const SPOKE_INNER_RADIUS = HUB_RADIUS + 2;
export const SPOKE_OUTER_RADIUS = 214;
/** Paddle block carried at the end of each spoke. */
export const PADDLE_HALF_LENGTH = 18;
export const PADDLE_HALF_WIDTH = 11;

/** The pointer arm that swings over to mark the drawn pocket. */
export const ARM_LENGTH = 160;
export const ARM_PIVOT_RADIUS = 20;
export const ARM_REST_ANGLE = -Math.PI / 2;

// ---------------------------------------------------------------------------
// Balls
// ---------------------------------------------------------------------------

export const BALL_COUNT = 18;
export const BALL_RADIUS = 30;
export const BALL_TEXTURE_RESOLUTION = 256;

export const BALL_RED = 0xd7264b;
export const BALL_RED_SHADOW = 0x53091c;
export const BALL_BLACK = 0x24242a;
export const BALL_BLACK_SHADOW = 0x030305;

// ---------------------------------------------------------------------------
// Physics. World units are design pixels; time is seconds.
// ---------------------------------------------------------------------------

export const GRAVITY = 2400;
export const BALL_RESTITUTION = 0.42;
export const BALL_FRICTION = 0.06;
export const WALL_RESTITUTION = 0.34;
/** How hard the spinning wall drags a touching ball along with it. */
export const WALL_TANGENT_GRIP = 0.45;
export const SPOKE_RESTITUTION = 0.5;
export const SPOKE_TANGENT_GRIP = 0.55;
export const LINEAR_DAMPING = 0.12;

export const PHYSICS_STEP = 1 / 240;
export const PHYSICS_MAX_STEPS_PER_FRAME = 16;
export const PHYSICS_SOLVER_ITERATIONS = 3;

/**
 * Random tangential nudges applied to rim-riding balls. Without this the ring
 * locks into a rigid formation, because every ball is moving at exactly the
 * wall speed and nothing perturbs it.
 */
export const AGITATION_STRENGTH = 430;
export const AGITATION_INTERVAL = 0.09;

// ---------------------------------------------------------------------------
// Settling physics
//
// Once the drum stops, the drawn ball is switched to a Coulomb friction model
// so it can actually roll. The spin uses a velocity-matching grip instead,
// which is what carries the balls around the rim but would kill a rolling ball
// dead on first contact.
// ---------------------------------------------------------------------------

/** Sliding friction coefficient between ball and track. */
export const SETTLE_FRICTION = 0.34;
/** Rolling resistance, as a fraction of the supporting normal force. */
export const SETTLE_ROLLING_RESISTANCE = 0.055;
/** Restitution on the lower track. Heavy ball in a machine, not a bouncy one. */
export const SETTLE_RESTITUTION = 0.34;
/** Free-flight angular decay, per second. */
export const ANGULAR_DAMPING = 0.7;

/**
 * Pocket frets: the raised studs between pockets that a ball has to climb over.
 *
 * They are modelled as small circles near the outer track rather than as full
 * radial walls. Radial walls converge toward the wheel centre, so a ball ends
 * up wedged in the V between two of them and is then held by the geometry
 * alone - even hanging off the top of the wheel, where nothing should hold it.
 * A stud sits clear of a ball resting on the pocket centre line and only bites
 * when the ball rolls onto it, which is what a real fret does.
 */
export const FRET_RING_RADIUS = 220;
export const FRET_SIZE = 5;

/** A ball is at rest once it stays under these for REST_HOLD seconds. */
export const REST_SPEED = 26;
export const REST_ANGULAR = 1.4;
export const REST_HOLD = 0.22;
/** Hard ceiling on the settle phase, so the sequence can never wedge. */
export const T_SETTLE_MAX = 4.5;

/**
 * Drum speed at which the drawn ball is handed to the friction model.
 *
 * Two things have to be true at the release. The paddles must have slowed
 * enough not to hammer the ball across the chamber, and the ball must be slow
 * enough that the track can no longer hold it against gravity at the top:
 * that happens below sqrt(g * r), about 690 px/s here. Releasing at this speed
 * means the ball genuinely falls away from the track rather than being pushed.
 */
export const RELEASE_OMEGA = 4.2;
/**
 * Where on the track the ball is released, as an angle and a half-width.
 *
 * The wheel turns so that the right-hand side is the descending side, and this
 * window sits just past the top of it. Released there the ball leaves the track
 * high, falls down and outward, and lands back on the lower track - a real fall
 * and impact that stays in the outer channel.
 *
 * Releasing at the very top instead drops the ball straight through the middle
 * of the chamber, where the agitator is, and it perches on a spoke or the hub
 * and never reaches a pocket.
 */
export const RELEASE_ANGLE = -0.75;
export const RELEASE_ARC = 0.95;
/** If the wheel has all but stopped, release wherever the ball happens to be. */
export const RELEASE_OMEGA_FORCE = 0.6;

// ---------------------------------------------------------------------------
// Spin ramps, radians per second
// ---------------------------------------------------------------------------

export const SPIN_TARGET_SPEED = 8.4;
export const SPIN_ACCELERATION = 6.0;
export const SPIN_DECELERATION = 9.0;
export const SPIN_IDLE_SPEED = 0.55;

// ---------------------------------------------------------------------------
// Draw sequence timings, seconds
// ---------------------------------------------------------------------------

export const T_SPIN = 3.5;
export const T_DRAIN = 0.9;
export const T_REVEAL_HOLD = 1.6;
export const T_RETURN = 1.4;
/** How long the pointer arm takes to swing onto the drawn pocket. */
export const T_ARM_SWING = 0.65;

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

export const CAM_WIDE_ZOOM = 1.0;
export const CAM_CLOSE_ZOOM = 4.35;
export const CAM_WIDE_FOCUS_Y = MACHINE_Y;
/** The close-up frames the lower pocket band, where the winner seats. */
export const CAM_CLOSE_FOCUS_Y = MACHINE_Y + PLAYFIELD_RADIUS * 0.62;

// ---------------------------------------------------------------------------
// Result overlay
// ---------------------------------------------------------------------------

export const NUMBER_MIN = 0;
export const NUMBER_MAX = 36;
export const DEFAULT_RESULT = 19;

export const PILL_MIN_WIDTH = 560;
export const PILL_HEIGHT = 62;
export const PILL_OFFSET_Y = 100;
export const BIG_NUMERAL_SIZE = 300;

// ---------------------------------------------------------------------------
// Palette, sampled from the reference footage
// ---------------------------------------------------------------------------

export const COLOR_NEON = 0x17c6fb;
export const COLOR_NEON_DIM = 0x0d6f92;
export const COLOR_RESULT_RED = 0xf2454b;
export const COLOR_RESULT_CYAN = 0x7fe6ff;
export const COLOR_GREEN_DOT = 0x31bc64;
export const COLOR_GOLD = 0xe9c787;
export const COLOR_GOLD_DEEP = 0xb8801f;
export const COLOR_BACKDROP_TOP = 0x070d18;
export const COLOR_BACKDROP_BOTTOM = 0x132436;
export const COLOR_PILL_BG = 0x111114;
export const COLOR_GLASS = 0xbcd6e8;
export const COLOR_STEEL = 0x8b97a6;
export const COLOR_STEEL_DARK = 0x39424f;
export const COLOR_CHASSIS = 0x161c28;

// ---------------------------------------------------------------------------
// Effects and rendering
// ---------------------------------------------------------------------------

export const TRAIL_LENGTH = 5;
export const TRAIL_MIN_SPEED = 520;

export const MAX_DEVICE_PIXEL_RATIO = 2;
export const BACKGROUND_CLEAR_COLOR = 0x04070d;
