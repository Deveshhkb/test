interface ControlsProps {
  canDraw: boolean;
  debugEnabled: boolean;
  onDraw: () => void;
  onReset: () => void;
  onToggleDebug: () => void;
}

export default function Controls({
  canDraw,
  debugEnabled,
  onDraw,
  onReset,
  onToggleDebug,
}: ControlsProps) {
  return (
    <div className="controls">
      <button className="controls__button controls__button--primary" onClick={onDraw} disabled={!canDraw}>
        {canDraw ? 'Mulai Undian' : 'Mengundi…'}
      </button>
      <button className="controls__button" onClick={onReset}>
        Isi Ulang
      </button>
      <button
        className={`controls__button ${debugEnabled ? 'controls__button--active' : ''}`}
        onClick={onToggleDebug}
      >
        Debug
      </button>
      <span className="controls__hint">Space / klik untuk mengundi · D debug · R isi ulang</span>
    </div>
  );
}
