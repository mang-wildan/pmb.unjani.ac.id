import dayjs from 'dayjs';
import { cn } from '@/lib/cn';
import { hariKe, hariMenujuMulai, sisaHari, totalHari, type StatusPeriode } from '@/lib/statusPeriode';
import { StatusPill } from './komponen';
import { Widget } from './Widget';
import type { DataWidget } from './data';

// Widget data terbaru dan aktif (FR-65). Server component; setiap widget memuat paling banyak
// BATAS_BARIS baris dan "Lihat semua" di kanan bawah (Widget.tsx).

type Nada = 'success' | 'info' | 'warning' | 'muted';

const NADA: Record<StatusPeriode, Nada> = { berjalan: 'success', 'akan-datang': 'info', nonaktif: 'muted', arsip: 'warning' };
const LABEL_JADWAL: Record<StatusPeriode, string> = { berjalan: 'Berjalan', 'akan-datang': 'Akan datang', nonaktif: 'Nonaktif', arsip: 'Arsip' };
const LABEL_POPUP: Record<StatusPeriode, string> = { berjalan: 'Tayang', 'akan-datang': 'Terjadwal', nonaktif: 'Nonaktif', arsip: 'Arsip' };
const LABEL_ARTIKEL: Record<string, { label: string; nada: Nada }> = {
  draft: { label: 'Draf', nada: 'muted' },
  terjadwal: { label: 'Terjadwal', nada: 'info' },
  terbit: { label: 'Terbit', nada: 'success' },
  arsip: { label: 'Arsip', nada: 'warning' },
};

function tgl(d: Date | null | undefined, format = 'D MMM YYYY'): string {
  return d ? dayjs(d).format(format) : '-';
}

function Baris({ children, className }: { children: React.ReactNode; className?: string }) {
  return <li className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-brand-50 py-2.5 first:border-t-0', className)}>{children}</li>;
}

function Judul({ children }: { children: React.ReactNode }) {
  return <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{children}</span>;
}

function Meta({ children }: { children: React.ReactNode }) {
  return <span className="text-xs tabular-nums text-ink-muted">{children}</span>;
}

function Bar({ persen, nada = 'brand', label }: { persen: number; nada?: 'brand' | 'warn' | 'crit'; label: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50" role="img" aria-label={label}>
      <div
        className={cn('h-full rounded-full', nada === 'brand' && 'bg-brand', nada === 'warn' && 'bg-amber-500', nada === 'crit' && 'bg-red-600')}
        style={{ width: `${Math.min(100, Math.max(0, persen))}%` }}
      />
    </div>
  );
}

export function WidgetJadwal({ data, acuan }: { data: NonNullable<DataWidget['jadwal']>; acuan: Date }) {
  return (
    <Widget
      judul="Jadwal berjalan & akan datang"
      keterangan={`${data.total} jadwal belum berakhir`}
      href="/admin/jadwal"
      kosong={data.baris.length === 0 ? 'Belum ada jadwal berjalan maupun akan datang.' : undefined}
    >
      <ul>
        {data.baris.map((j) => {
          const total = totalHari(j.mulai, j.selesai);
          const ke = hariKe(j.mulai, acuan);
          const sisa = sisaHari(j.selesai, acuan);
          const menuju = hariMenujuMulai(j.mulai, acuan);
          return (
            <Baris key={j.id}>
              <StatusPill tone={NADA[j.status]}>{LABEL_JADWAL[j.status]}</StatusPill>
              <Judul>{j.judul}</Judul>
              <Meta>
                {j.status === 'berjalan' && sisa !== null
                  ? `sisa ${sisa} hari`
                  : j.status === 'akan-datang' && menuju !== null
                    ? `mulai ${menuju} hari lagi`
                    : `${tgl(j.mulai, 'D MMM')} – ${tgl(j.selesai, 'D MMM YYYY')}`}
              </Meta>
              {j.status === 'berjalan' && total && ke ? (
                <div className="flex w-full items-center gap-3">
                  <Bar persen={(ke / total) * 100} label={`Hari ke-${ke} dari ${total}`} />
                  <Meta>{tgl(j.mulai, 'D MMM')} – {tgl(j.selesai, 'D MMM')}</Meta>
                </div>
              ) : (
                <span className="w-full text-xs text-ink-muted">Gel. {j.ke} · {j.tahun} · {tgl(j.mulai, 'D MMM')} – {tgl(j.selesai, 'D MMM YYYY')}</span>
              )}
            </Baris>
          );
        })}
      </ul>
    </Widget>
  );
}

export function WidgetBiaya({ data }: { data: NonNullable<DataWidget['biaya']> }) {
  return (
    <Widget
      judul="Biaya pendidikan"
      keterangan="Cakupan biaya per jadwal berlaku"
      href="/admin/biaya"
      kosong={data.length === 0 ? 'Belum ada jadwal berlaku, jadi belum ada biaya yang perlu diisi.' : undefined}
    >
      <ul>
        {data.map((b) => {
          const persen = b.total > 0 ? Math.round((b.nilai / b.total) * 100) : 0;
          const nada = b.nilai === 0 ? 'crit' : b.nilai < b.total ? 'warn' : 'brand';
          return (
            <Baris key={b.id}>
              <Judul>{b.judul} · {b.tahun}</Judul>
              <Meta>{b.nilai}/{b.total} prodi</Meta>
              <div className="flex w-full items-center gap-3">
                <Bar persen={persen} nada={nada} label={`${persen} persen prodi sudah punya biaya`} />
                <Meta>{persen}%</Meta>
              </div>
            </Baris>
          );
        })}
      </ul>
    </Widget>
  );
}

export function WidgetPengumuman({ data }: { data: DataWidget['pengumuman'] }) {
  return (
    <Widget judul="Pengumuman terbaru" keterangan="Disematkan dulu, lalu yang terbaru" href="/admin/pengumuman" kosong={data.length === 0 ? 'Belum ada pengumuman yang tayang.' : undefined}>
      <ul>
        {data.map((p) => (
          <Baris key={p.id}>
            {p.pinned && <StatusPill tone="warning">Disematkan</StatusPill>}
            <Judul>{p.judul}</Judul>
            <Meta>{tgl(p.tanggal)}</Meta>
          </Baris>
        ))}
      </ul>
    </Widget>
  );
}

export function WidgetArtikel({ data }: { data: DataWidget['artikel'] }) {
  return (
    <Widget judul="Artikel terbaru" keterangan="Yang terbaru di atas" href="/admin/artikel" kosong={data.length === 0 ? 'Belum ada artikel.' : undefined}>
      <ul>
        {data.map((a) => {
          const st = LABEL_ARTIKEL[a.status] ?? { label: a.status, nada: 'muted' as const };
          return (
            <Baris key={a.id}>
              <StatusPill tone={st.nada}>{st.label}</StatusPill>
              <Judul>{a.judul}</Judul>
              <Meta>{tgl(a.tanggal)}</Meta>
            </Baris>
          );
        })}
      </ul>
    </Widget>
  );
}

export function WidgetPopup({ data, acuan }: { data: DataWidget['popup']; acuan: Date }) {
  return (
    <Widget
      judul="Popup tayang & terjadwal"
      keterangan={`${data.total} popup belum berakhir`}
      href="/admin/popup"
      kosong={data.baris.length === 0 ? 'Tidak ada popup yang tayang maupun terjadwal.' : undefined}
    >
      <ul>
        {data.baris.map((p) => {
          const sisa = sisaHari(p.tampilSampai, acuan);
          const menuju = hariMenujuMulai(p.tampilDari, acuan);
          return (
            <Baris key={p.id}>
              <StatusPill tone={NADA[p.status]}>{LABEL_POPUP[p.status]}</StatusPill>
              <Judul>{p.judul}</Judul>
              <Meta>
                {p.status === 'berjalan' && sisa !== null
                  ? `sisa ${sisa} hari`
                  : p.status === 'akan-datang' && menuju !== null
                    ? `mulai ${tgl(p.tampilDari, 'D MMM')}`
                    : p.tampilSampai
                      ? `s.d. ${tgl(p.tampilSampai, 'D MMM')}`
                      : 'tanpa batas akhir'}
              </Meta>
            </Baris>
          );
        })}
      </ul>
    </Widget>
  );
}

export function WidgetAktivitas({ data }: { data: NonNullable<DataWidget['aktivitas']> }) {
  return (
    <Widget judul="Aktivitas terbaru" keterangan="Audit perubahan terakhir di panel admin" href="/admin/log-aktivitas" kosong={data.length === 0 ? 'Belum ada aktivitas.' : undefined}>
      <ul>
        {data.map((a) => (
          <Baris key={a.id}>
            <span className="w-24 flex-none text-xs tabular-nums text-ink-muted">{a.waktu ? dayjs(a.waktu).format('D MMM HH:mm') : '-'}</span>
            <StatusPill tone={a.aksi === 'delete' ? 'warning' : 'success'}>{a.aksi || '-'}</StatusPill>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">
              <span className="font-semibold text-ink-muted">{a.entitas || '-'}</span>
              {a.ringkasan ? ` – ${a.ringkasan}` : ''}
            </span>
            <span className="w-full truncate text-xs text-ink-muted">{a.email || '-'}</span>
          </Baris>
        ))}
      </ul>
    </Widget>
  );
}
