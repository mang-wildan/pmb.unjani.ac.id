'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dayjs from 'dayjs';
import PengumumanForm from '../../_form/PengumumanForm';

export default function EditPengumumanPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/admin/pengumuman/${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setData({
          ...d,
          publishedAt: dayjs(d.publishedAt).format('YYYY-MM-DDTHH:mm'),
        });
      });
  }, [id]);

  if (!data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-ink-muted text-sm">
        Memuat data...
      </div>
    );
  }

  return <PengumumanForm initialData={data as never} />;
}
