/**
 * Utility functions for executing bulk tab operations in chunks with progress reporting
 * to prevent browser UI freezes and event-loop starvation.
 */

const DEFAULT_CHUNK_SIZE = 20;
const YIELD_DELAY_MS = 16; // 1 animation frame equivalent

const yieldEventLoop = (ms = YIELD_DELAY_MS) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Removes tabs in chunked batches, notifying progress callback after each chunk.
 */
export async function batchRemoveTabs(
  tabIds: number[],
  onProgress?: (processed: number, total: number) => void,
  chunkSize = DEFAULT_CHUNK_SIZE
): Promise<void> {
  if (!tabIds || tabIds.length === 0) return;
  const total = tabIds.length;
  let processed = 0;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = tabIds.slice(i, i + chunkSize);
    try {
      await chrome.tabs.remove(chunk);
    } catch (err) {
      console.warn('batchRemoveTabs partial failure on chunk:', chunk, err);
    }
    processed += chunk.length;
    onProgress?.(Math.min(processed, total), total);
    if (processed < total) {
      await yieldEventLoop();
    }
  }
}

/**
 * Moves tabs to a target window/index in chunked batches with progress reporting.
 */
export async function batchMoveTabs(
  tabIds: number[],
  target: { windowId?: number; index?: number },
  onProgress?: (processed: number, total: number) => void,
  chunkSize = DEFAULT_CHUNK_SIZE
): Promise<void> {
  if (!tabIds || tabIds.length === 0) return;
  const total = tabIds.length;
  let processed = 0;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = tabIds.slice(i, i + chunkSize);
    try {
      await chrome.tabs.move(chunk, {
        windowId: target.windowId,
        index: target.index ?? -1
      });
    } catch (err) {
      console.warn('batchMoveTabs partial failure on chunk:', chunk, err);
    }
    processed += chunk.length;
    onProgress?.(Math.min(processed, total), total);
    if (processed < total) {
      await yieldEventLoop();
    }
  }
}

/**
 * Updates properties on tabs in batches with progress reporting.
 */
export async function batchUpdateTabs(
  tabIds: number[],
  updateProps: chrome.tabs.UpdateProperties,
  onProgress?: (processed: number, total: number) => void,
  chunkSize = DEFAULT_CHUNK_SIZE
): Promise<void> {
  if (!tabIds || tabIds.length === 0) return;
  const total = tabIds.length;
  let processed = 0;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = tabIds.slice(i, i + chunkSize);
    await Promise.allSettled(
      chunk.map(id => chrome.tabs.update(id, updateProps))
    );
    processed += chunk.length;
    onProgress?.(Math.min(processed, total), total);
    if (processed < total) {
      await yieldEventLoop();
    }
  }
}

/**
 * Discards background tabs in batches with progress reporting.
 */
export async function batchDiscardTabs(
  tabIds: number[],
  onProgress?: (processed: number, total: number) => void,
  chunkSize = DEFAULT_CHUNK_SIZE
): Promise<void> {
  if (!tabIds || tabIds.length === 0) return;
  const total = tabIds.length;
  let processed = 0;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = tabIds.slice(i, i + chunkSize);
    await Promise.allSettled(
      chunk.map(id => chrome.tabs.discard(id))
    );
    processed += chunk.length;
    onProgress?.(Math.min(processed, total), total);
    if (processed < total) {
      await yieldEventLoop();
    }
  }
}
