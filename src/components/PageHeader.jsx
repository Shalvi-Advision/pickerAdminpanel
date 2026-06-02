export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="px-8 pt-8 pb-4 flex items-start justify-between gap-4 bg-white border-b">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
