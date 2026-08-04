/**
 * Shared grid template for the archive table — the header row and the data rows
 * must stay perfectly aligned, so the definition lives in exactly one place.
 * Below 1000px the table scrolls horizontally rather than reflowing, which
 * keeps the two signature columns readable on narrow screens.
 */
export const GRID = {
  display: 'grid',
  gridTemplateColumns: '96px minmax(180px, 1.3fr) 160px minmax(140px, 1fr) minmax(150px, 1fr) 152px',
  gap: '16px',
  minWidth: '1000px',
}
