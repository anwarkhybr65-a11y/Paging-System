"use client";

function polar(cx, cy, radius, angleDeg) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function slicePath(cx, cy, radius, startAngle, endAngle) {
  const start = polar(cx, cy, radius, endAngle);
  const end = polar(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${end.x} ${end.y} A ${radius} ${radius} 0 ${largeArc} 1 ${start.x} ${start.y} Z`;
}

const SLICES = [
  { key: "entered", label: "دخلوا العيادة", color: "#347ea0" },
  { key: "notEntered", label: "لم يدخلوا العيادة", color: "#d97706" },
];

export function StatsPieChart({ stats, size = 180, title }) {
  const total = stats?.total || 0;
  const cx = 100;
  const cy = 100;
  const radius = 90;
  let angle = 0;
  const paths = SLICES.map((slice) => {
    const value = Number(stats?.[slice.key]) || 0;
    const portion = total > 0 ? value / total : 0;
    const startAngle = angle;
    const endAngle = angle + portion * 360;
    angle = endAngle;
    return { ...slice, value, startAngle, endAngle, full: portion === 1 };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      {title ? <p className="text-sm font-bold text-ink">{title}</p> : null}
      <svg width={size} height={size} viewBox="0 0 200 200" className="shrink-0" aria-label={title || "رسم بياني دائري"}>
        <circle cx={cx} cy={cy} r={radius} fill="#e6f1f7" />
        {total > 0
          ? paths.map((slice) =>
              slice.value <= 0 ? null : slice.full ? (
                <circle key={slice.key} cx={cx} cy={cy} r={radius} fill={slice.color} />
              ) : (
                <path
                  key={slice.key}
                  d={slicePath(cx, cy, radius, slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                />
              ),
            )
          : null}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#ffffff" strokeWidth="2" />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-ink" style={{ fontSize: 18, fontWeight: 900 }}>
          {total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="fill-warm" style={{ fontSize: 11, fontWeight: 700 }}>
          الإجمالي
        </text>
      </svg>
      <ul className="space-y-1 text-sm">
        {paths.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2 text-warm">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: slice.color }} />
            <span>
              {slice.label}: <b className="text-ink">{slice.value}</b>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
