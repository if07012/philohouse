import Link from "next/link";

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue mb-4 text-center">
          Aturan Main Game
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6 text-center">
          Ketentuan jatah bermain game berdasarkan ibadah dan kegiatan harian.
        </p>

        <section className="mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-dark-blue mb-2">
            1. Main Game Sore (Hari Biasa)
          </h2>
          <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1">
            <li>
              <strong>Ngaji minimal 2 lembar</strong> → dapat jatah <strong>1 jam</strong>.
            </li>
            <li>
              <strong>Ngaji 3 lembar</strong> → dapat jatah <strong>1,5 jam</strong>.
            </li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-dark-blue mb-2">
            2. Main Game Pagi
          </h2>
          <p className="text-sm sm:text-base text-gray-700 mb-2">
            Dapat jatah <strong>1 jam</strong> jika memenuhi semua syarat berikut:
          </p>
          <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1">
            <li>Tidur siang di hari sebelumnya.</li>
            <li>Hafalan vocabulary 3 level.</li>
            <li>Solat subuh di masjid.</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-dark-blue mb-2">
            3. Main Game di Weekend
          </h2>
          <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1">
            <li>
              Jatah <strong>2 jam</strong> diberikan secara otomatis.
            </li>
            <li>
              Untuk main di <strong>sore hari</strong> di weekend: tetap berlaku aturan
              ngaji minimal 2 lembar (sesuai poin 1).
            </li>
            <li>
              <strong>Penambahan jam:</strong> bisa dari hafalan vocabulary untuk 3 level (1 Jam), maksimal{" "}
              <strong>2 jam (6 level)</strong> tambahan.
            </li>
            <li>
              <strong>Penambahan jam lagi:</strong> hafalan ayat Quran{" "}
              <strong>3 ayat = 1 jam</strong> tambahan.
            </li>
          </ul>
        </section>

        <div className="flex justify-center gap-3 mt-6 flex-wrap">
          <Link
            href="/todo"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-dark-blue px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-md transition-colors hover:opacity-90"
          >
            Todo Harian
          </Link>
        </div>
      </div>
    </div>
  );
}

