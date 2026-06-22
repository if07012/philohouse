import Link from 'next/link';

interface BadmintonNavProps {
  active: 'main' | 'laporan';
}

export function BadmintonNav({ active }: BadmintonNavProps) {
  const linkClass = (isActive: boolean) =>
    isActive
      ? 'text-gray-900 font-semibold'
      : 'text-gray-500 hover:text-gray-700';

  return (
    <nav className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 text-sm">
      <Link href="/badminton" className={linkClass(active === 'main')}>
        Beranda
      </Link>
      <span className="text-gray-300">|</span>
      <Link href="/badminton/laporan" className={linkClass(active === 'laporan')}>
        Laporan Keuangan
      </Link>
    </nav>
  );
}
