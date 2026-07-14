import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	ChevronRight,
	Download,
	Pencil,
	Printer,
	Receipt,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { useGetV1PaymentsId } from "#/api/endpoints/payments/payments";
import { useDeleteV1PaymentsId } from "#/api/endpoints/payments/payments-manual";
import { Button, ConfirmDialog, useToast } from "#/components/ui";
import {
	formatCurrency,
	formatDate,
	formatDateTime,
} from "../../../../utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/pembayaran/$id")(
	{
		component: DetailPembayaranPage,
	},
);

function DetailPembayaranPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { addToast } = useToast();

	const { data: paymentResp, isLoading } = useGetV1PaymentsId(Number(id));
	const payment = (paymentResp?.data as any)?.data;

	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const deleteMutation = useDeleteV1PaymentsId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pembayaran berhasil dihapus.",
				});
				navigate({ to: "/keuangan/pembayaran" });
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal menghapus pembayaran.",
				});
			},
		},
	});

	if (isLoading)
		return (
			<div className="p-8 text-center text-gray-500">
				Memuat detail pembayaran...
			</div>
		);
	if (!payment)
		return (
			<div className="p-8 text-center text-red-500">
				Pembayaran tidak ditemukan.
			</div>
		);

	const handlePrint = () => {
		window.print();
	};

	const handleEdit = () => {
		navigate({
			to: "/keuangan/pembayaran/baru",
			search: {
				student_id: undefined,
				invoice_id: undefined,
				edit_id: Number(id),
			},
		});
	};

	const handleDelete = () => {
		setShowDeleteConfirm(false);
		deleteMutation.mutate(Number(id));
	};

	return (
		<div className="space-y-6 max-w-4xl mx-auto pb-12 print:max-w-none print:m-0 print:p-0">
			{/* Breadcrumb - Hidden on print */}
			<nav className="flex print:hidden" aria-label="Breadcrumb">
				<ol className="flex items-center space-x-2 text-sm text-gray-500">
					<li>
						<Link to="/keuangan/pembayaran" className="hover:text-gray-900">
							Pembayaran
						</Link>
					</li>
					<li>
						<ChevronRight className="h-4 w-4" />
					</li>
					<li className="font-medium text-gray-900">Struk #{payment.id}</li>
				</ol>
			</nav>

			{/* Header Actions - Hidden on print */}
			<div className="flex justify-between items-center print:hidden">
				<div>
					<Link
						to="/keuangan/pembayaran"
						className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center"
					>
						<ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Daftar
					</Link>
				</div>
				<div className="flex space-x-3">
					<Button variant="secondary" onClick={handlePrint}>
						<Printer className="w-4 h-4 mr-2" /> Cetak Struk
					</Button>
					<Button variant="secondary" onClick={handleEdit}>
						<Pencil className="w-4 h-4 mr-2" /> Ubah
					</Button>
					<Button
						variant="secondary"
						onClick={() => setShowDeleteConfirm(true)}
						className="!text-red-600 hover:!bg-red-50"
					>
						<Trash2 className="w-4 h-4 mr-2" /> Hapus
					</Button>
					<Button variant="primary">
						<Download className="w-4 h-4 mr-2" /> Download PDF
					</Button>
				</div>
			</div>

			{/* Print Area Container */}
			<div className="print-invoice bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-8 print:shadow-none print:ring-0 print:p-0">
				{/* Receipt Header */}
				<div className="border-b border-gray-200 pb-6 mb-6">
					<div className="flex justify-between items-start">
						<div className="flex items-center">
							<div className="bg-indigo-600 p-2 rounded-lg">
								<Receipt className="h-8 w-8 text-white" />
							</div>
							<div className="ml-4">
								<h1 className="text-2xl font-bold text-gray-900">
									Bukti Pembayaran
								</h1>
								<p className="text-sm text-gray-500">
									PAUD UNGGULAN AL-IZZAH MOJOKERTO
								</p>
							</div>
						</div>
						<div className="text-right">
							<div className="text-sm text-gray-500 mb-1">No. Referensi</div>
							<div className="text-lg font-bold text-gray-900 font-mono">
								#{payment.id}
							</div>
							<div className="text-sm text-gray-500 mt-1">
								{formatDateTime(payment.created_at)}
							</div>
						</div>
					</div>
				</div>

				{/* Student & Payment Info */}
				<div className="grid grid-cols-2 gap-8 mb-8">
					<div>
						<h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
							Dibayar Oleh
						</h3>
						<div className="text-sm text-gray-600 space-y-1">
							<p className="font-bold text-gray-900">
								{payment.student?.full_name}
							</p>
							<p>
								{payment.student?.nisn ? `NISN: ${payment.student.nisn}` : "-"}
							</p>
							<p>
								{payment.student?.active_enrollment?.class_group?.name ||
									"Tanpa Rombel"}
							</p>
						</div>
					</div>
					<div>
						<h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
							Detail Transaksi
						</h3>
						<div className="text-sm text-gray-600 space-y-1 grid grid-cols-2 gap-x-4">
							<span className="text-gray-500">Tanggal Bayar:</span>
							<span className="font-medium text-gray-900">
								{formatDate(payment.payment_date || payment.created_at)}
							</span>

							<span className="text-gray-500">Metode Bayar:</span>
							<span className="font-medium text-gray-900">
								{payment.source === "savings"
									? "Tabungan Umum"
									: "Uang Tunai (Kas)"}
							</span>

							<span className="text-gray-500">Petugas Penerima:</span>
							<span className="font-medium text-gray-900">
								{payment.created_by?.full_name || "Sistem"}
							</span>
						</div>
					</div>
				</div>

				{/* Items Table */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
							Rincian Pembayaran
						</h3>
					</div>
					<table className="min-w-full divide-y divide-gray-200">
						<thead>
							<tr>
								<th className="py-3 text-left text-sm font-semibold text-gray-900">
									Deskripsi Tagihan
								</th>
								<th className="py-3 text-right text-sm font-semibold text-gray-900 w-48">
									Jumlah (Rp)
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{payment.items && payment.items.length > 0 ? (
								<>
									{payment.items.map((item: any, idx: number) => (
										<tr key={idx}>
											<td className="py-3 text-sm text-gray-700">
												{item.invoice_item_name || "Pembayaran Tagihan"}
											</td>
											<td className="py-3 text-sm text-gray-900 font-medium text-right">
												{formatCurrency(Number(item.amount))}
											</td>
										</tr>
									))}
								</>
							) : (
								<tr>
									<td className="py-3 text-sm text-gray-500" colSpan={2}>
										Tidak ada rincian item.
									</td>
								</tr>
							)}
							{Number(payment.savings_deposit) > 0 && (
								<tr className="bg-green-50">
									<td className="py-3 text-sm text-green-700 font-medium">
										Setoran Tabungan Umum
									</td>
									<td className="py-3 text-sm text-green-700 font-medium text-right">
										{formatCurrency(Number(payment.savings_deposit))}
									</td>
								</tr>
							)}
						</tbody>
						<tfoot>
							{Number(payment.savings_deposit) > 0 && (
								<>
									<tr>
										<td className="pt-4 text-right text-sm text-gray-500 pr-4">
											Subtotal Tagihan
										</td>
										<td className="pt-4 text-right text-sm text-gray-700 px-3">
											{formatCurrency(Number(payment.total_amount))}
										</td>
									</tr>
									<tr>
										<td className="py-1 text-right text-sm text-gray-500 pr-4">
											Setoran Tabungan
										</td>
										<td className="py-1 text-right text-sm text-gray-700 px-3">
											{formatCurrency(Number(payment.savings_deposit))}
										</td>
									</tr>
								</>
							)}
							<tr>
								<td className="py-4 text-right text-sm font-bold text-gray-900 pr-4">
									Total Pembayaran
								</td>
								<td className="py-4 text-right text-lg font-bold text-indigo-600 bg-indigo-50 px-3 rounded">
									{formatCurrency(
										Number(payment.total_amount) +
											Number(payment.savings_deposit || 0),
									)}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>

				{/* Notes */}
				{payment.notes && (
					<div className="mb-8 p-4 bg-gray-50 rounded-lg">
						<h3 className="text-sm font-semibold text-gray-900 mb-1">
							Catatan Tambahan
						</h3>
						<p className="text-sm text-gray-600">{payment.notes}</p>
					</div>
				)}

				{/* Footer */}
				<div className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
					<p>Terima kasih atas pembayaran yang telah dilakukan.</p>
					<p>Simpan tanda terima ini sebagai bukti pembayaran yang sah.</p>
				</div>
			</div>

			{/* Delete Confirmation Dialog */}
			<ConfirmDialog
				open={showDeleteConfirm}
				title="Hapus Pembayaran"
				description={`Yakin hapus pembayaran #${payment.id}? Seluruh catatan keuangan terkait (kas, tabungan, invoice) akan dikembalikan seperti semula.`}
				confirmLabel="Ya, Hapus"
				cancelLabel="Batal"
				variant="danger"
				onConfirm={handleDelete}
				onCancel={() => setShowDeleteConfirm(false)}
			/>
		</div>
	);
}
