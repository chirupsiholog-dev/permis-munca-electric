/**
 * The permit illustration on the home screen: a sheet of paper sitting behind
 * a brand-coloured base with a chevron notch. Built from divs (as in the
 * design) rather than an SVG so it inherits the theme colours.
 */
export default function PermitIcon() {
  return (
    <div className="relative flex h-[76px] w-[68px] items-end justify-center bg-surface-mute">
      {/* sheet */}
      <div className="z-10 mb-2.5 flex h-14 w-11 flex-col gap-1 border border-line-strong bg-surface px-2 pt-[9px]">
        <span className="h-0.5 bg-ink-100" />
        <span className="h-0.5 bg-ink-100" />
        <span className="h-0.5 w-[70%] bg-ink-100" />
      </div>

      {/* base bar */}
      <div className="absolute bottom-0 left-0 h-[26px] w-[68px] bg-brand" />
      {/* chevron notch, drawn with borders */}
      <div
        className="absolute bottom-0 left-0 h-0 w-0"
        style={{
          borderLeft: '34px solid transparent',
          borderRight: '34px solid transparent',
          borderBottom: '26px solid var(--color-brand-soft)',
        }}
      />
    </div>
  )
}
