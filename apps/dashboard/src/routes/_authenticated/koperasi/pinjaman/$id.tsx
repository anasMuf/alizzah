import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CreditCard } from "lucide-react";
import { useState } from "react";
import { Badge, Button } from "#/components/ui";
import { formatCurrency, formatDate } from "#/utils/format";
import {
	type LoanStatus,
	useLoan,
} from "../../../../features/koperasi/pinjaman/api";
import { BayarForm } from "../../../../features/koperasi/pinjaman/BayarForm";

export const Route = createFileRoute("/_authenticated/koperasi/pinjaman/$id")({
	component: PinjamanDetailPage,
});

const STATUS: Record<
	LoanStatus,
	{ label: string; variant: "danger" | "warning" | "success" }
> = {
	unpaid: { label: "Belum Bayar", variant: "danger" },
	partial: { label: "Sebagian", variant: "warning" },
	paid: { label: "Lunas", variant: "success" },
};

const METHOD_LABEL: Record<string, string> = {
	potong_gaji: "Potong Gaji",
	manual: "Manual",
};

function PinjamanDetailPage() {
	const { id } = Route.useParams();
	const { data: loan, isLoading, isError } = useLoan(Number(id));
	const [isPayOpen, setIsPayOpen] = useState(false);

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat detail pinjaman...</p>;
	}
	if (isError || !loan) {
		return <p className="text-sm text-red-600">Pinjaman tidak ditemukan.</p>;
	}

	const perInstallment = loan.tenor > 0 ? loan.principal / loan.tenor : 0;

	return (
		<div className="space-y-6">
			<Link
				to="/koperasi/pinjaman"
				className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
			>
				<ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke daftar
			</Link>

			<div className="flex items-start justify-between">
				<div>
					<div className="flex items-center gap-3">
						<h1 className="text-2xl font-bold text-gray-900">
							Pinjaman #{loan.id}
						</h1>
						<Badge variant={STATUS[loan.status].variant}>
							{STATUS[loan.status].label}
						</Badge>
					</div>
					<p className="text-sm text-gray-500">
						{loan.member_name} · {loan.purpose} · {formatDate(loan.loan_date)}
					</p>
				</div>
				{loan.status !== "paid" && (
					<Button variant="primary" onClick={() => setIsPayOpen(true)}>
						<CreditCard className="h-4 w-4 mr-1.5" /> Catat Angsuran
					</Button>
				)}
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<SummaryCard label="Pokok" value={formatCurrency(loan.principal)} />
				<SummaryCard
					label="Dibayar"
					value={formatCurrency(loan.paid_amount)}
					tone="emerald"
				/>
				<SummaryCard
					label="Sisa"
					value={formatCurrency(loan.remaining)}
					tone={loan.remaining > 0 ? "amber" : "gray"}
				/>
				<SummaryCard
					label={`Angsuran/bln (${loan.tenor}×)`}
					value={formatCurrency(perInstallment)}
				/>
			</div>

			<p className="text-sm text-gray-500">
				Metode pelunasan:{" "}
				<span className="text-gray-700">
					{METHOD_LABEL[loan.repayment_method] ?? loan.repayment_method}
				</span>
			</p>

			<div>
				<h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
					Jadwal Angsuran
				</h2>
				<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Angsuran ke-
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Jatuh Tempo
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Dibayar
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Status
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{(loan.installments ?? []).map((it) => (
								<tr key={it.sequence}>
									<td className="px-4 py-3 text-sm text-gray-900">
										{it.sequence}
									</td>
									<td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
										{formatCurrency(it.amount_due)}
									</td>
									<td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
										{formatCurrency(it.amount_paid)}
									</td>
									<td className="px-4 py-3">
										<Badge variant={STATUS[it.status].variant}>
											{STATUS[it.status].label}
										</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{loan.notes && (
				<p className="text-sm text-gray-500">
					Catatan: <span className="text-gray-700">{loan.notes}</span>
				</p>
			)}

			<BayarForm
				loan={loan}
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
	tone?: "gray" | "emerald" | "amber";
}) {
	const toneClass = {
		gray: "text-gray-900",
		emerald: "text-emerald-600",
		amber: "text-amber-600",
	}[tone];
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4">
			<dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
			<dd className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</dd>
		</div>
	);
}
