import type { GridApi, SizeColumnsToContentStrategy } from 'ag-grid-community'

/**
 * Default autoSizeStrategy for AG Grid v32 to size columns according to cell contents
 * without stretching to fill the grid width.
 */
export const AG_GRID_AUTO_SIZE_STRATEGY: SizeColumnsToContentStrategy = {
  type: 'fitCellContents',
  skipHeader: false,
}

/**
 * Auto-sizes all displayed columns in AG Grid to fit their cell contents and headers.
 * Uses requestAnimationFrame to guarantee the DOM cells have rendered before measuring.
 * Does NOT stretch or expand columns across empty table width.
 *
 * @param api AG Grid GridApi instance
 * @param options.skipHeader If true, ignores header text when sizing. Default is false (headers included).
 * @param options.skipColumnIds Specific column IDs to exclude from auto-sizing.
 */
export function autoSizeGridColumns(
  api: GridApi | null | undefined,
  options?: {
    skipHeader?: boolean
    skipColumnIds?: string[]
  },
): void {
  if (!api || typeof api.getAllDisplayedColumns !== 'function') return

  requestAnimationFrame(() => {
    try {
      if (api.isDestroyed?.()) return

      const displayedCols = api.getAllDisplayedColumns()
      if (!displayedCols || displayedCols.length === 0) return

      const skipSet = new Set(options?.skipColumnIds ?? [])
      const colKeys = displayedCols
        .map((col) => col.getColId())
        .filter((id) => Boolean(id) && !skipSet.has(id))

      if (colKeys.length > 0) {
        // false means skipHeader = false, so header width is measured as well
        api.autoSizeColumns(colKeys, options?.skipHeader ?? false)
      }
    } catch {
      // Ignore error if grid destroyed during animation frame
    }
  })
}
