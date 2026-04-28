"use client";
import { useRouter } from "next/navigation";

export default function GameRules() {
    const router = useRouter();
    const Section = ({ title, children }: { title?: string, children: any }) => (<div className='bg-white rounded-2xl shadow p-6 space-y-4'><h2 className='text-2xl font-bold text-slate-800'>{title}</h2>{children}</div>);
    const Item = ({ children }: { children: any }) => (<li className='leading-relaxed text-slate-700'>{children}</li>);
    return <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 md:p-10'>
        <div className='max-w-4xl mx-auto space-y-6'>
            <div className='text-center space-y-2'>
                <h1 className='text-4xl font-extrabold text-indigo-700'>🎮 Aturan Main Game</h1>
                <p className='text-slate-600'>Rajin belajar = bonus waktu bermain</p>
            </div>

            <Section title='⏰ Waktu Gratis'>
                <ul className='list-disc pl-6'><Item>Main game gratis setiap <b>Minggu selama 1 jam</b>.</Item></ul>
            </Section>

            <Section title='🏆 Bonus Tambahan'>
                <div className='grid md:grid-cols-2 gap-4'>
                    <div className='rounded-xl bg-emerald-50 p-4 cursor-pointer' onClick={() => router.push('/mystery-reading')}>
                        <h3 className='font-bold text-emerald-700'>📚 Mystery Reading</h3>
                        <p>Selesaikan 6 soal dan kumpulkan <b>minimal 50 poin</b>:</p>
                        <ul className='list-disc pl-6'><Item>+1 jam Sabtu</Item><Item>+1 jam Minggu</Item></ul>
                    </div>
                    <div className='rounded-xl bg-sky-50 p-4 cursor-pointer' onClick={() => router.push('/translation-training')}>
                        <h3 className='font-bold text-sky-700'>🇬🇧 Translation English</h3>
                        <p>5 latihan per hari selama 5 hari dengan nilai <b>minimal 80%</b>. Jika tidak tahu arti kata, boleh melihat kamus:</p>
                        <ul className='list-disc pl-6'><Item>+1 jam Jumat</Item><Item>+1 jam Sabtu</Item></ul>
                    </div>
                </div>
                <div className='grid md:grid-cols-2 gap-4'>
                    <div className='rounded-xl bg-lime-50 p-4 cursor-pointer' onClick={() => router.push('/challange')}>
                        <h3 className='font-bold text-lime-700'>🏃 Olahraga di Rumah</h3>
                        <p>Lakukan challenge 5 hari (Senin-Jumat):</p>
                        <p><b>+30 menit main game di hari Sabtu</b></p>
                    </div>
                    <div className='rounded-xl bg-violet-50 p-4 cursor-pointer' onClick={() => router.push('/remember')}>
                        <h3 className='font-bold text-violet-700'>📖 Hafalan Surat Pendek</h3>
                        <p>Hafal 10 ayat:</p>
                        <p><b>+60 menit Sabtu</b> dan <b>+60 menit Minggu</b></p>
                        <p>Jika hafal 4 ayat, bonus dihitung proporsional: 60 ÷ 10 × 4 = 24 menit.</p>
                    </div>
                </div>
            </Section>

            <Section title='⚠️ Pengurangan Waktu'>
                <div className='space-y-4'>
                    <div className='bg-red-50 rounded-xl p-4'><b>🗑️ Buang sampah sembarangan</b><p>-10 menit</p></div>
                    <div className='bg-red-50 rounded-xl p-4'><b>📚 Buku disimpan sembarangan</b><p>-5 menit</p></div>
                    <div className='bg-red-50 rounded-xl p-4'><b>🧸 Mainan tidak dirapihkan</b><p>-3 menit</p></div>
                    <div className='bg-rose-50 rounded-xl p-4'><b>🧺 Cucian tidak masuk keranjang</b><p>-3 menit</p></div>
                    <div className='bg-amber-50 rounded-xl p-4'><b>🕌 Sholat Subuh lewat 05.45</b><p>Kurang sesuai menit telat. Contoh: 05.46 = -1 menit, 05.50 = -5 menit.</p></div>
                    <div className='bg-orange-50 rounded-xl p-4'><b>🚿 Mandi lewat 06.05</b><p>Pengurangan tergantung jumlah menit keterlambatan mandi. Contoh: 06.10 = -5 menit, 06.20 = -15 menit.</p></div>
                </div>
            </Section>

            <Section title='📺 Aturan YouTube'>
                <ul className='list-disc pl-6 space-y-2'>
                    <Item>Jatah YouTube <b>30 menit setiap hari</b>.</Item>
                    <Item>Tambahan <b>1 jam YouTube</b> jika menyelesaikan <b>10 soal Translation dalam sehari</b>.</Item>
                </ul>
            </Section>

            <Section title='🌅 Rutinitas Pagi Hari'>
                <div className='grid md:grid-cols-2 gap-4'>
                    <div className='bg-slate-50 rounded-xl p-4'>Rapihkan tempat tidur</div>
                    <div className='bg-slate-50 rounded-xl p-4'>Shalat</div>
                    <div className='bg-slate-50 rounded-xl p-4'>Mandi</div>
                    <div className='bg-slate-50 rounded-xl p-4'>Sikat gigi</div>
                    <div className='bg-slate-50 rounded-xl p-4'>Sapu kamar</div>
                    <div className='bg-slate-50 rounded-xl p-4'>Cek ulang buku</div>
                    <div className='bg-slate-50 rounded-xl p-4 md:col-span-2'>Sarapan</div>
                </div>
            </Section>

            <Section title='🌙 Rutinitas Sore Hari'>
                <div className='grid md:grid-cols-2 gap-4'>
                    <div className='bg-slate-50 rounded-xl p-4'>Simpan sepatu dan kaus kaki di rak</div>
                    <div className='bg-slate-50 rounded-xl p-4'>Belajar</div>
                    <div className='bg-slate-50 rounded-xl p-4'>Mandi sore</div>
                    <div className='bg-slate-50 rounded-xl p-4'>Ngaji / Hafalan</div>
                    <div className='bg-slate-50 rounded-xl p-4'>Makan malam</div>
                    <div className='bg-slate-50 rounded-xl p-4'>Siapkan buku</div>
                    <div className='bg-slate-50 rounded-xl p-4 md:col-span-2'>Tidur</div>
                </div>
            </Section>

            <div className='text-center text-lg font-semibold text-indigo-700 pb-8'>🌟 Disiplin + Belajar = Hadiah Lebih Banyak!</div>
        </div>
    </div>
}
