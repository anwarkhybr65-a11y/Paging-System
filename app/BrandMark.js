export function BrandMark({ size = "md", className = "" }) {
  const height = {
    sm: "h-11 sm:h-12",
    md: "h-14",
    lg: "h-24 sm:h-28",
  }[size];

  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${height} ${className}`}>
      <img src="/brand/ax-logo.png" alt="AX" className="h-full w-auto object-contain" />
    </span>
  );
}
