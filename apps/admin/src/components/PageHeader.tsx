import Link from 'next/link';

export default function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-black">{title}</h1>
      {action && (
        <Link href={action.href} className="btn-primary">
          {action.label}
        </Link>
      )}
    </div>
  );
}
