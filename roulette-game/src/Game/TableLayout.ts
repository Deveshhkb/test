import { BOARD, gridNumber, RED_NUMBERS } from './Constants';
import { BetSpot, BetType, RouletteNumber, WheelType } from '../Types';

/**
 * Procedural generation of the betting layout.
 *
 * Every clickable spot - all 36 straight-ups, 60 splits, 12 streets, 22
 * corners, 11 six-lines, the zero family, columns, dozens and even-money bets -
 * is *derived* from the grid rather than hand-listed. That is what keeps the
 * American variant a five-line change instead of a second 150-entry table, and
 * it means a mis-typed coordinate cannot silently create a spot that pays the
 * wrong numbers.
 *
 * Coordinates are in board units (1 unit = 1 number cell); see the ASCII
 * diagram in `Constants.ts`. `hitWidth`/`hitHeight` are *half*-extents.
 */

const CELL_HALF = 0.5;

export class TableLayout {
  private readonly spots: BetSpot[] = [];
  private readonly byId = new Map<string, BetSpot>();
  /** Spots sorted small-area-first, which is the hit-test priority order. */
  private readonly hitOrder: BetSpot[] = [];

  public constructor(private readonly wheelType: WheelType) {
    this.buildStraightUps();
    this.buildZeroFamily();
    this.buildSplits();
    this.buildStreets();
    this.buildCorners();
    this.buildSixLines();
    this.buildColumns();
    this.buildDozens();
    this.buildOutsideBets();

    for (const spot of this.spots) this.byId.set(spot.id, spot);
    this.hitOrder = [...this.spots].sort(
      (a, b) => a.hitWidth * a.hitHeight - b.hitWidth * b.hitHeight,
    );
  }

  public getSpots(): readonly BetSpot[] {
    return this.spots;
  }

  public getSpot(id: string): BetSpot | undefined {
    return this.byId.get(id);
  }

  /** Spots restricted to a single bet type - used by the renderer. */
  public getSpotsOfType(type: BetType): BetSpot[] {
    return this.spots.filter((spot) => spot.type === type);
  }

  /**
   * Resolve a point in board units to the bet the player intended.
   *
   * Smaller regions win: near a cell boundary the split/corner is what the
   * player is reaching for, while the middle of a cell is unambiguously the
   * straight-up. `touchPadding` widens point regions on coarse pointers.
   */
  public hitTest(x: number, y: number, touch = false): BetSpot | undefined {
    const pointRadius = touch ? BOARD.POINT_HIT_RADIUS_TOUCH : BOARD.POINT_HIT_RADIUS;

    for (const spot of this.hitOrder) {
      // Point bets carry the base radius and get scaled for touch; area bets
      // (cells, dozens, outside) use their literal extents.
      const isPointBet = spot.hitWidth <= BOARD.POINT_HIT_RADIUS_TOUCH;
      const halfW = isPointBet ? pointRadius : spot.hitWidth;
      const halfH = isPointBet ? pointRadius : spot.hitHeight;

      if (
        x >= spot.x - halfW &&
        x <= spot.x + halfW &&
        y >= spot.y - halfH &&
        y <= spot.y + halfH
      ) {
        return spot;
      }
    }
    return undefined;
  }

  /* --------------------------------------------------------------------- */
  /* Builders                                                              */
  /* --------------------------------------------------------------------- */

  /** The 36 numbered cells of the main grid. */
  private buildStraightUps(): void {
    for (let column = 0; column < BOARD.COLUMNS; column += 1) {
      for (let row = 0; row < BOARD.ROWS; row += 1) {
        const value = gridNumber(column, row);
        this.push({
          id: `straight:${value}`,
          type: BetType.STRAIGHT_UP,
          numbers: [value],
          x: column + CELL_HALF,
          y: row + CELL_HALF,
          hitWidth: CELL_HALF,
          hitHeight: CELL_HALF,
          label: String(value),
        });
      }
    }
  }

  /**
   * Zero, double-zero and the bets unique to them.
   *
   * European: one full-height zero cell, splits 0-1/0-2/0-3, trios 0-1-2 and
   * 0-2-3, and the first-four basket.
   * American: the cell is halved into 00 (top) and 0 (bottom), the basket
   * becomes the five-number 0-00-1-2-3, and the trios become 0-1-2 / 00-2-3.
   */
  private buildZeroFamily(): void {
    const isAmerican = this.wheelType === WheelType.AMERICAN;

    if (isAmerican) {
      this.push({
        id: 'straight:00',
        type: BetType.STRAIGHT_UP,
        numbers: ['00'],
        x: -CELL_HALF,
        y: 0.75,
        hitWidth: CELL_HALF,
        hitHeight: 0.75,
        label: '00',
      });
      this.push({
        id: 'straight:0',
        type: BetType.STRAIGHT_UP,
        numbers: [0],
        x: -CELL_HALF,
        y: 2.25,
        hitWidth: CELL_HALF,
        hitHeight: 0.75,
        label: '0',
      });
      // Five-number bet - the worst wager on the table, and the only one whose
      // house edge differs from the rest of an American layout.
      this.push({
        id: 'basket:0-00-1-2-3',
        type: BetType.BASKET,
        numbers: [0, '00', 1, 2, 3],
        x: 0,
        y: 0,
        hitWidth: BOARD.POINT_HIT_RADIUS,
        hitHeight: BOARD.POINT_HIT_RADIUS,
        label: '0/00/1/2/3',
      });
      this.push({
        id: 'trio:00-2-3',
        type: BetType.TRIO,
        numbers: ['00', 2, 3],
        x: 0,
        y: 1,
        hitWidth: BOARD.POINT_HIT_RADIUS,
        hitHeight: BOARD.POINT_HIT_RADIUS,
        label: '00/2/3',
      });
      this.push({
        id: 'trio:0-1-2',
        type: BetType.TRIO,
        numbers: [0, 1, 2],
        x: 0,
        y: 2,
        hitWidth: BOARD.POINT_HIT_RADIUS,
        hitHeight: BOARD.POINT_HIT_RADIUS,
        label: '0/1/2',
      });
      // Zero splits follow the halved cell: 00 borders 3 and 2, 0 borders 2/1.
      this.pushSplit(['00', 3], 0, 0.5);
      this.pushSplit([0, 1], 0, 2.5);
      return;
    }

    this.push({
      id: 'straight:0',
      type: BetType.STRAIGHT_UP,
      numbers: [0],
      x: -CELL_HALF,
      y: 1.5,
      hitWidth: CELL_HALF,
      hitHeight: 1.5,
      label: '0',
    });

    // 0-3, 0-2, 0-1 splits sit on the shared edge at x = 0.
    for (let row = 0; row < BOARD.ROWS; row += 1) {
      this.pushSplit([0, gridNumber(0, row)], 0, row + CELL_HALF);
    }

    this.push({
      id: 'trio:0-2-3',
      type: BetType.TRIO,
      numbers: [0, 2, 3],
      x: 0,
      y: 1,
      hitWidth: BOARD.POINT_HIT_RADIUS,
      hitHeight: BOARD.POINT_HIT_RADIUS,
      label: '0/2/3',
    });
    this.push({
      id: 'trio:0-1-2',
      type: BetType.TRIO,
      numbers: [0, 1, 2],
      x: 0,
      y: 2,
      hitWidth: BOARD.POINT_HIT_RADIUS,
      hitHeight: BOARD.POINT_HIT_RADIUS,
      label: '0/1/2',
    });
    this.push({
      id: 'basket:0-1-2-3',
      type: BetType.BASKET,
      numbers: [0, 1, 2, 3],
      x: 0,
      y: 0,
      hitWidth: BOARD.POINT_HIT_RADIUS,
      hitHeight: BOARD.POINT_HIT_RADIUS,
      label: '0/1/2/3',
    });
  }

  /** Splits between orthogonally adjacent cells inside the number grid. */
  private buildSplits(): void {
    for (let column = 0; column < BOARD.COLUMNS; column += 1) {
      for (let row = 0; row < BOARD.ROWS; row += 1) {
        // Vertical neighbour (same column, row below).
        if (row < BOARD.ROWS - 1) {
          this.pushSplit(
            [gridNumber(column, row), gridNumber(column, row + 1)],
            column + CELL_HALF,
            row + 1,
          );
        }
        // Horizontal neighbour (next column, same row).
        if (column < BOARD.COLUMNS - 1) {
          this.pushSplit(
            [gridNumber(column, row), gridNumber(column + 1, row)],
            column + 1,
            row + CELL_HALF,
          );
        }
      }
    }
  }

  /** A street is the three numbers of one grid column, played on its bottom edge. */
  private buildStreets(): void {
    for (let column = 0; column < BOARD.COLUMNS; column += 1) {
      const numbers = [gridNumber(column, 0), gridNumber(column, 1), gridNumber(column, 2)];
      this.push({
        id: `street:${numbers[2]}`,
        type: BetType.STREET,
        numbers,
        x: column + CELL_HALF,
        y: BOARD.DOZEN_TOP,
        hitWidth: BOARD.POINT_HIT_RADIUS,
        hitHeight: BOARD.POINT_HIT_RADIUS,
        label: `${numbers[2]}-${numbers[0]}`,
      });
    }
  }

  /** Corners live on every interior grid vertex. */
  private buildCorners(): void {
    for (let column = 0; column < BOARD.COLUMNS - 1; column += 1) {
      for (let row = 0; row < BOARD.ROWS - 1; row += 1) {
        const numbers = [
          gridNumber(column, row),
          gridNumber(column + 1, row),
          gridNumber(column, row + 1),
          gridNumber(column + 1, row + 1),
        ].sort((a, b) => a - b);

        this.push({
          id: `corner:${numbers.join('-')}`,
          type: BetType.CORNER,
          numbers,
          x: column + 1,
          y: row + 1,
          hitWidth: BOARD.POINT_HIT_RADIUS,
          hitHeight: BOARD.POINT_HIT_RADIUS,
          label: numbers.join('/'),
        });
      }
    }
  }

  /** Six lines straddle two adjacent streets on the bottom edge. */
  private buildSixLines(): void {
    for (let column = 0; column < BOARD.COLUMNS - 1; column += 1) {
      const numbers: number[] = [];
      for (let c = column; c <= column + 1; c += 1) {
        for (let row = 0; row < BOARD.ROWS; row += 1) numbers.push(gridNumber(c, row));
      }
      numbers.sort((a, b) => a - b);

      this.push({
        id: `sixline:${numbers[0]}`,
        type: BetType.SIX_LINE,
        numbers,
        x: column + 1,
        y: BOARD.DOZEN_TOP,
        hitWidth: BOARD.POINT_HIT_RADIUS,
        hitHeight: BOARD.POINT_HIT_RADIUS,
        label: `${numbers[0]}-${numbers[numbers.length - 1]}`,
      });
    }
  }

  /** The three "2 to 1" strips to the right of the grid. */
  private buildColumns(): void {
    for (let row = 0; row < BOARD.ROWS; row += 1) {
      const numbers: number[] = [];
      for (let column = 0; column < BOARD.COLUMNS; column += 1) {
        numbers.push(gridNumber(column, row));
      }
      this.push({
        id: `column:${3 - row}`,
        type: BetType.COLUMN,
        numbers,
        x: BOARD.COLUMNS + CELL_HALF,
        y: row + CELL_HALF,
        hitWidth: CELL_HALF,
        hitHeight: CELL_HALF,
        label: '2 to 1',
      });
    }
  }

  private buildDozens(): void {
    const labels = ['label.dozen1', 'label.dozen2', 'label.dozen3'];
    for (let dozen = 0; dozen < 3; dozen += 1) {
      const numbers: number[] = [];
      for (let n = dozen * 12 + 1; n <= dozen * 12 + 12; n += 1) numbers.push(n);

      this.push({
        id: `dozen:${dozen + 1}`,
        type: BetType.DOZEN,
        numbers,
        x: dozen * 4 + 2,
        y: BOARD.DOZEN_TOP + CELL_HALF,
        hitWidth: 2,
        hitHeight: CELL_HALF,
        label: labels[dozen],
      });
    }
  }

  /** Low / Even / Red / Black / Odd / High, each two cells wide. */
  private buildOutsideBets(): void {
    const evens: Array<{ id: string; type: BetType; label: string; match: (n: number) => boolean }> =
      [
        { id: 'low', type: BetType.LOW, label: 'label.low', match: (n) => n >= 1 && n <= 18 },
        { id: 'even', type: BetType.EVEN, label: 'label.even', match: (n) => n % 2 === 0 },
        {
          id: 'red',
          type: BetType.RED,
          label: 'label.red',
          match: (n) => RED_NUMBERS.has(n),
        },
        {
          id: 'black',
          type: BetType.BLACK,
          label: 'label.black',
          match: (n) => !RED_NUMBERS.has(n),
        },
        { id: 'odd', type: BetType.ODD, label: 'label.odd', match: (n) => n % 2 === 1 },
        { id: 'high', type: BetType.HIGH, label: 'label.high', match: (n) => n >= 19 && n <= 36 },
      ];

    evens.forEach((definition, index) => {
      const numbers: number[] = [];
      for (let n = 1; n <= 36; n += 1) if (definition.match(n)) numbers.push(n);

      this.push({
        id: definition.id,
        type: definition.type,
        numbers,
        x: index * 2 + 1,
        y: BOARD.OUTSIDE_TOP + CELL_HALF,
        hitWidth: 1,
        hitHeight: CELL_HALF,
        label: definition.label,
      });
    });
  }

  /* --------------------------------------------------------------------- */
  /* Helpers                                                               */
  /* --------------------------------------------------------------------- */

  private pushSplit(numbers: RouletteNumber[], x: number, y: number): void {
    this.push({
      id: `split:${numbers.join('-')}`,
      type: BetType.SPLIT,
      numbers,
      x,
      y,
      hitWidth: BOARD.POINT_HIT_RADIUS,
      hitHeight: BOARD.POINT_HIT_RADIUS,
      label: numbers.join('/'),
    });
  }

  private push(spot: BetSpot): void {
    this.spots.push(spot);
  }
}
