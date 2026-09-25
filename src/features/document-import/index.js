export { ACCEPTED_FILES, parseDocument } from './lib/documentParsers.js'
export { validateBookFile, validateFileDescriptor, MAX_FILE_SIZE, SUPPORTED_EXTENSIONS } from './lib/fileValidation.js'
export {
  createManifest,
  addUnit,
  markQueued,
  markProcessing,
  markReady,
  markFailed,
  markCancelled,
  requeueUnit,
  getUnitById,
  getUnitsByStatus,
  getFirstReadyUnit,
  manifestProgress,
  UnitStatus,
  JobPriority,
} from './lib/documentManifest.js'
export { createImportScheduler, getConcurrency } from './lib/importScheduler.js'
export {
  progressivePdfImport,
  progressiveEpubImport,
  progressiveTextImport,
} from './lib/importCoordinator.js'
export { scanPdfViaBackend, isBackendFallbackError } from './lib/backendOcrFallback.js'
export { useDocumentImport } from './hooks/useDocumentImport.js'
