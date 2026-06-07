export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="px-4 pt-5 pb-4 sm:px-6 sm:pt-7 lg:px-8 lg:pt-8 flex items-start justify-between gap-4 bg-white border-b">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
