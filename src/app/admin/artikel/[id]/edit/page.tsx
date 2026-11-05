'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useParams, useRouter } from 'next/navigation';
import ArtikelForm, { type ArtikelFormData } from '../../_form/ArtikelForm';

type DataArtikel = Omit<Partial<ArtikelFormData>, 'kategori_id'> & {
  kategori_id?: string | { _id?: string };
};

export default function EditArtikelPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<DataArtikel | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/artikel/${id}`, { cache: 'no-store' })
      .then(async (response) => {
        const hasil = await response.json();
        if (!response.ok) throw new Error(hasil.error || 'Gagal memuat artikel');
        setData({
          ...hasil.item,
          publishedAt: hasil.item.publishedAt
            ? dayjs(hasil.item.publishedAt).format('YYYY-MM-DDTHH:mm')
            : '',
        });
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat artikel'),
      );
  }, [id]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-semibold">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/admin/artikel')}
          className="mt-4 rounded-full border border-red-200 px-4 py-2 font-semibold"
        >
          Kembali ke daftar
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-ink-muted">
        Memuat artikel...
      </div>
    );
  }

  return <ArtikelForm initialData={data} />;
}
