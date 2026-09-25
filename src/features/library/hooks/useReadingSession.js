import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSafeStorage,
  safeParse,
  setStorageItem,
  wordCount,
} from '../../../shared/lib/index.js';
import { recordSession } from '../lib/libraryStore.js';
import { createSpeedTracker } from '../lib/readingSpeed.js';

const AWARDED_BADGES_KEY = 'bookflow:awarded-badges';
const MIN_RECORDED_WORDS = 20;
const MIN_RECAP_WORDS = 80;

function readAwardedBadges() {
  const stored = safeParse(getSafeStorage().getItem(AWARDED_BADGES_KEY), []);
  return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : [];
}

export function useReadingSession({
  book,
  bookId,
  progress,
  activeChapter,
  totalWords,
  activeParagraphId,
  focusId,
  paragraphMap,
  settings,
  notes,
  bookmarks,
}) {
  const [sessionRecap, setSessionRecap] = useState(null);
  const [awardedBadges, setAwardedBadges] = useState(readAwardedBadges);
  const metricsRef = useRef(null);

  const resetSessionMetrics = useCallback((bookTitle) => {
    metricsRef.current = {
      bookTitle,
      openedAt: Date.now(),
      tracker: createSpeedTracker(),
      wordsRead: 0,
      notesAdded: 0,
      bookmarksAdded: 0,
      lastParagraphId: '',
    };
  }, []);

  const awardBadges = useCallback((ids) => {
    setAwardedBadges((current) => {
      const merged = [...new Set([...current, ...ids])];
      setStorageItem(AWARDED_BADGES_KEY, merged);
      return merged;
    });
  }, []);

  const finalizeSession = useCallback(() => {
    const metrics = metricsRef.current;
    if (!metrics || !book) return;
    metricsRef.current = null;

    const wordsRead = metrics.wordsRead;
    const activeMs = metrics.tracker.getActiveMs();
    if (wordsRead < MIN_RECORDED_WORDS) return;

    recordSession({
      documentId: bookId,
      title: book.title,
      author: book.author,
      kind: book.kind,
      progress,
      activeChapter,
      totalChapters: book.chapters.length,
      totalWords,
      wordsRead,
      readingSeconds: Math.round(activeMs / 1000),
      notesCount: notes.length,
      bookmarksCount: bookmarks.length,
      activeParagraphId,
    });

    if (settings.showSessionRecap && wordsRead >= MIN_RECAP_WORDS) {
      setSessionRecap({
        bookTitle: book.title,
        wordsRead,
        activeMs,
        notesAdded: metrics.notesAdded,
        bookmarksAdded: metrics.bookmarksAdded,
        paceSamples: [],
      });
    }
  }, [
    book,
    bookId,
    progress,
    activeChapter,
    totalWords,
    notes,
    bookmarks,
    activeParagraphId,
    settings.showSessionRecap,
  ]);

  const finalizeSessionRef = useRef(finalizeSession);
  useEffect(() => {
    finalizeSessionRef.current = finalizeSession;
  }, [finalizeSession]);

  const sessionBookTitle = book?.title;
  useEffect(() => {
    if (!sessionBookTitle) return undefined;
    resetSessionMetrics(sessionBookTitle);
    return () => {
      finalizeSessionRef.current();
    };
  }, [sessionBookTitle, resetSessionMetrics]);

  useEffect(() => {
    if (!book) return;
    const metrics = metricsRef.current;
    if (!metrics || !focusId) return;

    const paragraph = paragraphMap.get(focusId);
    if (!paragraph) return;

    if (metrics.lastParagraphId !== focusId) {
      metrics.lastParagraphId = focusId;
      const words = wordCount(paragraph.text);
      metrics.tracker.advance(words);
      metrics.wordsRead += words;
    }
  }, [book, focusId, paragraphMap]);

  return {
    sessionRecap,
    setSessionRecap,
    awardedBadges,
    awardBadges,
    finalizeSession,
  };
}
