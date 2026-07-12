import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Edit, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
	getGetV1FeeConfigsIdItemsQueryKey,
	useDeleteV1FeeConfigsIdItemsItemId,
	useGetV1FeeConfigsId,
	useGetV1FeeConfigsIdItems,
	usePostV1FeeConfigsIdItems,
	usePutV1FeeConfigsId,
	usePutV1FeeConfigsIdItemsItemId,
} from "#/api/endpoints/fee-configs/fee-configs";
import type { DtoFeeConfigItemResponse } from "#/api/model";
import {
	DtoCreateFeeConfigItemRequestCategory,
	DtoCreateFeeConfigItemRequestGender,
	DtoCreateFeeConfigItemRequestLevel,
	DtoCreateFeeConfigItemRequestUnit,
} from "#/api/model";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Badge,
	Button,
	ConfirmDialog,
	FormField,
	SlideOver,
	useToast,
} from "#/components/ui";
import { hasModule } from "#/features/auth/access";
import { useProducts } from "#/features/koperasi/barang/api";

export const Route = createFileRoute("/_authenticated/pengaturan/tarif/$id")({
	beforeLoad: () => {
		if (!hasModule("keuangan")) throw redirect({ to: "/" });
	},
	component: PengaturanTarifIdComponent,
});

const CATEGORY_LABELS: Record<string, string> = {
	initial: "Biaya Awal",
	registration: "Biaya Registrasi",
	monthly_spp: "SPP Bulanan",
	monthly_infaq: "Infaq Bulanan",
	pasta: "PASTA",
	savings_mandatory: "Tabungan Wajib",
	daycare: "Daycare",
	facility: "Fasilitas",
	graduation: "Wisuda",
};

// Categories that are flat list
const FLAT_CATEGORIES = [
	"monthly_spp",
	"monthly_infaq",
	"pasta",
	"savings_mandatory",
	"daycare",
	"facility",
	"graduation",
];

const LEVELS = ["mutiara", "intan", "berlian"];
const LEVEL_LABELS: Record<string, string> = {
	mutiara: "Mutiara",
	intan: "Intan",
	berlian: "Berlian",
};
const GENDERS = ["L", "P"];
const GENDER_LABELS: Record<string, string> = {
	L: "Laki-laki",
	P: "Perempuan",
};
const UNIT_LABELS: Record<string, string> = {
	fixed: "Tetap",
	per_day: "Per Hari",
	per_monday: "Per Senin",
	percent: "Persen",
};

function formatCurrency(amount: number) {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
	}).format(amount);
}

function PengaturanTarifIdComponent() {
	const { id } = Route.useParams();
	const configId = Number(id);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [isEditingRate, setIsEditingRate] = useState(false);
	const [savingsRate, setSavingsRate] = useState(0);

	const [isItemFormOpen, setIsItemFormOpen] = useState(false);
	const [editingItem, setEditingItem] =
		useState<DtoFeeConfigItemResponse | null>(null);
	const [formCategory, setFormCategory] = useState("");

	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [itemToDelete, setItemToDelete] =
		useState<DtoFeeConfigItemResponse | null>(null);

	const { data: fcResponse } = useGetV1FeeConfigsId(configId);
	const feeConfig = (fcResponse?.data as any)?.data;

	const { data: itemsResponse } = useGetV1FeeConfigsIdItems(
		configId,
		undefined,
		{ query: { enabled: !!configId } } as any,
	);
	const allItems: DtoFeeConfigItemResponse[] =
		(itemsResponse?.data as any)?.data || [];

	useEffect(() => {
		if (feeConfig) setSavingsRate(feeConfig.savings_admin_rate || 0);
	}, [feeConfig]);

	// --- Mutations ---
	const updateRateMutation = usePutV1FeeConfigsId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Tarif diperbarui.",
				});
				setIsEditingRate(false);
			},
		},
	});

	const createItemMutation = usePostV1FeeConfigsIdItems({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Item ditambahkan.",
				});
				setIsItemFormOpen(false);
				queryClient.invalidateQueries({
					queryKey: getGetV1FeeConfigsIdItemsQueryKey(configId),
				});
			},
			onError: (e: Error) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message: e instanceof ApiError ? e.message : "Error",
				}),
		},
	});

	const updateItemMutation = usePutV1FeeConfigsIdItemsItemId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Item diperbarui.",
				});
				setIsItemFormOpen(false);
				queryClient.invalidateQueries({
					queryKey: getGetV1FeeConfigsIdItemsQueryKey(configId),
				});
			},
			onError: (e: Error) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message: e instanceof ApiError ? e.message : "Error",
				}),
		},
	});

	const deleteItemMutation = useDeleteV1FeeConfigsIdItemsItemId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Item dihapus.",
				});
				setIsDeleteOpen(false);
				queryClient.invalidateQueries({
					queryKey: getGetV1FeeConfigsIdItemsQueryKey(configId),
				});
			},
			onError: (e: Error) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message: e instanceof ApiError ? e.message : "Error",
				}),
		},
	});

	const openCreateForm = (category: string) => {
		setEditingItem(null);
		setFormCategory(category);
		setIsItemFormOpen(true);
	};
	const openEditForm = (item: DtoFeeConfigItemResponse) => {
		setEditingItem(item);
		setFormCategory(item.category || "");
		setIsItemFormOpen(true);
	};
	const openDelete = (item: DtoFeeConfigItemResponse) => {
		setItemToDelete(item);
		setIsDeleteOpen(true);
	};

	// Group items
	const itemsByCategory: Record<string, DtoFeeConfigItemResponse[]> = {};
	for (const item of allItems) {
		const cat = item.category || "";
		if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
		itemsByCategory[cat].push(item);
	}

	// Compute registration totals per level × gender
	const regTotals: Record<string, Record<string, number>> = {};
	for (const level of LEVELS) {
		regTotals[level] = {};
		for (const gender of GENDERS) {
			regTotals[level][gender] = (itemsByCategory["registration"] || [])
				.filter(
					(i) =>
						(i.level === level || i.level === "all") &&
						(i.gender === gender || i.gender === "all"),
				)
				.reduce((sum, i) => sum + (i.amount || 0), 0);
		}
	}

	// Initial total
	const initialTotal = (itemsByCategory["initial"] || []).reduce(
		(sum, i) => sum + (i.amount || 0),
		0,
	);

	return (
		<div className="max-w-5xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<button
						onClick={() => navigate({ to: "/pengaturan/tarif" })}
						className="text-gray-400 hover:text-gray-600"
					>
						<ArrowLeft className="h-5 w-5" />
					</button>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							{feeConfig?.academic_year?.name || "Tarif"}
						</h1>
						<p className="text-sm text-gray-500">
							Kelola nominal tarif per kategori, jenjang, dan gender.
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{isEditingRate ? (
						<>
							<FormField
								id="rate"
								type="number"
								label=""
								value={savingsRate}
								onChange={(e) => setSavingsRate(Number(e.target.value))}
								className="w-24"
							/>
							<Button
								size="sm"
								variant="primary"
								onClick={() =>
									updateRateMutation.mutate({
										id: configId,
										data: { savings_admin_rate: savingsRate },
									})
								}
								disabled={updateRateMutation.isPending}
							>
								<Save className="h-4 w-4 mr-1" />
								Simpan
							</Button>
							<Button
								size="sm"
								variant="secondary"
								onClick={() => setIsEditingRate(false)}
							>
								<X className="h-4 w-4" />
							</Button>
						</>
					) : (
						<div className="text-sm text-gray-500">
							Admin Tabungan: {feeConfig?.savings_admin_rate || 0}%{" "}
							<button
								onClick={() => setIsEditingRate(true)}
								className="ml-2 text-indigo-600 hover:underline"
							>
								<Edit className="h-3 w-3 inline" />
							</button>
						</div>
					)}
				</div>
			</div>

			{/* ========== SECTION 1: Biaya Awal & Registrasi (total per jenjang) ========== */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
				<h2 className="text-lg font-semibold text-gray-900 mb-4">
					Ringkasan Biaya per Jenjang
				</h2>

				{/* Biaya Awal */}
				<div className="mb-6">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
							Biaya Awal
						</h3>
						<Button
							size="sm"
							variant="secondary"
							onClick={() => openCreateForm("initial")}
						>
							<Plus className="h-3 w-3 mr-1" />
							Tambah
						</Button>
					</div>
					<div className="bg-gray-50 rounded-lg p-4">
						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-600">
								Total (sama untuk semua jenjang & gender)
							</span>
							<span className="text-2xl font-bold text-gray-900">
								{formatCurrency(initialTotal)}
							</span>
						</div>
						{/* Items table */}
						{(itemsByCategory["initial"] || []).length > 0 && (
							<table className="mt-3 w-full text-sm">
								<thead>
									<tr className="text-gray-500">
										<th className="text-left font-medium py-1">Item</th>
										<th className="text-right font-medium py-1">Nominal</th>
										<th className="text-right font-medium py-1 w-16"></th>
									</tr>
								</thead>
								<tbody>
									{(itemsByCategory["initial"] || []).map((item) => (
										<tr key={item.id} className="border-t border-gray-100">
											<td className="py-1.5">{item.name}</td>
											<td className="text-right py-1.5">
												{formatCurrency(item.amount || 0)}
											</td>
											<td className="text-right py-1.5">
												<button
													onClick={() => openEditForm(item)}
													className="text-gray-400 hover:text-indigo-600"
												>
													<Edit className="h-3.5 w-3.5" />
												</button>
												<button
													onClick={() => openDelete(item)}
													className="ml-2 text-gray-400 hover:text-red-600"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>

				{/* Biaya Registrasi */}
				<div>
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
							Biaya Registrasi
						</h3>
						<Button
							size="sm"
							variant="secondary"
							onClick={() => openCreateForm("registration")}
						>
							<Plus className="h-3 w-3 mr-1" />
							Tambah
						</Button>
					</div>
					<div className="grid grid-cols-3 gap-3">
						{LEVELS.map((level) => (
							<div key={level} className="bg-gray-50 rounded-lg p-4">
								<h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
									{LEVEL_LABELS[level]}
								</h4>
								<div className="space-y-1">
									{GENDERS.map((gender) => (
										<div key={gender} className="flex justify-between text-sm">
											<span className="text-gray-500">
												{GENDER_LABELS[gender]}
											</span>
											<span className="font-semibold text-gray-900">
												{formatCurrency(regTotals[level]?.[gender] || 0)}
											</span>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
					{/* Registration items detail */}
					{(itemsByCategory["registration"] || []).length > 0 && (
						<div className="mt-3">
							<details className="group">
								<summary className="text-sm text-indigo-600 cursor-pointer hover:text-indigo-800">
									Lihat rincian item
								</summary>
								<table className="mt-2 w-full text-sm">
									<thead>
										<tr className="text-gray-500">
											<th className="text-left font-medium py-1">Item</th>
											<th className="text-center font-medium py-1">Jenjang</th>
											<th className="text-center font-medium py-1">Gender</th>
											<th className="text-right font-medium py-1">Nominal</th>
											<th className="w-16"></th>
										</tr>
									</thead>
									<tbody>
										{(itemsByCategory["registration"] || []).map((item) => (
											<tr key={item.id} className="border-t border-gray-100">
												<td className="py-1.5">{item.name}</td>
												<td className="text-center py-1.5">
													<Badge variant="secondary">
														{LEVEL_LABELS[item.level || "all"] || item.level}
													</Badge>
												</td>
												<td className="text-center py-1.5">
													<Badge variant="secondary">
														{GENDER_LABELS[item.gender || "all"] || item.gender}
													</Badge>
												</td>
												<td className="text-right py-1.5">
													{formatCurrency(item.amount || 0)}
												</td>
												<td className="text-right py-1.5">
													<button
														onClick={() => openEditForm(item)}
														className="text-gray-400 hover:text-indigo-600"
													>
														<Edit className="h-3.5 w-3.5" />
													</button>
													<button
														onClick={() => openDelete(item)}
														className="ml-2 text-gray-400 hover:text-red-600"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</details>
						</div>
					)}
				</div>
			</div>

			{/* ========== SECTION 2: Flat items per category ========== */}
			{FLAT_CATEGORIES.map((cat) => {
				const items = itemsByCategory[cat] || [];
				return (
					<div
						key={cat}
						className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6"
					>
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
								{CATEGORY_LABELS[cat] || cat}
							</h3>
							<Button
								size="sm"
								variant="secondary"
								onClick={() => openCreateForm(cat)}
							>
								<Plus className="h-3 w-3 mr-1" />
								Tambah Item
							</Button>
						</div>
						{items.length === 0 ? (
							<p className="text-sm text-gray-400">Belum ada item.</p>
						) : (
							<table className="w-full text-sm">
								<thead>
									<tr className="text-gray-500">
										<th className="text-left font-medium py-1">Item</th>
										<th className="text-center font-medium py-1">Jenjang</th>
										<th className="text-center font-medium py-1">Gender</th>
										<th className="text-right font-medium py-1">Nominal</th>
										<th className="w-16"></th>
									</tr>
								</thead>
								<tbody>
									{items.map((item) => (
										<tr key={item.id} className="border-t border-gray-100">
											<td className="py-1.5">
												{item.name}
												{item.is_mandatory && (
													<span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
														Wajib
													</span>
												)}
											</td>
											<td className="text-center py-1.5">
												<Badge variant="secondary">
													{LEVEL_LABELS[item.level || "all"] || item.level}
												</Badge>
											</td>
											<td className="text-center py-1.5">
												<Badge variant="secondary">
													{GENDER_LABELS[item.gender || "all"] || item.gender}
												</Badge>
											</td>
											<td className="text-right py-1.5">
												{formatCurrency(item.amount || 0)}
											</td>
											<td className="text-right py-1.5">
												<button
													onClick={() => openEditForm(item)}
													className="text-gray-400 hover:text-indigo-600"
												>
													<Edit className="h-3.5 w-3.5" />
												</button>
												<button
													onClick={() => openDelete(item)}
													className="ml-2 text-gray-400 hover:text-red-600"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				);
			})}

			{/* ========== Item Form SlideOver ========== */}
			<SlideOver
				isOpen={isItemFormOpen}
				onClose={() => setIsItemFormOpen(false)}
				title={editingItem ? "Edit Item Tarif" : "Tambah Item Tarif"}
				footer={
					<>
						<Button
							variant="secondary"
							onClick={() => setIsItemFormOpen(false)}
						>
							Batal
						</Button>
						<Button variant="primary" form="item-form" type="submit">
							{createItemMutation.isPending || updateItemMutation.isPending
								? "Menyimpan..."
								: "Simpan"}
						</Button>
					</>
				}
			>
				<ItemFormSlideOver
					initialData={editingItem}
					defaultCategory={formCategory}
					onSave={(data) => {
						if (editingItem) {
							updateItemMutation.mutate({
								id: configId,
								itemId: editingItem.id as number,
								data,
							});
						} else {
							createItemMutation.mutate({ id: configId, data });
						}
					}}
				/>
			</SlideOver>

			{/* Delete Confirm */}
			<ConfirmDialog
				open={isDeleteOpen}
				onCancel={() => setIsDeleteOpen(false)}
				onConfirm={() =>
					itemToDelete &&
					deleteItemMutation.mutate({
						id: configId,
						itemId: itemToDelete.id as number,
					})
				}
				title="Hapus Item Tarif"
				variant="danger"
			>
				<p>
					Hapus <strong>{itemToDelete?.name}</strong>?
				</p>
			</ConfirmDialog>
		</div>
	);
}

// Inline item form
function ItemFormSlideOver({
	initialData,
	defaultCategory,
	onSave,
}: {
	initialData: DtoFeeConfigItemResponse | null;
	defaultCategory: string;
	onSave: (data: any) => void;
}) {
	const [form, setForm] = useState<any>({
		category: initialData?.category || defaultCategory || "initial",
		item_key: initialData?.item_key || "",
		name: initialData?.name || "",
		level: initialData?.level || "all",
		gender: initialData?.gender || "all",
		amount: initialData?.amount || 0,
		unit: initialData?.unit || "fixed",
		is_mandatory: initialData?.is_mandatory || false,
		is_koperasi: (initialData as any)?.is_koperasi || false,
		koperasi_product_id: (initialData as any)?.koperasi_product_id || null,
	});
	const { data: products } = useProducts();

	const categories = Object.entries(DtoCreateFeeConfigItemRequestCategory).map(
		([k]) => k,
	);
	const levels = Object.entries(DtoCreateFeeConfigItemRequestLevel).map(
		([k]) => k,
	);
	const genders = Object.entries(DtoCreateFeeConfigItemRequestGender).map(
		([k]) => k,
	);
	const units = Object.entries(DtoCreateFeeConfigItemRequestUnit).map(
		([k]) => k,
	);

	// Remove calisan/ekskul from category options
	const visibleCategories = categories.filter(
		(c) => c !== "calisan" && c !== "ekskul",
	);

	return (
		<form
			id="item-form"
			onSubmit={(e) => {
				e.preventDefault();
				onSave(form);
			}}
			className="space-y-4"
		>
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Kategori
				</label>
				<select
					value={form.category}
					onChange={(e) => setForm({ ...form, category: e.target.value })}
					className="block w-full rounded-md border-gray-300 text-sm"
					required
				>
					{visibleCategories.map((c) => (
						<option key={c} value={c}>
							{CATEGORY_LABELS[c] || c}
						</option>
					))}
				</select>
			</div>
			<FormField
				id="item_key"
				label="Item Key"
				value={form.item_key}
				onChange={(e) => setForm({ ...form, item_key: e.target.value })}
				required
			/>
			<FormField
				id="name"
				label="Nama"
				value={form.name}
				onChange={(e) => setForm({ ...form, name: e.target.value })}
				required
			/>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Jenjang
					</label>
					<select
						value={form.level}
						onChange={(e) => setForm({ ...form, level: e.target.value })}
						className="block w-full rounded-md border-gray-300 text-sm"
					>
						{levels.map((l) => (
							<option key={l} value={l}>
								{LEVEL_LABELS[l] || l}
							</option>
						))}
					</select>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Gender
					</label>
					<select
						value={form.gender}
						onChange={(e) => setForm({ ...form, gender: e.target.value })}
						className="block w-full rounded-md border-gray-300 text-sm"
					>
						{genders.map((g) => (
							<option key={g} value={g}>
								{GENDER_LABELS[g] || g}
							</option>
						))}
					</select>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<FormField
					id="amount"
					type="number"
					label="Nominal (Rp)"
					value={form.amount}
					onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
					required
				/>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Unit
					</label>
					<select
						value={form.unit}
						onChange={(e) => setForm({ ...form, unit: e.target.value })}
						className="block w-full rounded-md border-gray-300 text-sm"
					>
						{units.map((u) => (
							<option key={u} value={u}>
								{UNIT_LABELS[u] || u}
							</option>
						))}
					</select>
				</div>
			</div>
			<label className="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={form.is_mandatory}
					onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })}
					className="rounded"
				/>
				Wajib (auto masuk tagihan)
			</label>
			<label className="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={form.is_koperasi}
					onChange={(e) => setForm({ ...form, is_koperasi: e.target.checked })}
					className="rounded"
				/>
				Koperasi
			</label>
			{form.is_koperasi && (
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Produk Koperasi
					</label>
					<select
						value={form.koperasi_product_id || ""}
						onChange={(e) =>
							setForm({
								...form,
								koperasi_product_id: e.target.value
									? Number(e.target.value)
									: null,
							})
						}
						className="block w-full rounded-md border-gray-300 text-sm"
					>
						<option value="">-- Pilih --</option>
						{(products || []).map((p: any) => (
							<option key={p.id} value={p.id}>
								{p.name}
							</option>
						))}
					</select>
				</div>
			)}
		</form>
	);
}
