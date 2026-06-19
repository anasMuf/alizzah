import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CreditCard } from "lucide-react";
import { useState } from "react";
import { Badge, Button } from "#/components/ui";
import { formatCurrency, formatDate } from "#/utils/format";
import {
	type SaleStatus,
	useSale,
} from "../../../../features/koperasi/penjualan/api";
import { BayarForm } from "../../../../features/koperasi/penjualan/BayarForm";

export const Route = createFileRoute("/_authenticated/koperasi/penjualan/$id")({
	component: PenjualanDetailPage,
});

const STATUS: Record<
	SaleStatus,
	{ label: string; variant: "danger" | "warning" | "success" }
> = {
	unpaid: { label: "Belum Bayar", variant: "danger" },
	partial: { label: "Sebagian", variant: "warning" },
	paid: { label: "Lunas", variant: "success" },
};

function PenjualanDetailPage() {
	const { id } = Route.useParams();
	const { data: sale, isLoading, isError } = useSale(Number(id));
	const [isPayOpen, setIsPayOpen] = useState(false);

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat detail penjualan...</p>;
	}
	if (isError || !sale) {
		return <p className="text-sm text-red-600">Penjualan tidak ditemukan.</p>;
	}

	return (
		<div className="space-y-6">
			<Link
				to="/koperasi/penjualan"
				className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
			>
				<ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke daftar
			</Link>

			<div className="flex items-start justify-between">
				<div>
					<div className="flex items-center gap-3">
						<h1 className="text-2xl font-bold text-gray-900">
							Penjualan #{sale.id}
						</h1>
						<Badge variant={STATUS[sale.status].variant}>
							{STATUS[sale.status].label}
						</Badge>
						<Badge
							variant={sale.source === "registrasi" ? "info" : "secondary"}
						>
							{sale.source === "registrasi" ? "Registrasi" : "POS"}
						</Badge>
					</div>
					<p className="text-sm text-gray-500">
						{sale.buyer_name || sale.student_name || "Umum"} ·{" "}
						{formatDate(sale.sale_date)}
					</p>
				</div>
				{sale.status !== "paid" && sale.source !== "registrasi" && (
					<Button variant="primary" onClick={() => setIsPayOpen(true)}>
						<CreditCard className="h-4 w-4 mr-1.5" /> Catat Pembayaran
					</Button>
				)}
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<SummaryCard label="Total" value={formatCurrency(sale.total_amount)} />
				<SummaryCard
					label="Dibayar"
					value={formatCurrency(sale.paid_amount)}
					tone="emerald"
				/>
				<SummaryCard
					label="Sisa"
					value={formatCurrency(sale.remaining)}
					tone={sale.remaining > 0 ? "amber" : "gray"}
				/>
				<SummaryCard
					label="Laba"
					value={formatCurrency(sale.profit)}
					tone="indigo"
				/>
			</div>

			<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
								Barang
							</th>
							<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
								Qty
							</th>
							<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
								Harga
							</th>
							<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
								Subtotal
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{sale.items.map((it) => (
							<tr key={it.product_id}>
								<td className="px-4 py-3 text-sm text-gray-900">
									{it.product_name}
								</td>
								<td className="px-4 py-3 text-sm text-gray-600 text-right">
									{it.quantity}
								</td>
								<td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
									{formatCurrency(it.unit_price)}
								</td>
								<td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
									{formatCurrency(it.subtotal)}
								</td>
							</tr>
						))}
					</tbody>
					<tfoot className="bg-gray-50">
						<tr>
							<td
								className="px-4 py-3 text-sm font-semibold text-gray-700"
								colSpan={3}
							>
								Total
							</td>
							<td className="px-4 py-3 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
								{formatCurrency(sale.total_amount)}
							</td>
						</tr>
					</tfoot>
				</table>
			</div>

			{sale.notes && (
				<p className="text-sm text-gray-500">
					Catatan: <span className="text-gray-700">{sale.notes}</span>
				</p>
			)}

			<BayarForm
				sale={sale}
				isOpen={isPayOpen}
				onClose={() => setIsPayOpen(false)}
			/>
		</div>
	);
}

function SummaryCard({
	label,
	value,
	tone = "gray",
}: {
	label: string;
	value: string;
	tone?: "gray" | "emerald" | "amber" | "indigo";
}) {
	const toneClass = {
		gray: "text-gray-900",
		emerald: "text-emerald-600",
		amber: "text-amber-600",
		indigo: "text-indigo-600",
	}[tone];
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4">
			<dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
			<dd className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</dd>
		</div>
	);
}
