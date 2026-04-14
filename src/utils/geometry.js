/**
 * Geometry utilities for the Transit Stack canvas.
 *
 * These are pure functions with no React or DOM dependencies.
 * All coordinates are in SVG user units (CSS pixels at 96 DPI).
 */

/**
 * Compute the point on the edge of rectangle `r` that lies on the line
 * from `r`'s center toward point (tx, ty). Used for connection endpoints
 * so lines originate from the box edge rather than the center.
 *
 * @param {{ x: number, y: number, width: number, height: number }} r
 * @param {number} tx - target x
 * @param {number} ty - target y
 * @returns {{ x: number, y: number }}
 */
export function edgePt(r, tx, ty) {
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const dx = tx - cx;
  const dy = ty - cy;

  if (dx === 0 && dy === 0) {
    return { x: cx + r.width / 2, y: cy };
  }

  const sx = r.width / 2 / Math.abs(dx || 0.001);
  const sy = r.height / 2 / Math.abs(dy || 0.001);
  const s = Math.min(sx, sy);

  return { x: cx + dx * s, y: cy + dy * s };
}

/**
 * Check whether `inner` is fully contained within `outer`.
 * Used to determine whether a system belongs to a vendor.
 *
 * @param {{ x: number, y: number, width: number, height: number }} outer
 * @param {{ x: number, y: number, width: number, height: number }} inner
 * @returns {boolean}
 */
export function rectContains(outer, inner) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/**
 * Return the four connection port positions for a rectangular widget.
 * Ports are at the midpoint of each edge.
 *
 * @param {{ x: number, y: number, width: number, height: number }} s
 * @returns {Array<{ side: string, x: number, y: number }>}
 */
export function portPositions(s) {
  return [
    { side: "top", x: s.x + s.width / 2, y: s.y },
    { side: "right", x: s.x + s.width, y: s.y + s.height / 2 },
    { side: "bottom", x: s.x + s.width / 2, y: s.y + s.height },
    { side: "left", x: s.x, y: s.y + s.height / 2 },
  ];
}
