import { useState } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, flexRender,
} from '@tanstack/react-table';
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Download,
} from 'lucide-react';
import { cn } from '../../utils/cn.js';
import * as XLSX from 'xlsx';

/**
 * Universal DataTable powered by TanStack Table v8.
 *
 * Props:
 *   columns        — TanStack column defs
 *   data           — row data array
 *   isLoading      — show skeleton
 *   searchable     — show search bar (default true)
 *   exportable     — show export button (default true)
 *   exportFileName — xlsx filename
 *   pageSize       — rows per page (default 50)
 *   emptyIcon      — Lucide icon for empty state
 *   emptyTitle     — empty state heading
 *   emptyMessage   — empty state body
 *   emptyAction    — { label, onClick } CTA button
 *   toolbar        — extra JSX right of search (filters, buttons)
 */
export default function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  searchable = true,
  exportable = true,
  exportFileName = 'export',
  pageSize = 50,
  emptyIcon: EmptyIcon,
  emptyTitle = 'No records found',
  emptyMessage = 'Nothing to display here yet.',
  emptyAction,
  toolbar,
  className,
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const handleExport = () => {
    const rows = table.getFilteredRowModel().rows;
    const exportData = rows.map(row =>
      Object.fromEntries(
        row.getVisibleCells().map(cell => [
          typeof cell.column.columnDef.header === 'string'
            ? cell.column.columnDef.header
            : cell.column.id,
          cell.getValue(),
        ])
      )
    );
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${exportFileName}.xlsx`);
  };

  const { pageIndex, pageSize: currentPageSize } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const from = total === 0 ? 0 : pageIndex * currentPageSize + 1;
  const to = Math.min((pageIndex + 1) * currentPageSize, total);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      {(searchable || exportable || toolbar) && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
          {searchable && (
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="search"
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                placeholder="Search..."
                className="input-base pl-9 h-9 text-sm"
              />
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {toolbar}
            {exportable && (
              <button
                onClick={handleExport}
                className="btn-secondary h-9 px-3 text-xs"
                aria-label="Export to Excel"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-border bg-surface-muted/60">
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap select-none',
                      header.column.getCanSort() && 'cursor-pointer hover:text-text-primary transition-colors'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1.5">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-text-muted/60">
                          {header.column.getIsSorted() === 'asc'
                            ? <ChevronUp className="w-3.5 h-3.5" />
                            : header.column.getIsSorted() === 'desc'
                            ? <ChevronDown className="w-3.5 h-3.5" />
                            : <ChevronsUpDown className="w-3.5 h-3.5" />}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div
                        className="h-4 bg-surface-hover rounded"
                        style={{ width: `${50 + (i * 13 + j * 7) % 40}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 max-w-xs mx-auto">
                    {EmptyIcon && (
                      <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center">
                        <EmptyIcon className="w-7 h-7 text-text-muted" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-text-primary">{emptyTitle}</p>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">{emptyMessage}</p>
                    </div>
                    {emptyAction && (
                      <button
                        onClick={emptyAction.onClick}
                        className="btn-primary text-xs h-8 px-4 mt-1"
                      >
                        {emptyAction.label}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-surface-muted/40 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 text-text-primary">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────────── */}
      {!isLoading && total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-text-secondary flex-wrap gap-2">
          <span>
            Showing{' '}
            <span className="font-semibold text-text-primary">{from}–{to}</span>
            {' '}of{' '}
            <span className="font-semibold text-text-primary">{total}</span>
          </span>

          <div className="flex items-center gap-1">
            <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="btn-ghost w-7 h-7 p-0 disabled:opacity-30" aria-label="First">
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="btn-ghost w-7 h-7 p-0 disabled:opacity-30" aria-label="Previous">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 font-medium text-text-primary tabular-nums">
              {pageIndex + 1} / {table.getPageCount()}
            </span>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="btn-ghost w-7 h-7 p-0 disabled:opacity-30" aria-label="Next">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="btn-ghost w-7 h-7 p-0 disabled:opacity-30" aria-label="Last">
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>

            <select
              value={currentPageSize}
              onChange={e => table.setPageSize(Number(e.target.value))}
              className="ml-2 text-xs border border-border rounded-md px-1.5 py-1 bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              aria-label="Rows per page"
            >
              {[25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
