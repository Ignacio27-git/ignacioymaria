import { cx } from "./cx";

export function Masthead({
  title,
  count,
  as: Heading = "h1",
  className,
}: {
  title: string;
  count?: number;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cx("flex items-baseline gap-3", className)}>
      <Heading className="font-condensed text-masthead tracking-tight">
        {title}
      </Heading>
      {count !== undefined && (
        <span className="text-2xl font-semibold tabular-nums text-ink-muted">
          {count}
        </span>
      )}
    </div>
  );
}
