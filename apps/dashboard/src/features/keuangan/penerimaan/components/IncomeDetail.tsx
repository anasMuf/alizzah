import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Badge, Button, ConfirmDialog } from "#/components/ui";
import {
	CATEGORY_LABELS,
	CATEGORY_VARIANTS,
} from "#/features/keuangan/penerimaan/hooks/useIncomeList";
import { formatCurrency, formatDate } from "@/utils/format";

interface IncomeDetailProps {
	item: any;
	isLoading: boolean;
	showDelete: boolean;
	onDeleteClick: () => void;
	onDeleteCancel: () => void;
	onDeleteConfirm: () => void;
}

export function IncomeDetail({
	item,
	isLoading,
	showDelete,
	onDeleteClick,
	onDeleteCancel,
	onDeleteConfirm,
}: IncomeDetailProps) {
	const navigate = useNavigate();
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
			<nav className="flex items-center text-sm text-gray-500">
				<Link to="/keuangan/penerimaan" className="hover:text-indigo-600">
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
					<Field label="Kategori">
						<Badge variant={CATEGORY_VARIANTS[item.category] || "info"}>
							{CATEGORY_LABELS[item.category] || item.category}
						</Badge>
					</Field>
					<Field label="Sumber / Pengirim">
						<span className="font-semibold">{item.source_name}</span>
					</Field>
					<Field label="Nominal">
						<span className="text-lg font-bold text-green-600">
							{formatCurrency(Number(item.amount))}
						</span>
					</Field>
					<Field label="Tanggal Transaksi">
						{formatDate(item.transaction_date)}
					</Field>
					<Field label="Nomor Referensi">{item.reference_number || "-"}</Field>
					<Field label="Catatan">{item.notes || "-"}</Field>
					<Field label="Tahun Ajaran">{item.academic_year?.name}</Field>
					<Field label="Dicatat Oleh">{item.created_by?.full_name}</Field>
					<Field label="Tanggal Input">{formatDate(item.created_at)}</Field>
				</dl>
			</div>
			<div className="flex justify-end">
				<Button variant="danger" onClick={onDeleteClick}>
					Hapus Penerimaan
				</Button>
			</div>
			<ConfirmDialog
				open={showDelete}
				onCancel={onDeleteCancel}
				onConfirm={onDeleteConfirm}
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

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
			<dt className="text-sm font-medium text-gray-500">{label}</dt>
			<dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
				{children}
			</dd>
		</div>
	);
}
