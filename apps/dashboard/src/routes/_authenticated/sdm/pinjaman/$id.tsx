import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Badge,
	Button,
	CurrencyFormField,
	FormField,
	useToast,
} from "#/components/ui";
import {
	currentPeriode,
	formatPeriode,
	usePayAngsuran,
	usePinjamanDetail,
} from "#/features/sdm/api";
import { formatCurrency, formatDate } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/pinjaman/$id")({
	component: PinjamanDetailPage,
});

function PinjamanDetailPage() {
	const { id } = Route.useParams();
	const loanId = Number(id);
	const { addToast } = useToast();
	const { data: loan, isLoading, isError } = usePinjamanDetail(loanId);
	const pay = usePayAngsuran(loanId);

	const [periode, setPeriode] = useState(currentPeriode());
	const [nominal, setNominal] = useState(0);

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat pinjaman...</p>;
	}
	if (isError || !loan) {
		return <p className="text-sm text-red-600">Gagal memuat pinjaman.</p>;
	}

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		if (nominal <= 0) return;
		pay.mutate(
			{ periode, angsuran: nominal },
			{
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: `Angsuran ${formatPeriode(periode)} dicatat.`,
					});
					setNominal(0);
				},
				onError: (err: Error) =>
					addToast({
						variant: "error",
						title: "Gagal",
						message:
							err instanceof ApiError ? err.message : "Terjadi kesalahan",
					}),
			},
		);
	};

	return (
		<div className="space-y-6">
			<Link
				to="/sdm/pinjaman"
				search={{ employee_id: undefined }}
				className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600"
			>
				<ArrowLeft className="h-4 w-4 mr-1" /> Pinjaman
			</Link>

			<div className="rounded-lg border border-gray-200 bg-white p-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{loan.nama}</h1>
						<p className="mt-1 text-sm text-gray-500">
							Pinjaman {formatDate(loan.tgl_pinjam)} ·{" "}
							<Badge variant={loan.is_lunas ? "success" : "warning"}>
								{loan.is_lunas ? "Lunas" : "Belum Lunas"}
							</Badge>
							{loan.tgl_lunas && (
								<span className="ml-1">lunas {formatDate(loan.tgl_lunas)}</span>
							)}
						</p>
					</div>
					<div className="grid grid-cols-3 gap-4 text-center">
						<MiniStat label="Jumlah" value={formatCurrency(loan.jumlah)} />
						<MiniStat
							label="Dibayar"
							value={formatCurrency(loan.angsuran_terbayar)}
							className="text-emerald-600"
						/>
						<MiniStat
							label="Sisa"
							value={formatCurrency(loan.sisa)}
							className={loan.sisa > 0 ? "text-amber-600" : "text-gray-400"}
						/>
					</div>
				</div>
			</div>

			{!loan.is_lunas && (
				<form
					onSubmit={submit}
					className="rounded-lg border border-gray-200 bg-white p-5 space-y-4"
				>
					<h2 className="text-sm font-semibold text-gray-900">
						Bayar Angsuran
					</h2>
					<div className="grid grid-cols-2 gap-4">
						<FormField
							id="angsuran-periode"
							label="Periode (YYYY-MM)"
							placeholder="mis. 2026-05"
							value={periode}
							onChange={(e) => setPeriode(e.target.value)}
							required
						/>
						<CurrencyFormField
							id="angsuran-nominal"
							label="Nominal Angsuran"
							placeholder="0"
							value={nominal}
							onChange={setNominal}
							required
						/>
					</div>
					<Button variant="primary" type="submit" disabled={pay.isPending}>
						{pay.isPending ? "Menyimpan..." : "Catat Angsuran"}
					</Button>
				</form>
			)}

			<div className="rounded-lg border border-gray-200 bg-white">
				<div className="border-b border-gray-100 px-5 py-4">
					<h2 className="text-sm font-semibold text-gray-900">
						Riwayat Angsuran
					</h2>
				</div>
				{loan.angsuran.length === 0 ? (
					<p className="px-5 py-4 text-sm text-gray-400">Belum ada angsuran.</p>
				) : (
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
									Periode
								</th>
								<th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
									Tanggal
								</th>
								<th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
									Nominal
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{loan.angsuran.map((a) => (
								<tr key={a.id} className="hover:bg-gray-50">
									<td className="px-4 py-3 text-sm text-gray-900">
										{formatPeriode(a.periode)}
									</td>
									<td className="px-4 py-3 text-sm text-gray-600">
										{formatDate(a.tanggal)}
									</td>
									<td className="px-4 py-3 text-sm text-gray-900 text-right">
										{formatCurrency(a.angsuran)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

function MiniStat({
	label,
	value,
	className = "",
}: {
	label: string;
	value: string;
	className?: string;
}) {
	return (
		<div className="rounded-md bg-gray-50 px-4 py-3">
			<p className="text-xs font-medium text-gray-500">{label}</p>
			<p className={`text-sm font-bold text-gray-900 mt-0.5 ${className}`}>
				{value}
			</p>
		</div>
	);
}
