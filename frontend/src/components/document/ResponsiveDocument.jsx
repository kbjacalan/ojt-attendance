import { useLayoutEffect, useRef, useState } from "react";

/**
 * Wraps a fixed-width, print-style document (e.g. the DTR form) and scales
 * it down uniformly to fit narrow screens — the same trick Google Docs uses
 * on mobile: the page keeps its exact layout, font sizes, and proportions,
 * it's just rendered smaller as a whole instead of reflowing.
 *
 * - On screens wide enough to fit the document at 1:1, no scaling happens.
 * - The outer wrapper's height is kept in sync with the *scaled* height so
 *   it never leaves extra blank space (or clips content) below the page.
 * - Scaling is always disabled when printing, so printed output is
 *   unaffected.
 */
export default function ResponsiveDocument({
  children,
  designWidth = 768, // px — the document's true, unscaled width
  className = "",
}) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(null);

  useLayoutEffect(() => {
    function recalc() {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;

      const availableWidth = outer.clientWidth;
      const nextScale = Math.min(1, availableWidth / designWidth);
      const naturalHeight = inner.offsetHeight;

      setScale(nextScale);
      setScaledHeight(naturalHeight * nextScale);
    }

    recalc();

    const ro = new ResizeObserver(recalc);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", recalc);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [designWidth, children]);

  return (
    <div
      ref={outerRef}
      className={`w-full overflow-hidden print:!h-auto print:overflow-visible ${className}`}
      style={scaledHeight != null ? { height: scaledHeight } : undefined}
    >
      <div
        ref={innerRef}
        className="print:!transform-none"
        style={{
          width: designWidth,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
