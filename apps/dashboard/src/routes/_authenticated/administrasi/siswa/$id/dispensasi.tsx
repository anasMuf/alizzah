import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	DollarSign,
	Edit2,
	Percent,
	Plus,
	ToggleLeft,
	ToggleRight,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import {
	type CreateDispensationRequest,
	dispensationKeys,
	type UpdateDispensationRequest,
	useCreateDispensation,
	useDeleteDispensation,
	useGetStudentDispensations,
	useToggleDispensation,
	useUpdateDispensation,
} from "#/api/endpoints/dispensations/dispensations";
import {
	Badge,
	Button,
	ConfirmDialog,
	FormField,
	SlideOver,
	useToast,
} from "#/components/ui";
import { academicYearAtom } from "../../../../../store/global";
import { formatCurrency } from "../../../../../utils/format";

export const Route = createFileRoute(
	"/_authenticated/administrasi/siswa/$id/dispensasi",
)({
	component: SiswaDispensasiPage,
});

const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"Mei",
	"Jun",
	"Jul",
	"Agu",
	"Sep",
	"Okt",
	"Nov",
	"Des",
];

function SiswaDispensasiPage() {
	const { id } = Route.useParams();
	const studentId = Number(id);
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<any>(null);
	const [deletingItem, setDeletingItem] = useState<any>(null);

	// Form state
	const [discountType, setDiscountType] = useState<"percent" | "fixed">(
		"percent",
	);
	const [discountValue, setDiscountValue] = useState("");
	const [isPermanent, setIsPermanent] = useState(true);
	const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1);
	const [startYear, setStartYear] = useState(new Date().getFullYear());
	const [endMonth, setEndMonth] = useState<number | "">("");
	const [endYear, setEndYear] = useState<number | "">("");
	const [reason, setReason] = useState("");
	const [notes, setNotes] = useState("");

	const { data: resp, isLoading } = useGetStudentDispensations(
		studentId,
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } },
	);
	const dispensations: any[] = ((resp as any)?.data as any)?.data || [];

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: dispensationKeys.studentList(studentId),
		});

	const createMutation = useCreateDispensation({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Dispensasi berhasil ditambahkan.",
				});
				invalidate();
				closeForm();
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const updateMutation = useUpdateDispensation({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Dispensasi berhasil diperbarui.",
				});
				invalidate();
				closeForm();
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const toggleMutation = useToggleDispensation({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Status dispensasi berhasil diubah.",
				});
				invalidate();
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const deleteMutation = useDeleteDispensation({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Dispensasi berhasil dihapus.",
				});
				invalidate();
				setDeletingItem(null);
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const openCreate = () => {
		setEditingItem(null);
		setDiscountType("percent");
		setDiscountValue("");
		setIsPermanent(true);
		setStartMonth(7);
		setStartYear(2025);
		setEndMonth("");
		setEndYear("");
		setReason("");
		setNotes("");
		setIsFormOpen(true);
	};

	const openEdit = (d: any) => {
		setEditingItem(d);
		setDiscountType(d.discount_type);
		setDiscountValue(d.discount_value.toString());
		setIsPermanent(d.is_permanent);
		setStartMonth(d.start_month);
		setStartYear(d.start_year);
		setEndMonth(d.end_month || "");
		setEndYear(d.end_year || "");
		setReason(d.reason);
		setNotes(d.notes || "");
		setIsFormOpen(true);
	};

	const closeForm = () => {
		setIsFormOpen(false);
		setEditingItem(null);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingItem) {
			const data: UpdateDispensationRequest = {
				discount_type: discountType,
				discount_value: Number(discountValue),
				is_permanent: isPermanent,
				end_month: !isPermanent && endMonth ? Number(endMonth) : undefined,
				end_year: !isPermanent && endYear ? Number(endYear) : undefined,
				reason,
				notes: notes || undefined,
			};
			updateMutation.mutate({ id: editingItem.id, data });
		} else {
			const data: CreateDispensationRequest = {
				academic_year_id: activeAy?.id || 0,
				fee_category: "monthly_spp",
				discount_type: discountType,
				discount_value: Number(discountValue),
				is_permanent: isPermanent,
				start_month: startMonth,
				start_year: startYear,
				end_month: !isPermanent && endMonth ? Number(endMonth) : undefined,
				end_year: !isPermanent && endYear ? Number(endYear) : undefined,
				reason,
				notes: notes || undefined,
			};
			createMutation.mutate({ studentId, data });
		}
	};

	const canSubmit =
		!!reason.trim() &&
		Number(discountValue) > 0 &&
		(!isPermanent ? !!endMonth && !!endYear : true);

	// Estimate total discount for active dispensations
	const activeDispensations = dispensations.filter((d: any) => d.is_active);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-gray-900">
					Dispensasi Tagihan
				</h3>
				<Button variant="primary" onClick={openCreate}>
					<Plus className="w-4 h-4 mr-2" /> Tambah Dispensasi
				</Button>
			</div>

			{/* Summary */}
			{activeDispensations.length > 0 && (
				<div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
					<p className="text-sm text-indigo-800 font-medium">
						{activeDispensations.length} dispensasi aktif untuk item SPP
					</p>
					<div className="mt-1 text-xs text-indigo-600 space-x-3">
						{activeDispensations.map((d: any) => (
							<span key={d.id}>
								{d.reason}:{" "}
								{d.discount_type === "percent"
									? `${d.discount_value}%`
									: formatCurrency(d.discount_value)}
							</span>
						))}
					</div>
				</div>
			)}

			{/* List */}
			{isLoading ? (
				<div className="animate-pulse space-y-3">
					{[1, 2].map((n) => (
						<div key={n} className="h-20 bg-gray-200 rounded-lg" />
					))}
				</div>
			) : dispensations.length === 0 ? (
				<div className="text-center py-8 text-gray-500">
					<Percent className="w-10 h-10 text-gray-300 mx-auto mb-2" />
					<p className="text-sm">Belum ada dispensasi untuk siswa ini.</p>
				</div>
			) : (
				<div className="space-y-3">
					{dispensations.map((d: any) => (
						<div
							key={d.id}
							className={`rounded-lg border p-4 ${d.is_active ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200 opacity-60"}`}
						>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span className="text-sm font-semibold text-gray-900">
											{d.reason}
										</span>
										{d.is_active ? (
											<Badge variant="success">Aktif</Badge>
										) : (
											<Badge variant="danger">Nonaktif</Badge>
										)}
										{d.is_permanent && <Badge variant="info">Permanen</Badge>}
									</div>
									<div className="mt-1 flex items-center gap-1 text-sm">
										{d.discount_type === "percent" ? (
											<>
												<Percent className="w-3.5 h-3.5 text-indigo-500" />
												<span className="font-medium text-indigo-700">
													{d.discount_value}% SPP
												</span>
											</>
										) : (
											<>
												<DollarSign className="w-3.5 h-3.5 text-green-500" />
												<span className="font-medium text-green-700">
													{formatCurrency(d.discount_value)} SPP
												</span>
											</>
										)}
									</div>
									<p className="mt-1 text-xs text-gray-500">
										Berlaku: {MONTH_NAMES[d.start_month - 1]} {d.start_year}
										{d.is_permanent
											? " — Selamanya"
											: d.end_month
												? ` — ${MONTH_NAMES[d.end_month - 1]} ${d.end_year}`
												: ""}
									</p>
									{d.notes && (
										<p className="mt-1 text-xs text-gray-400">{d.notes}</p>
									)}
								</div>
								<div className="flex items-center gap-1 ml-4">
									<button
										type="button"
										onClick={() => toggleMutation.mutate(d.id)}
										className="p-1 rounded hover:bg-gray-100"
										title={d.is_active ? "Nonaktifkan" : "Aktifkan"}
									>
										{d.is_active ? (
											<ToggleRight className="w-5 h-5 text-green-600" />
										) : (
											<ToggleLeft className="w-5 h-5 text-gray-400" />
										)}
									</button>
									<button
										type="button"
										onClick={() => openEdit(d)}
										className="p-1 rounded hover:bg-gray-100 text-indigo-600"
									>
										<Edit2 className="w-4 h-4" />
									</button>
									<button
										type="button"
										onClick={() => setDeletingItem(d)}
										className="p-1 rounded hover:bg-gray-100 text-rose-600"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Form */}
			<SlideOver
				isOpen={isFormOpen}
				onClose={closeForm}
				title={editingItem ? "Edit Dispensasi" : "Tambah Dispensasi"}
			>
				<form onSubmit={handleSubmit} className="flex h-full flex-col bg-white">
					<div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
						{/* Jenis tagihan — locked to SPP */}
						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Jenis Tagihan
							</label>
							<input
								type="text"
								value="SPP Bulanan"
								disabled
								className="block w-full rounded-md border-0 py-1.5 px-3 bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-300 sm:text-sm"
							/>
						</div>

						{/* Tipe potongan */}
						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Tipe Potongan
							</label>
							<div className="grid grid-cols-2 gap-3">
								<label
									className={`border rounded-lg p-3 cursor-pointer flex items-center gap-2 ${discountType === "percent" ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "border-gray-200 hover:bg-gray-50"}`}
								>
									<input
										type="radio"
										className="sr-only"
										checked={discountType === "percent"}
										onChange={() => setDiscountType("percent")}
									/>
									<Percent className="w-5 h-5 text-indigo-600" />
									<span className="text-sm font-medium">Persentase</span>
								</label>
								<label
									className={`border rounded-lg p-3 cursor-pointer flex items-center gap-2 ${discountType === "fixed" ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "border-gray-200 hover:bg-gray-50"}`}
								>
									<input
										type="radio"
										className="sr-only"
										checked={discountType === "fixed"}
										onChange={() => setDiscountType("fixed")}
									/>
									<DollarSign className="w-5 h-5 text-green-600" />
									<span className="text-sm font-medium">Nominal Tetap</span>
								</label>
							</div>
						</div>

						{/* Nilai potongan */}
						<FormField
							id="discountValue"
							type="number"
							label={
								discountType === "percent" ? "Persentase (%)" : "Nominal (Rp)"
							}
							value={discountValue}
							onChange={(e: any) => setDiscountValue(e.target.value)}
							required
							min="1"
							max={discountType === "percent" ? "100" : undefined}
							placeholder={
								discountType === "percent" ? "Contoh: 50" : "Contoh: 25000"
							}
						/>

						{/* Durasi */}
						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Durasi
							</label>
							<div className="grid grid-cols-2 gap-3 mb-3">
								<label
									className={`border rounded-lg p-3 cursor-pointer text-center ${isPermanent ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "border-gray-200 hover:bg-gray-50"}`}
								>
									<input
										type="radio"
										className="sr-only"
										checked={isPermanent}
										onChange={() => setIsPermanent(true)}
									/>
									<span className="text-sm font-medium">Permanen</span>
									<span className="block text-xs text-gray-500 mt-0.5">
										Sampai dinonaktifkan
									</span>
								</label>
								<label
									className={`border rounded-lg p-3 cursor-pointer text-center ${!isPermanent ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "border-gray-200 hover:bg-gray-50"}`}
								>
									<input
										type="radio"
										className="sr-only"
										checked={!isPermanent}
										onChange={() => setIsPermanent(false)}
									/>
									<span className="text-sm font-medium">Periode Tertentu</span>
									<span className="block text-xs text-gray-500 mt-0.5">
										Ada batas waktu
									</span>
								</label>
							</div>
						</div>

						{/* Start month/year (only for create) */}
						{!editingItem && (
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-900 mb-1">
										Bulan Mulai
									</label>
									<select
										value={startMonth}
										onChange={(e) => setStartMonth(Number(e.target.value))}
										className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm"
									>
										{MONTH_NAMES.map((name, idx) => (
											<option key={idx} value={idx + 1}>
												{name}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-900 mb-1">
										Tahun Mulai
									</label>
									<input
										type="number"
										value={startYear}
										onChange={(e) => setStartYear(Number(e.target.value))}
										min={2020}
										className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm"
									/>
								</div>
							</div>
						)}

						{/* End month/year (only if not permanent) */}
						{!isPermanent && (
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-900 mb-1">
										Bulan Berakhir
									</label>
									<select
										value={endMonth}
										onChange={(e) => setEndMonth(Number(e.target.value))}
										className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm"
									>
										<option value="">— Pilih —</option>
										{MONTH_NAMES.map((name, idx) => (
											<option key={idx} value={idx + 1}>
												{name}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-900 mb-1">
										Tahun Berakhir
									</label>
									<input
										type="number"
										value={endYear}
										onChange={(e) => setEndYear(Number(e.target.value) || "")}
										min={2020}
										placeholder="2026"
										className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm"
									/>
								</div>
							</div>
						)}

						{/* Alasan */}
						<FormField
							id="reason"
							label="Alasan"
							value={reason}
							onChange={(e: any) => setReason(e.target.value)}
							required
							placeholder='Contoh: "Anak Guru", "Yatim", "Satu Dusun"'
						/>

						{/* Catatan */}
						<div>
							<label
								htmlFor="notes"
								className="block text-sm font-medium text-gray-900 mb-2"
							>
								Catatan
							</label>
							<textarea
								id="notes"
								rows={2}
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
								placeholder="Opsional"
							/>
						</div>
					</div>

					<div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 flex justify-end gap-3">
						<Button type="button" variant="secondary" onClick={closeForm}>
							Batal
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={
								!canSubmit ||
								createMutation.isPending ||
								updateMutation.isPending
							}
						>
							{editingItem ? "Simpan" : "Tambah Dispensasi"}
						</Button>
					</div>
				</form>
			</SlideOver>

			{/* Delete Confirm */}
			<ConfirmDialog
				open={!!deletingItem}
				onCancel={() => setDeletingItem(null)}
				onConfirm={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
				title="Hapus Dispensasi"
				variant="danger"
				confirmLabel="Hapus"
			>
				Hapus dispensasi <strong>{deletingItem?.reason}</strong> (
				{deletingItem?.discount_type === "percent"
					? `${deletingItem?.discount_value}%`
					: formatCurrency(deletingItem?.discount_value || 0)}
				)?
			</ConfirmDialog>
		</div>
	);
}
