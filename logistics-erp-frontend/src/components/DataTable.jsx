import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { EmptyState, LoadState, ErrorState } from './ui'

export default function DataTable({
  columns, rows, loading, error, search, onSearch, searchPlaceholder = 'Search…',
  page, totalPages, onPage, onCreate, createLabel = 'Add new', emptyTitle = 'Nothing logged yet',
  emptyDescription, onRowClick,
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-line">
        {onSearch && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-steel-light absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="input-field pl-9"
            />
          </div>
        )}
        {onCreate && (
          <button onClick={onCreate} className="btn-accent rounded px-3 py-2 text-sm flex items-center gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> {createLabel}
          </button>
        )}
      </div>

      {loading && <LoadState />}
      {!loading && error && <div className="p-4"><ErrorState message={error} /></div>}

      {!loading && !error && rows.length === 0 && (
        <div className="p-4">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-2/60">
                  {columns.map((c) => (
                    <th key={c.key} className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-steel whitespace-nowrap">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row._id || i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`border-b border-line last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-paper-2/50' : ''}`}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-2.5 align-middle whitespace-nowrap">
                        {c.render ? c.render(row) : row[c.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {onPage && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-line text-sm text-steel">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => onPage(page - 1)}
                  className="p-1.5 rounded border border-line disabled:opacity-40 hover:bg-paper-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => onPage(page + 1)}
                  className="p-1.5 rounded border border-line disabled:opacity-40 hover:bg-paper-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
