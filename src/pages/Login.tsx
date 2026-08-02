import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import xrayBg from '../assets/xray-bg.png';

function Check() {
  return (
    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#1e3a8a]/50">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path
          d="M2.5 6.2 5 8.7l4.5-5"
          stroke="#93c5fd"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Feature({ lead, rest }: { lead: string; rest: string }) {
  return (
    <li className="flex items-start gap-3">
      <Check />
      <p className="text-sm leading-5 text-[#d1d5db]">
        <span className="font-bold text-white">{lead}</span> {rest}
      </p>
    </li>
  );
}

/** Login & security — node 1:84, wired to seeded auth. */
export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('a.wibowo@rsudhs.go.id');
  const [password, setPassword] = useState('password12');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await api.login(email, password);
      sessionStorage.setItem('kf_user', JSON.stringify(user));
      navigate('/worklist');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="relative hidden w-[648px] shrink-0 flex-col justify-between overflow-hidden bg-[#1a2b4c] p-12 lg:flex">
        <img
          src={xrayBg}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10"
        />
        <div className="relative flex flex-col gap-24">
          <div className="flex items-center">
            <div className="rounded bg-accent px-2 py-1 text-sm font-bold tracking-wider text-white">
              K3
            </div>
            <span className="ml-3 text-xl font-semibold tracking-wide text-white">
              KneeFit3D
            </span>
          </div>

          <div className="max-w-[448px]">
            <h1 className="text-[32px] font-bold leading-10 text-white">
              Perencanaan praoperasi TKA berbasis AI, dari sepasang X-ray.
            </h1>
            <p className="mt-4 pr-4 text-[15px] leading-6 text-[#bfdbfe]">
              Rekonstruksi 3D, deteksi landmark anatomi, dan rekomendasi ukuran
              implan, sebagai alat bantu keputusan klinis.
            </p>
            <ul className="mt-6 flex flex-col gap-4">
              <Feature lead="De-identifikasi otomatis." rest="Metadata DICOM identitas pasien dihapus saat unggah." />
              <Feature lead="Akses berbasis peran." rest="Hanya staf klinis terdaftar rumah sakit Anda." />
              <Feature lead="Audit log penuh." rest="Setiap akses dan keputusan tercatat." />
            </ul>
          </div>
        </div>

        <p className="relative text-xs leading-4 text-[#64748b]">
          Rekomendasi bersifat estimatif; keputusan akhir tetap pada dokter.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-2 py-8">
        <div className="w-full max-w-[448px]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-ink-800">Masuk ke workstation</h2>
            <p className="mt-1 text-sm text-ink-500">Gunakan akun klinis institusi Anda.</p>
          </div>

          <form onSubmit={submit} className="rounded-card border border-ink-200 bg-white px-8 pb-8 pt-10 shadow-card">
            <div className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-700">Institusi</span>
                <div className="relative">
                  <select
                    defaultValue="rsudhs"
                    className="w-full appearance-none rounded-md border border-[#d1d5db] bg-white px-3 py-2.5 text-sm text-ink-700 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="rsudhs">RSUD Harapan Sehat, Ortopedi</option>
                    <option value="rscm">RSCM, Bedah Ortopedi</option>
                    <option value="rssa">RSSA Malang, Ortopedi</option>
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-ink-700">Email institusi</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-[#6b7280] bg-white px-3 py-2.5 text-sm text-ink-900 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-700">Kata sandi</span>
                  <a href="#" className="text-xs text-accent hover:underline">Lupa kata sandi?</a>
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-[#6b7280] bg-white px-3 py-2.5 text-sm tracking-widest text-ink-900 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </label>

              {error && (
                <p className="rounded-md border border-status-errorBg bg-status-errorBg/40 px-3 py-2 text-xs text-status-error">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? 'Memeriksa…' : 'Masuk'}
              </Button>

              <div className="flex items-center py-1">
                <div className="h-px flex-1 bg-ink-200" />
                <span className="px-4 text-xs text-ink-400">atau</span>
                <div className="h-px flex-1 bg-ink-200" />
              </div>

              <Button type="button" variant="secondary" size="lg" className="w-full font-medium" onClick={() => navigate('/worklist')}>
                Masuk dengan SSO rumah sakit
              </Button>
            </div>
          </form>

          <p className="mt-6 rounded-lg border border-accent-soft bg-accent-softer p-4 text-xs leading-relaxed text-ink-600">
            Akses dibatasi untuk staf klinis terdaftar. Semua aktivitas tercatat
            pada audit log institusi.
          </p>
        </div>
      </main>
    </div>
  );
}
