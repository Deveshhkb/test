/**
 * OptionPulse wordmark - an original mark drawn inline: a compact strike-ladder
 * glyph whose middle bar pulses, referencing the option chain the product is
 * built around.
 */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="wordmark">
      <svg
        className="wordmark__mark"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="2" y="9" width="3.4" height="6" rx="1.2" fill="currentColor" opacity="0.45" />
        <rect x="7" y="5" width="3.4" height="14" rx="1.2" fill="currentColor" opacity="0.7" />
        <rect x="12" y="2.5" width="3.4" height="19" rx="1.2" fill="currentColor" />
        <rect
          x="17"
          y="7"
          width="3.4"
          height="10"
          rx="1.2"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
      {!compact && (
        <span className="wordmark__text">
          <strong>Option</strong>
          <span>Pulse</span>
        </span>
      )}
    </span>
  );
}
