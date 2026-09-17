import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGetV1AcademicYears } from "#/api/endpoints/academic-years/academic-years";
import { useGetV1FeeConfigs } from "#/api/endpoints/fee-configs/fee-configs";
import { usePostV1Invoices } from "#/api/endpoints/invoices/invoices";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Button,
	CurrencyFormField,
	FormField,
	Label,
	SlideOver,
	useToast,
} from "#/components/ui";
import { StudentSearch } from "#/routes/_authenticated/keuangan/pembayaran/components/-StudentSearch";
import { academicYearAtom } from "#/store/global";
import { formatCurrency } from "#/utils/format";
import {
	buildCreateInvoicePayload,
	calculateFeeItemAmount,
	defaultManualInvoiceMode,
	feeItemUnitLabel,
	filterFeeItemsForStudent,
	hasUsableMode,
	isQuantityBasedUnit,
	type ManualInvoiceItemDraft,
	type ManualInvoiceMode,
	modeAvailability,
	studentLevelWarning,
	sumDraftAmounts,
	validateManualInvoice,
} from "../manual-invoice";

// Label kategori tarif — mengikuti pola komponen bersaudara di tagihan/$id.tsx.
const CATEGORY_LABELS: Record<string, string> = {
	monthly_spp: "SPP Bulanan",
	monthly_infaq: "Infaq Harian",
	initial: "Biaya Awal",
	registration: "Registrasi Tahunan",
	pasta: "PASTA",
	calisan: "CALISAN",
	ekskul: "Ekskul",
	savings_mandatory: "Tabungan Wajib",
	daycare: "Daycare",
	graduation: "Wisuda",
	facility: "Fasilitas",
	incidental: "Insidental / Tambahan",
};

const CATEGORY_ORDER = [
	"monthly_spp",
	"monthly_infaq",
	"initial",
	"registration",
	"pasta",
	"calisan",
	"ekskul",
	"savings_mandatory",
	"facility",
	"daycare",
	"graduation",
	"incidental",
];

/** Baris item di UI memakai `key` stabil agar tidak memakai index sebagai key. */
type ItemRow = ManualInvoiceItemDraft & { key: string };

interface ManualInvoiceFormProps {
	isOpen: boolean;
	onClose: () => void;
	/** Bila diisi, pemilih siswa terisi otomatis. */
	preselectedStudent?: any;
	/** Bila true, pemilih siswa dikunci (dibuka dari detail siswa). */
	lockStudent?: boolean;
	onSuccess?: () => void;
}

export function ManualInvoiceForm({
	isOpen,
	onClose,
	preselectedStudent,
	lockStudent = false,
	onSuccess,
}: ManualInvoiceFormProps) {
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);

	const [selectedStudent, setSelectedStudent] = useState<any>(
		preselectedStudent ?? null,
	);
	const [academicYearId, setAcademicYearId] = useState<number | undefined>(
		activeAy?.id,
	);
	const [mode, setMode] = useState<ManualInvoiceMode>("total");
	const [totalAmount, setTotalAmount] = useState(0);
	const [itemRows, setItemRows] = useState<ItemRow[]>([]);
	const [notes, setNotes] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [selectedFeeItemId, setSelectedFeeItemId] = useState("");
	const [quantity, setQuantity] = useState("");

	const submitGuard = useRef(false);
	const keyCounter = useRef(0);

	// Reset seluruh isian setiap kali panel dibuka.
	useEffect(() => {
		if (!isOpen) return;
		const initialAyId = activeAy?.id;
		submitGuard.current = false;
		setSelectedStudent(preselectedStudent ?? null);
		setAcademicYearId(initialAyId);
		setMode(defaultManualInvoiceMode(!!initialAyId));
		setTotalAmount(0);
		setItemRows([]);
		setNotes("");
		setDueDate("");
		setSelectedFeeItemId("");
		setQuantity("");
	}, [isOpen, preselectedStudent, activeAy?.id]);

	// Mode mengikuti pilihan tahun ajaran secara otomatis, tetapi tetap dapat
	// diubah admin (mis. beban non-tarif pada TA aktif, atau tunggakan milik TA aktif).
	useEffect(() => {
		if (!isOpen || !academicYearId) return;
		setMode(defaultManualInvoiceMode(academicYearId === activeAy?.id));
	}, [isOpen, academicYearId, activeAy?.id]);

	const { data: academicYearsResp } = useGetV1AcademicYears();
	const academicYears: any[] = (academicYearsResp?.data as any)?.data || [];
	const selectedAy = academicYears.find((ay: any) => ay.id === academicYearId);

	const { data: feeConfigsResp, isLoading: isFeeConfigLoading } =
		useGetV1FeeConfigs();
	const feeConfigs: any[] = (feeConfigsResp?.data as any)?.data || [];
	const feeConfigForAy = feeConfigs.find(
		(fc: any) => fc.academic_year?.id === academicYearId,
	);

	// Item tarif sudah ikut pada respons daftar tarif — `FindAll` di backend
	// memuat `Items` yang aktif saja (`is_active = true`), jadi tidak perlu
	// request kedua.
	const feeItemsForAy: any[] = feeConfigForAy?.items ?? [];
	const allFeeItems = feeItemsForAy;

	// Mode ditentukan mutlak oleh TA terpilih (tidak lagi bisa dipaksa admin):
	// rinci hanya untuk TA aktif yang punya tarif, total hanya untuk TA lain.
	const isActiveAcademicYear =
		academicYearId != null && academicYearId === activeAy?.id;
	const hasTariffConfig = feeItemsForAy.length > 0;
	const itemizedAvailability = modeAvailability({
		mode: "itemized",
		isActiveAcademicYear,
		hasTariffConfig,
	});
	const totalAvailability = modeAvailability({
		mode: "total",
		isActiveAcademicYear,
		hasTariffConfig,
	});
	// Hanya false pada TA aktif yang belum punya tarif: kedua mode terhalang.
	const noUsableMode = !hasUsableMode({
		isActiveAcademicYear,
		hasTariffConfig,
	});
	const currentModeAvailability =
		mode === "itemized" ? itemizedAvailability : totalAvailability;
	// `noUsableMode` bisa transien saat daftar tarif masih dimuat — jangan
	// tampilkan banner blokir sebelum data tarif benar-benar diketahui.
	const isModeBlocked = noUsableMode && !isFeeConfigLoading;

	const studentLevel =
		selectedStudent?.active_enrollment?.class_group?.level ??
		selectedStudent?.active_enrollment?.level ??
		null;
	const studentGender = selectedStudent?.gender ?? null;
	const selectedStudentLevelWarning = studentLevelWarning(studentLevel);

	// Tarif difilter sesuai profil siswa (level & gender).
	const availableFeeItems = useMemo(
		() => filterFeeItemsForStudent(allFeeItems, studentLevel, studentGender),
		[allFeeItems, studentLevel, studentGender],
	);

	const feeItemsByCategory = useMemo(() => {
		const grouped: Record<string, any[]> = {};
		for (const item of availableFeeItems) {
			const cat = item.category || "other";
			if (!grouped[cat]) grouped[cat] = [];
			grouped[cat].push(item);
		}
		const ordered = Object.keys(grouped).sort((a, b) => {
			const ai = CATEGORY_ORDER.indexOf(a);
			const bi = CATEGORY_ORDER.indexOf(b);
			return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
		});
		return ordered.map((cat) => [cat, grouped[cat]] as const);
	}, [availableFeeItems]);

	const selectedFeeItem = availableFeeItems.find(
		(fi: any) => fi.id.toString() === selectedFeeItemId,
	);
	const quantityBased = isQuantityBasedUnit(selectedFeeItem?.unit);
	const itemizedTotal = sumDraftAmounts(itemRows);

	const handleSelectStudent = (student: any) => {
		setSelectedStudent(student);
		// Item rinci bergantung pada level/gender siswa — mulai ulang bila siswa berganti.
		setItemRows([]);
		setSelectedFeeItemId("");
		setQuantity("");
	};

	const handleAddItem = () => {
		if (!selectedFeeItem) {
			addToast({
				variant: "error",
				title: "Validasi",
				message: "Pilih item tarif terlebih dahulu",
			});
			return;
		}
		const qty = Number(quantity) || 0;
		const amount = calculateFeeItemAmount(selectedFeeItem, qty);
		if (amount <= 0) {
			addToast({
				variant: "error",
				title: "Validasi",
				message: "Nominal item harus lebih dari 0",
			});
			return;
		}

		keyCounter.current += 1;
		setItemRows((prev) => [
			...prev,
			{
				key: `${selectedFeeItem.id}-${keyCounter.current}`,
				name: selectedFeeItem.name,
				category: selectedFeeItem.category,
				amount,
				...(quantityBased
					? { quantity: qty, unitPrice: Number(selectedFeeItem.amount) || 0 }
					: {}),
			},
		]);
		setSelectedFeeItemId("");
		setQuantity("");
	};

	const handleRemoveItem = (key: string) => {
		setItemRows((prev) => prev.filter((row) => row.key !== key));
	};

	const createMutation = usePostV1Invoices({
		mutation: {
			onSuccess: () => {
				submitGuard.current = false;
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Tagihan berhasil dibuat.",
				});
				// Daftar tagihan & detail siswa (total tunggakan) ikut berubah.
				queryClient.invalidateQueries({ queryKey: ["/v1/invoices"] });
				queryClient.invalidateQueries({ queryKey: ["/v1/students"] });
				onClose();
				onSuccess?.();
			},
			onError: (error: Error) => {
				submitGuard.current = false;
				const message =
					error instanceof ApiError ? error.message : "Terjadi kesalahan";
				addToast({ variant: "error", title: "Gagal", message });
			},
		},
	});

	const isPending = createMutation.isPending;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (submitGuard.current || isPending) return;

		const formState = {
			studentId: selectedStudent?.id,
			academicYearId,
			academicYearName: selectedAy?.name,
			mode,
			totalAmount,
			items: itemRows.map((row) => ({
				name: row.name,
				category: row.category,
				amount: row.amount,
				...(row.quantity != null ? { quantity: row.quantity } : {}),
				...(row.unitPrice != null ? { unitPrice: row.unitPrice } : {}),
			})),
			notes,
			dueDate,
			isActiveAcademicYear,
			hasTariffConfig,
		};

		const validationError = validateManualInvoice(formState);
		if (validationError) {
			addToast({
				variant: "error",
				title: "Validasi",
				message: validationError,
			});
			return;
		}

		submitGuard.current = true;
		createMutation.mutate({ data: buildCreateInvoicePayload(formState) });
	};

	const handleClose = () => {
		if (isPending) return;
		onClose();
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={handleClose}
			title="Tambah Tagihan"
			size="lg"
			footer={
				<>
					<Button
						type="button"
						variant="secondary"
						onClick={handleClose}
						disabled={isPending}
					>
						Batal
					</Button>
					<Button
						type="button"
						variant="primary"
						onClick={handleSubmit}
						disabled={
							isPending || noUsableMode || !currentModeAvailability.allowed
						}
					>
						{isPending ? "Menyimpan..." : "Simpan"}
					</Button>
				</>
			}
		>
			<form
				id="manual-invoice-form"
				onSubmit={handleSubmit}
				className="space-y-6"
			>
				<div>
					<Label>Siswa</Label>
					<div className="relative mt-2">
						<StudentSearch
							selectedStudent={selectedStudent}
							onSelect={handleSelectStudent}
							onClear={() => setSelectedStudent(null)}
							disabled={lockStudent}
						/>
					</div>
				</div>

				<div>
					<Label htmlFor="manual-invoice-ay">Tahun Ajaran</Label>
					<select
						id="manual-invoice-ay"
						value={academicYearId ?? ""}
						onChange={(e) => setAcademicYearId(Number(e.target.value))}
						className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					>
						<option value="">— Pilih tahun ajaran —</option>
						{academicYears.map((ay: any) => (
							<option key={ay.id} value={ay.id}>
								{ay.name}
								{ay.id === activeAy?.id ? " (aktif)" : ""}
							</option>
						))}
					</select>
				</div>

				<div>
					<Label>Mode Tagihan</Label>
					<div className="mt-2 grid grid-cols-2 gap-2">
						<button
							type="button"
							onClick={() => setMode("itemized")}
							disabled={!itemizedAvailability.allowed}
							className={`rounded-lg border px-3 py-2 text-sm font-medium ${
								mode === "itemized"
									? "border-indigo-600 bg-indigo-50 text-indigo-700"
									: "border-gray-300 text-gray-600 hover:bg-gray-50"
							} ${
								itemizedAvailability.allowed
									? ""
									: "cursor-not-allowed opacity-50 hover:bg-transparent"
							}`}
						>
							Tagihan Berjalan (rinci)
						</button>
						<button
							type="button"
							onClick={() => setMode("total")}
							disabled={!totalAvailability.allowed}
							className={`rounded-lg border px-3 py-2 text-sm font-medium ${
								mode === "total"
									? "border-indigo-600 bg-indigo-50 text-indigo-700"
									: "border-gray-300 text-gray-600 hover:bg-gray-50"
							} ${
								totalAvailability.allowed
									? ""
									: "cursor-not-allowed opacity-50 hover:bg-transparent"
							}`}
						>
							Tunggakan (nominal total)
						</button>
					</div>

					{isModeBlocked ? (
						<div className="mt-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
							<p>
								Tahun ajaran <strong>{selectedAy?.name || "-"}</strong> belum
								punya item tarif aktif, sehingga mode rinci belum bisa dipakai.
								Mode nominal total hanya berlaku untuk tahun ajaran selain TA
								aktif, jadi tagihan belum bisa dicatat untuk TA ini.
							</p>
							<Link
								to="/pengaturan/tarif"
								className="mt-1 inline-flex font-medium text-amber-900 underline"
							>
								Atur konfigurasi tarif TA ini
							</Link>
						</div>
					) : (
						<p className="mt-2 text-xs text-gray-500">
							{isActiveAcademicYear
								? "Tahun ajaran aktif memakai mode rinci sesuai tarifnya; mode nominal total hanya untuk tunggakan tahun ajaran lain."
								: "Tahun ajaran selain TA aktif dicatat sebagai tunggakan dengan satu nominal total."}
						</p>
					)}
				</div>

				{mode === "total" ? (
					<>
						<div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
							Tunggakan historis dicatat sebagai satu nominal total tanpa
							rincian item, dan dimiliki tahun ajaran{" "}
							<strong>{selectedAy?.name || "-"}</strong>. Pembayarannya nanti
							tercatat di tahun ajaran yang sedang aktif.
						</div>
						<CurrencyFormField
							id="manual-invoice-total"
							label="Nominal Tunggakan"
							value={totalAmount}
							onChange={setTotalAmount}
						/>
					</>
				) : (
					<>
						<div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
							Pastikan item yang dipilih belum tercakup tagihan yang sudah
							di-generate untuk tahun ajaran ini.
						</div>

						{!selectedStudent && (
							<p className="text-sm text-gray-500">
								Pilih siswa terlebih dahulu untuk memuat daftar tarif yang
								sesuai.
							</p>
						)}

						{selectedStudent && (
							<div className="space-y-3">
								{selectedStudentLevelWarning && (
									<div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
										{selectedStudentLevelWarning}
									</div>
								)}
								<Label htmlFor="manual-invoice-fee-item">Item Tarif</Label>
								<div className="flex items-end gap-2">
									<select
										id="manual-invoice-fee-item"
										value={selectedFeeItemId}
										onChange={(e) => setSelectedFeeItemId(e.target.value)}
										className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
									>
										<option value="">— Pilih item tarif —</option>
										{feeItemsByCategory.map(([cat, items]) => (
											<optgroup key={cat} label={CATEGORY_LABELS[cat] || cat}>
												{(items as any[]).map((fi: any) => (
													<option key={fi.id} value={fi.id.toString()}>
														{fi.name} — {formatCurrency(Number(fi.amount) || 0)}
														{isQuantityBasedUnit(fi.unit)
															? ` /${feeItemUnitLabel(fi.unit)}`
															: ""}
													</option>
												))}
											</optgroup>
										))}
									</select>
									{quantityBased && (
										<input
											type="number"
											min={0}
											value={quantity}
											onChange={(e) => setQuantity(e.target.value)}
											placeholder={feeItemUnitLabel(selectedFeeItem?.unit)}
											className="w-24 rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
										/>
									)}
									<Button
										type="button"
										variant="secondary"
										onClick={handleAddItem}
									>
										Tambah
									</Button>
								</div>

								{itemRows.length > 0 && (
									<ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
										{itemRows.map((row) => (
											<li
												key={row.key}
												className="flex items-center justify-between gap-3 px-3 py-2"
											>
												<div className="min-w-0">
													<p className="truncate text-sm text-gray-900">
														{row.name}
													</p>
													{row.quantity != null && row.unitPrice != null && (
														<p className="text-xs text-gray-500">
															{row.quantity} × {formatCurrency(row.unitPrice)}
														</p>
													)}
												</div>
												<div className="flex items-center gap-3">
													<span className="text-sm font-medium text-gray-900">
														{formatCurrency(row.amount)}
													</span>
													<button
														type="button"
														onClick={() => handleRemoveItem(row.key)}
														className="text-gray-400 hover:text-red-600"
														aria-label={`Hapus ${row.name}`}
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
											</li>
										))}
									</ul>
								)}

								<div className="flex items-center justify-between border-t border-gray-200 pt-3">
									<span className="text-sm font-medium text-gray-700">
										Total Tagihan
									</span>
									<span className="text-lg font-semibold text-gray-900">
										{formatCurrency(itemizedTotal)}
									</span>
								</div>
							</div>
						)}
					</>
				)}

				<div>
					<Label htmlFor="manual-invoice-notes">
						Keterangan
						{mode === "total" && <span className="text-red-500"> *</span>}
					</Label>
					<textarea
						id="manual-invoice-notes"
						rows={3}
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder={
							mode === "total"
								? "e.g. Tunggakan SPP Ganjil 2024/2025"
								: "Opsional"
						}
						className="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
					/>
				</div>

				<FormField
					id="manual-invoice-due-date"
					type="date"
					label="Jatuh Tempo (opsional)"
					value={dueDate}
					onChange={(e) => setDueDate(e.target.value)}
				/>
			</form>
		</SlideOver>
	);
}
