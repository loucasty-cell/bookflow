import { FOCUS_RAIL_RATIO } from "./readingController.js"

const DEFAULT_SAFE_PADDING = 24
const DEFAULT_FOCUS_RATIO = FOCUS_RAIL_RATIO

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function getReaderSafeViewport(
  scrollContainer,
  selectedElement,
  bottomOverlay,
  safePadding = DEFAULT_SAFE_PADDING,
) {
  if (!scrollContainer || !selectedElement) return null;
  const containerRect = scrollContainer.getBoundingClientRect()
  const selectedRect = selectedElement.getBoundingClientRect()
  let safeBottom = safePadding

  if (bottomOverlay) {
    const overlayRect = bottomOverlay.getBoundingClientRect()
    const overlapsHorizontally =
      overlayRect.left < selectedRect.right && overlayRect.right > selectedRect.left
    const overlapsContainer =
      overlayRect.top < containerRect.bottom && overlayRect.bottom > containerRect.top

    if (overlapsHorizontally && overlapsContainer) {
      safeBottom = Math.max(
        safeBottom,
        containerRect.bottom - overlayRect.top + safePadding,
      )
    }
  }

  const visibleTop = containerRect.top + safePadding
  const visibleBottom = Math.max(
    visibleTop + 1,
    containerRect.bottom - safeBottom,
  )

  return {
    safeTop: safePadding,
    safeBottom,
    visibleTop,
    visibleBottom,
    usableHeight: visibleBottom - visibleTop,
  }
}

export function getSelectedSegmentAlignment({
  containerScrollTop,
  maximumScrollTop,
  selectedTop,
  selectedBottom,
  visibleTop,
  visibleBottom,
  focusRatio = DEFAULT_FOCUS_RATIO,
  containerTop = 0,
  preserveLargePosition = false,
}) {
  const originTop = Number.isFinite(Number(containerTop)) ? Number(containerTop) : 0
  const relativeSelectedTop = selectedTop - originTop
  const relativeSelectedBottom = selectedBottom - originTop
  const relativeVisibleTop = visibleTop - originTop
  const relativeVisibleBottom = visibleBottom - originTop
  const usableHeight = Math.max(1, relativeVisibleBottom - relativeVisibleTop)
  const selectedHeight = Math.max(0, relativeSelectedBottom - relativeSelectedTop)
  const isLarge = selectedHeight > usableHeight
  const fullyVisible =
    relativeSelectedTop >= relativeVisibleTop &&
    relativeSelectedBottom <= relativeVisibleBottom
  const railY = relativeVisibleTop + usableHeight * focusRatio
  const latestFittingTop = relativeVisibleBottom - selectedHeight
  const desiredTop = isLarge
    ? relativeVisibleTop
    : clamp(
        railY - selectedHeight / 2,
        relativeVisibleTop,
        Math.max(relativeVisibleTop, latestFittingTop),
      )
  const focusBandTop = relativeVisibleTop + usableHeight * 0.16
  const focusBandBottom = relativeVisibleTop + usableHeight * 0.36
  const intersectsViewport =
    relativeSelectedTop < relativeVisibleBottom &&
    relativeSelectedBottom > relativeVisibleTop
  const alreadyInFocusZone =
    fullyVisible &&
    relativeSelectedTop >= focusBandTop &&
    relativeSelectedTop <= focusBandBottom
  const preserveLarge =
    preserveLargePosition && isLarge && intersectsViewport
  const unclampedTarget =
    containerScrollTop + relativeSelectedTop - desiredTop
  const targetScrollTop = preserveLarge
    ? containerScrollTop
    : clamp(unclampedTarget, 0, maximumScrollTop)

  return {
    isLarge,
    fullyVisible,
    shouldScroll:
      !preserveLarge &&
      !alreadyInFocusZone &&
      Math.abs(targetScrollTop - containerScrollTop) > 1,
    targetScrollTop,
  }
}

export function ensureSelectedSegmentVisible(
  selectedElement,
  scrollContainer,
  bottomOverlay,
  options = {},
) {
  const selectedRect = selectedElement.getBoundingClientRect()
  const containerRect = scrollContainer.getBoundingClientRect()
  const viewport = getReaderSafeViewport(
    scrollContainer,
    selectedElement,
    bottomOverlay,
  )
  const alignment = getSelectedSegmentAlignment({
    containerScrollTop: scrollContainer.scrollTop,
    maximumScrollTop: Math.max(
      0,
      scrollContainer.scrollHeight - scrollContainer.clientHeight,
    ),
    selectedTop: selectedRect.top - containerRect.top,
    selectedBottom: selectedRect.bottom - containerRect.top,
    visibleTop: viewport.visibleTop - containerRect.top,
    visibleBottom: viewport.visibleBottom - containerRect.top,
    preserveLargePosition: options?.preserveLargePosition === true,
  })

  return { ...viewport, ...alignment }
}
