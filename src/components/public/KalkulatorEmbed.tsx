export default function KalkulatorEmbed({
  url,
  title = 'Kalkulator PMB UNJANI',
  height = 900,
}: {
  url: string;
  title?: string;
  height?: number;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
      <iframe
        src={url}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
        className="w-full"
        style={{ height, border: 0 }}
      />
    </div>
  );
}
