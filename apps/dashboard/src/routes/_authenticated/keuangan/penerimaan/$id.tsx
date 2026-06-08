import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
	incomeTransactionKeys,
	useDeleteIncomeTransaction,
	useGetIncomeTransaction,
} from "../../../../api/endpoints/income-transactions/income-transactions";
import { Badge } from "../../../../components/atoms/Badge";
import { Button } from "../../../../components/atoms/Button";
import { ConfirmDialog } from "../../../../components/molecules/ConfirmDialog";
import { useToast } from "../../../../components/molecules/Toast";
import { formatCurrency, formatDate } from "../../../../utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/penerimaan/$id")(
	{
		component: PenerimaanDetailPage,
	},
);

const CATEGORY_LABELS: Record<string, string> = {
	bos: "Dana BOS",
	donasi: "Donasi",
	hibah: "Hibah",
	lainnya: "Lainnya",
};

const CATEGORY_VARIANTS: Record<
	string,
	"info" | "success" | "warning" | "danger"
> = {
	bos: "info",
	donasi: "success",
	hibah: "warning",
	lainnya: "danger",
};

function PenerimaanDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [showDelete, setShowDelete] = useState(false);

	const { data: resp, isLoading } = useGetIncomeTransaction(Number(id));
	const item = ((resp as any)?.data as any)?.data;

	const deleteMutation = useDeleteIncomeTransaction({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Penerimaan berhasil dihapus.",
				});
				queryClient.invalidateQueries({ queryKey: incomeTransactionKeys.all });
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/balance"] });
				queryClient.invalidateQueries({ queryKey: ["/v1/cash/transactions"] });
				navigate({ to: "/keuangan/penerimaan" });
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal menghapus.",
				});
			},
		},
	});

	if (isLoading)
		return (
			<div className="p-8 text-center text-gray-500">
				Memuat detail penerimaan...
			</div>
		);
	if (!item)
		return (
			<div className="p-8 text-center text-red-500">
				Penerimaan tidak ditemukan.
			</div>
		);

	return (
		<div className="space-y-6 max-w-2xl mx-auto">
			{/* Breadcrumb */}
			<nav className="flex items-center text-sm text-gray-500">
				<Link
					to="/keuangan/penerimaan"
					className="hover:text-indigo-600 transition-colors"
				>
					Penerimaan
				</Link>
				<ChevronRight className="w-4 h-4 mx-1" />
				<span className="text-gray-900 font-medium">Detail #{item.id}</span>
			</nav>

			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold leading-7 text-gray-900">
					Detail Penerimaan
				</h2>
				<Button
					variant="secondary"
					onClick={() => navigate({ to: "/keuangan/penerimaan" })}
				>
					<ArrowLeft className="w-4 h-4 mr-2" /> Kembali
				</Button>
			</div>

			<div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
				<dl className="divide-y divide-gray-100">
					<div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
						<dt className="text-sm font-medium text-gray-500">Kategori</dt>
						<dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
							<Badge variant={CATEGORY_VARIANTS[item.category] || "info"}>
								{CATEGORY_LABELS[item.category] || item.category}
							</Badge>
						</dd>
					</div>
					<div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
						<dt className="text-sm font-medium text-gray-500">
							Sumber / Pengirim
						</dt>
						<dd className="mt-1 text-sm font-semibold text-gray-900 sm:col-span-2 sm:mt-0">
							{item.source_name}
						</dd>
					</div>
					<div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
						<dt className="text-sm font-medium text-gray-500">Nominal</dt>
						<dd className="mt-1 text-lg font-bold text-green-600 sm:col-span-2 sm:mt-0">
							{formatCurrency(Number(item.amount))}
						</dd>
					</div>
					<div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
						<dt className="text-sm font-medium text-gray-500">
							Tanggal Transaksi
						</dt>
						<dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
							{formatDate(item.transaction_date)}
						</dd>
					</div>
					<div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
						<dt className="text-sm font-medium text-gray-500">
							Nomor Referensi
						</dt>
						<dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
							{item.reference_number || "-"}
						</dd>
					</div>
					<div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
						<dt className="text-sm font-medium text-gray-500">Catatan</dt>
						<dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
							{item.notes || "-"}
						</dd>
					</div>
					<div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
						<dt className="text-sm font-medium text-gray-500">Tahun Ajaran</dt>
						<dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
							{item.academic_year?.name}
						</dd>
					</div>
					<div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
						<dt className="text-sm font-medium text-gray-500">Dicatat Oleh</dt>
						<dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
							{item.created_by?.full_name}
						</dd>
					</div>
					<div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
						<dt className="text-sm font-medium text-gray-500">Tanggal Input</dt>
						<dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
							{formatDate(item.created_at)}
						</dd>
					</div>
				</dl>
			</div>

			<div className="flex justify-end">
				<Button variant="danger" onClick={() => setShowDelete(true)}>
					Hapus Penerimaan
				</Button>
			</div>

			<ConfirmDialog
				open={showDelete}
				onCancel={() => setShowDelete(false)}
				onConfirm={() => deleteMutation.mutate(Number(id))}
				title="Hapus Penerimaan"
				variant="danger"
				confirmLabel="Hapus"
			>
				<p>
					Apakah Anda yakin ingin menghapus penerimaan{" "}
					<strong>{item.source_name}</strong> senilai{" "}
					<strong>{formatCurrency(Number(item.amount))}</strong>?
				</p>
			</ConfirmDialog>
		</div>
	);
}
