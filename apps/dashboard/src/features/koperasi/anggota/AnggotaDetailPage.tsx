import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Edit, HandCoins } from "lucide-react";
import { useState } from "react";
import { Badge, Button } from "#/components/ui";
import { formatCurrency } from "#/utils/format";
import { AnggotaForm } from "./AnggotaForm";
import { useMemberDetail } from "./api";

interface AnggotaDetailPageProps {
	id: number;
}

const TYPE_LABEL: Record<string, string> = {
	pegawai: "Pegawai",
	pengurus_yayasan: "Pengurus Yayasan",
	pihak_luar: "Pihak Luar",
};

export function AnggotaDetailPage({ id }: AnggotaDetailPageProps) {
	const navigate = useNavigate();
	const { data: detail, isLoading, isError } = useMemberDetail(id);
	const [isEditOpen, setIsEditOpen] = useState(false);

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat detail anggota...</p>;
	}

	if (isError || !detail) {
		return <p className="text-sm text-red-600">Gagal memuat detail anggota.</p>;
	}

	const { loan_summary } = detail;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4 border-b border-gray-200 pb-5">
				<button
					type="button"
					onClick={() => navigate({ to: "/koperasi/anggota" })}
					className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
					title="Kembali"
				>
					<ArrowLeft className="h-5 w-5" />
				</button>
				<div className="flex-1">
					<div className="flex items-center gap-3">
						<h1 className="text-2xl font-bold text-gray-900">
							{detail.full_name}
						</h1>
						<Badge variant={detail.is_active ? "success" : "secondary"}>
							{detail.is_active ? "Aktif" : "Nonaktif"}
						</Badge>
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
						<span>{TYPE_LABEL[detail.member_type] || detail.member_type}</span>
						{detail.phone && (
							<>
								<span className="text-gray-300">•</span>
								<span>{detail.phone}</span>
							</>
						)}
						{detail.employee_name && (
							<>
								<span className="text-gray-300">•</span>
								<span>Terhubung: {detail.employee_name}</span>
							</>
						)}
					</div>
				</div>
				<Button variant="secondary" onClick={() => setIsEditOpen(true)}>
					<Edit className="h-4 w-4 mr-2" />
					Edit Profil
				</Button>
			</div>

			{/* Loan Summary Cards */}
			<div>
				<h2 className="text-lg font-semibold text-gray-900 mb-4">
					Ringkasan Pinjaman
				</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
						<div className="text-sm font-medium text-gray-500">
							Pinjaman Aktif
						</div>
						<div className="mt-2 text-2xl font-bold text-gray-900">
							{loan_summary.active_loan_count}
						</div>
					</div>
					<div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
						<div className="text-sm font-medium text-gray-500">Total Pokok</div>
						<div className="mt-2 text-2xl font-bold text-gray-900">
							{formatCurrency(loan_summary.total_principal)}
						</div>
					</div>
					<div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
						<div className="text-sm font-medium text-gray-500">
							Total Dibayar
						</div>
						<div className="mt-2 text-2xl font-bold text-emerald-600">
							{formatCurrency(loan_summary.total_paid)}
						</div>
					</div>
					<div className="rounded-lg border border-indigo-100 bg-indigo-50 shadow-sm p-4">
						<div className="text-sm font-medium text-indigo-800">
							Sisa Hutang
						</div>
						<div className="mt-2 text-2xl font-bold text-indigo-900">
							{formatCurrency(loan_summary.total_remaining)}
						</div>
					</div>
				</div>
			</div>

			{/* Action Shortcuts */}
			<div>
				<h2 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
					<Link
						to="/koperasi/pinjaman"
						search={{ action: "new", member_id: detail.id }}
						className="relative rounded-lg border border-gray-300 bg-white p-5 shadow-sm hover:border-indigo-500 focus:outline-none transition-colors"
					>
						<div className="flex items-center gap-4">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
								<HandCoins className="h-6 w-6" />
							</div>
							<div>
								<span className="text-base font-semibold text-gray-900">
									Ajukan Pinjaman
								</span>
								<span className="mt-1 block text-sm text-gray-500">
									Catat pinjaman baru untuk anggota ini.
								</span>
							</div>
						</div>
					</Link>
				</div>
			</div>

			<AnggotaForm
				isOpen={isEditOpen}
				onClose={() => setIsEditOpen(false)}
				initialData={detail}
			/>
		</div>
	);
}
