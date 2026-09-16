export function scrollBelowStickyHeader(element, extraOffset = 12) {
  if (!element) return;

  const stickyHeader = document.querySelector(".sticky.top-0.z-40");
  const headerOffset = stickyHeader
    ? stickyHeader.getBoundingClientRect().height
    : 0;
  const targetTop =
    element.getBoundingClientRect().top +
    window.scrollY -
    headerOffset -
    extraOffset;

  window.scrollTo({ top: targetTop, behavior: "smooth" });
}
