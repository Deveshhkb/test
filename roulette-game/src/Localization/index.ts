import { LocaleStrings } from '../Types';

/**
 * Localisation registry.
 *
 * Keys are dot-namespaced and resolved through {@link Localization.t}, which
 * falls back to English and finally to the key itself - a missing translation
 * degrades to a readable label rather than an empty button.
 */

export const EN: LocaleStrings = {
  'app.title': 'Roulette',
  'loading.title': 'Roulette',
  'loading.text': 'Loading',

  'state.waiting': 'Waiting for next round',
  'state.bettingOpen': 'Place your bets',
  'state.lastCall': 'Last call',
  'state.bettingClosed': 'No more bets',
  'state.spinning': 'Spinning',
  'state.ballRolling': 'Ball rolling',
  'state.result': 'Round complete',

  'action.undo': 'Undo',
  'action.repeat': 'Repeat',
  'action.double': 'Double',
  'action.clear': 'Clear',
  'action.spin': 'Spin',
  'action.specialBets': 'Special Bets',
  'action.clearBets': 'Clear Bets',

  'label.balance': 'Balance',
  'label.cash': 'Cash',
  'label.stake': 'Bet',
  'label.totalBet': 'Total Bet',
  'label.lastWin': 'Last Win',
  'label.winner': 'Winner',
  'label.history': 'Last Numbers',
  'label.statistics': 'Statistics',
  'label.hot': 'Hot',
  'label.cold': 'Cold',
  'label.red': 'Red',
  'label.black': 'Black',
  'label.odd': 'Odd',
  'label.even': 'Even',
  'label.low': '1-18',
  'label.high': '19-36',
  'label.dozen1': '1st 12',
  'label.dozen2': '2nd 12',
  'label.dozen3': '3rd 12',
  'result.high': 'High',
  'result.low': 'Low',
  'result.odd': 'Odd',
  'result.even': 'Even',
  'result.noWin': 'No Win',
  'result.youWin': 'You Win',
  'label.column': '2 to 1',
  'label.chips': 'Chips',
  'label.minMax': 'Min {min} / Max {max}',

  'result.win': 'You win {amount}',
  'result.lose': 'No win this round',

  'error.betTooSmall': 'Below the minimum for this bet',
  'error.betTooLarge': 'Table limit reached for this bet',
  'error.tableLimit': 'Total table limit reached',
  'error.insufficientFunds': 'Insufficient balance',
  'error.bettingClosed': 'Betting is closed',
  'error.noPreviousBets': 'No previous bets to repeat',
};

export const ES: LocaleStrings = {
  ...EN,
  'state.waiting': 'Esperando la siguiente ronda',
  'state.bettingOpen': 'Hagan sus apuestas',
  'state.lastCall': 'Ultima llamada',
  'state.bettingClosed': 'No va mas',
  'state.spinning': 'Girando',
  'action.undo': 'Deshacer',
  'action.repeat': 'Repetir',
  'action.double': 'Doblar',
  'action.clear': 'Limpiar',
  'label.balance': 'Saldo',
  'label.totalBet': 'Apuesta Total',
  'label.lastWin': 'Ultimo Premio',
  'label.winner': 'Ganador',
  'label.history': 'Ultimos Numeros',
  'label.statistics': 'Estadisticas',
  'label.red': 'Rojo',
  'label.black': 'Negro',
  'label.odd': 'Impar',
  'label.even': 'Par',
};

export const HI: LocaleStrings = {
  ...EN,
  'state.bettingOpen': 'Apni baazi lagaayein',
  'state.bettingClosed': 'Ab aur baazi nahin',
  'action.undo': 'Wapas',
  'action.repeat': 'Dohraayein',
  'action.double': 'Dugna',
  'action.clear': 'Hataayein',
  'label.balance': 'Balance',
  'label.totalBet': 'Kul Baazi',
  'label.lastWin': 'Pichhli Jeet',
  'label.winner': 'Vijeta',
};

/**
 * Indonesian - the locale the reference client ships in, kept here so the
 * layout can be checked against it directly.
 */
export const ID: LocaleStrings = {
  ...EN,
  'state.bettingOpen': 'Pasang taruhan Anda',
  'state.bettingClosed': 'Tidak ada taruhan lagi',
  'action.spin': 'Putar',
  'action.specialBets': 'Bet Spesial',
  'action.clearBets': 'Kosongkan Taruhan',
  'label.cash': 'Tunai',
  'label.stake': 'Taruhan',
  'label.dozen1': '12 pertama',
  'label.dozen2': '12 kedua',
  'label.dozen3': '12 ketiga',
  'label.red': 'Merah',
  'label.black': 'Hitam',
  'label.odd': 'Ganjil',
  'label.even': 'Genap',
  'result.high': 'Tinggi',
  'result.low': 'Rendah',
  'result.odd': 'Ganjil',
  'result.even': 'Genap',
  'result.noWin': 'Tidak Menang',
  'result.youWin': 'Anda Menang',
};

const LOCALES: Record<string, LocaleStrings> = { en: EN, es: ES, hi: HI, id: ID };

/**
 * Runtime string resolver. Instantiated once by `Game` and injected into every
 * view that renders text; views re-read their labels on LANGUAGE_CHANGE.
 */
export class Localization {
  private strings: LocaleStrings = EN;
  private current = 'en';

  public constructor(language = 'en') {
    this.setLanguage(language);
  }

  /** Register or replace a locale at runtime (operator-supplied bundles). */
  public static register(language: string, strings: LocaleStrings): void {
    LOCALES[language] = { ...EN, ...strings };
  }

  public static available(): string[] {
    return Object.keys(LOCALES);
  }

  public setLanguage(language: string): boolean {
    const resolved = LOCALES[language];
    if (!resolved) return false;
    this.strings = resolved;
    this.current = language;
    return true;
  }

  public getLanguage(): string {
    return this.current;
  }

  /**
   * Resolve `key`, substituting `{placeholder}` tokens from `params`.
   * Unknown keys return the key itself so missing copy is obvious in QA but
   * never renders as a blank control.
   */
  public t(key: string, params?: Record<string, string | number>): string {
    const template = this.strings[key] ?? EN[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, token: string) =>
      token in params ? String(params[token]) : match,
    );
  }
}
