import { FOCUS_RAIL_RATIO } from "./readingController.js";

export function sectionAtFocusRail(reader) {
  if (!reader) return null;

  const bounds = reader.getBoundingClientRect();
  const anchorY = bounds.top + reader.clientHeight * FOCUS_RAIL_RATIO;
  const anchorX = bounds.left + bounds.width / 2;
  const element = document.elementFromPoint(anchorX, anchorY);
  const directSection = element?.closest?.(".reading-section");
  if (directSection && reader.contains(directSection)) return directSection;

  const sections = [...reader.querySelectorAll(".reading-section")];
  const containingSection = sections.find((section) => {
    const sectionBounds = section.getBoundingClientRect();
    return anchorY >= sectionBounds.top && anchorY <= sectionBounds.bottom;
  });
  if (containingSection) return containingSection;

  const firstSection = sections[0];
  if (
    firstSection &&
    anchorY < firstSection.getBoundingClientRect().top &&
    firstSection.dataset.focusEligible === "false"
  )
    return firstSection;

  return null;
}

export function staticRegionName(section) {
  const title = section?.querySelector("h2")?.textContent ?? "";
  return /appendix|bibliograph|references|glossary|index|credits|afterword|epilogue|about the author/i.test(
    title
  )
    ? "Reading the end matter"
    : "Reading the intro";
}
