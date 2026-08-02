import type { ReactNode } from "react";

interface ReportInfoCardProps {
	filters: Record<string, string>;
}

const FIELD_LABELS: Record<string, string> = {
	sumber: "Sumber",
	pos: "Pos",
	kategori: "Kategori",
	pengeluaran: "Pengeluaran",
	metode: "Metode Bayar",
	periode: "Periode",
	ta: "Tahun Ajaran",
};

export function ReportInfoCard({ filters }: ReportInfoCardProps) {
	const entries = Object.entries(filters).filter(
		([, value]) => value && value !== "-",
	);

	if (entries.length === 0) return null;

	return (
		<div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
			<div className="flex flex-wrap gap-x-6 gap-y-1">
				{entries.map(([key, value]) => (
					<div key={key} className="text-sm">
						<span className="font-medium text-indigo-900">
							{FIELD_LABELS[key] ?? key}:
						</span>{" "}
						<span className="text-indigo-700">{value}</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── ReportTable ────────────────────────────────────────────────

interface ReportTableColumn {
	key: string;
	header: string;
	align?: "left" | "right";
	className?: string;
}

interface ReportTableProps {
	columns: ReportTableColumn[];
	children: ReactNode;
	/** Optional total row rendered below the table body */
	total?: ReactNode;
	/** Optional empty message */
	emptyMessage?: string;
}

export function ReportTable({
	columns,
	children,
	total,
	emptyMessage = "Tidak ada data",
}: ReportTableProps) {
	const hasChildren = Array.isArray(children)
		? (children as ReactNode[]).length > 0
		: Boolean(children);

	return (
		<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-300">
					<thead className="bg-gray-50">
						<tr>
							{columns.map((col) => (
								<th
									key={col.key}
									className={`py-3 px-3 text-sm font-semibold text-gray-900 ${
										col.align === "right" ? "text-right" : "text-left"
									} ${col.className ?? ""}`}
								>
									{col.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 bg-white">
						{hasChildren ? (
							children
						) : (
							<tr>
								<td
									colSpan={columns.length}
									className="px-6 py-12 text-center text-sm text-gray-500"
								>
									{emptyMessage}
								</td>
							</tr>
						)}
					</tbody>
					{total}
				</table>
			</div>
		</div>
	);
}
