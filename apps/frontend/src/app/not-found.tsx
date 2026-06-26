import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-nova grid place-items-center py-28 text-center">
      <p className="text-7xl font-black text-nova-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-ink/50">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to Home
      </Link>
    </div>
  );
}
