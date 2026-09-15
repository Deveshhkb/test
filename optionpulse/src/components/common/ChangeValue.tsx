import { directionOf, formatPercent, formatSigned } from "../../utils/format";

interface ChangeValueProps {
  change: number;
  changePercent: number;
  fractionDigits?: number;
}

/** Absolute and percentage change, coloured by direction. */
export function ChangeValue({ change, changePercent, fractionDigits = 2 }: ChangeValueProps) {
  const direction = directionOf(change);
  return (
    <span className={direction}>
      {formatSigned(change, fractionDigits)} ({formatPercent(changePercent)})
    </span>
  );
}
