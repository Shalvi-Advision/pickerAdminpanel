export default function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  // Build page number list with gap markers
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      pages.push(i);
    }
  }
  const withGaps = [];
  let last = 0;
  for (const p of pages) {
    if (last && p - last > 1) withGaps.push("gap-" + p);
    withGaps.push(p);
    last = p;
  }

  const btn =
    "h-8 min-w-[32px] px-2 rounded-md text-sm font-medium transition-colors";
  const active = "bg-brand-600 text-white";
  const idle = "text-gray-600 hover:bg-gray-100";
  const disabled = "text-gray-300 cursor-not-allowed";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-3 border-t">
      <span className="text-sm text-gray-500 order-2 sm:order-1">
        Showing {start}–{end} of {total}
      </span>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Prev */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={`${btn} ${page === 1 ? disabled : idle} flex items-center gap-1`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page numbers */}
        {withGaps.map((p) =>
          typeof p === "string" ? (
            <span key={p} className="px-1 text-gray-400 text-sm select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`${btn} ${p === page ? active : idle}`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className={`${btn} ${page === totalPages ? disabled : idle} flex items-center gap-1`}
        >
          <span className="hidden sm:inline">Next</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
