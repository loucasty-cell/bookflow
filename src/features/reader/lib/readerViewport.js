const DEFAULT_SAFE_PADDING = 24
const DEFAULT_FOCUS_RATIO = 0.25

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function getReaderSafeViewport(
  scrollContainer,
  selectedElement,
  bottomOverlay,
  safePadding = DEFAULT_SAFE_PADDING,
) {
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
}) {
  const usableHeight = Math.max(1, visibleBottom - visibleTop)
  const selectedHeight = Math.max(0, selectedBottom - selectedTop)
  const isLarge = selectedHeight > usableHeight
  const fullyVisible =
    selectedTop >= visibleTop && selectedBottom <= visibleBottom
  const preferredTop = visibleTop + usableHeight * focusRatio
  const latestFittingTop = visibleBottom - selectedHeight
  const desiredTop = isLarge
    ? visibleTop
    : clamp(preferredTop, visibleTop, Math.max(visibleTop, latestFittingTop))
  const focusBandTop = visibleTop + usableHeight * 0.16
  const focusBandBottom = visibleTop + usableHeight * 0.36
  const alreadyInFocusZone =
    fullyVisible && selectedTop >= focusBandTop && selectedTop <= focusBandBottom
  const unclampedTarget = containerScrollTop + selectedTop - desiredTop
  const targetScrollTop = clamp(unclampedTarget, 0, maximumScrollTop)

  return {
    isLarge,
    fullyVisible,
    shouldScroll:
      !alreadyInFocusZone &&
      Math.abs(targetScrollTop - containerScrollTop) > 1,
    targetScrollTop,
  }
}

export function ensureSelectedSegmentVisible(
  selectedElement,
  scrollContainer,
  bottomOverlay,
) {
  const selectedRect = selectedElement.getBoundingClientRect()
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
    selectedTop: selectedRect.top,
    selectedBottom: selectedRect.bottom,
    visibleTop: viewport.visibleTop,
    visibleBottom: viewport.visibleBottom,
  })

  return { ...viewport, ...alignment }
}
