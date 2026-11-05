import RippleLoader from '@/components/ui/RippleLoader';

type TableLoadingRowProps = {
  colSpan: number;
  label?: string;
};

export default function TableLoadingRow({
  colSpan,
  label,
}: TableLoadingRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-8">
        <RippleLoader label={label} />
      </td>
    </tr>
  );
}
