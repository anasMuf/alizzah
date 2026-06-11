import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Edit, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
	getGetV1FeeConfigsIdItemsQueryKey,
	getGetV1FeeConfigsIdQueryKey,
	useDeleteV1FeeConfigsIdItemsItemId,
	useGetV1FeeConfigsId,
	useGetV1FeeConfigsIdItems,
	usePostV1FeeConfigsIdItems,
	usePutV1FeeConfigsId,
	usePutV1FeeConfigsIdItemsItemId,
} from "../../../../api/endpoints/fee-configs/fee-configs";
import type {
	DtoCreateFeeConfigItemRequest,
	DtoFeeConfigItemResponse,
} from "../../../../api/model";
import {
	DtoCreateFeeConfigItemRequestCategory,
	DtoCreateFeeConfigItemRequestGender,
	DtoCreateFeeConfigItemRequestLevel,
	DtoCreateFeeConfigItemRequestUnit,
} from "../../../../api/model";
import { ApiError } from "../../../../api/mutator/custom-instance";
import { Badge } from "@alizzah/ui";
import { Button } from "@alizzah/ui";
import { ConfirmDialog } from "@alizzah/ui";
import { EmptyState } from "@alizzah/ui";
import { FormField } from "@alizzah/ui";
import { SlideOver } from "@alizzah/ui";
import { useToast } from "@alizzah/ui";

export const Route = createFileRoute("/_authenticated/pengaturan/tarif/$id")({
	beforeLoad: () => {
		const role = localStorage.getItem("alizzah_role");
		if (role !== "superadmin") {
			throw redirect({ to: "/" });
		}
	},
	component: PengaturanTarifIdComponent,
});

const CATEGORY_LABELS: Record<string, string> = {
	initial: "Biaya Awal",
	registration: "Pendaftaran",
	monthly_spp: "SPP Bulanan",
	monthly_infaq: "Infaq Bulanan",
	pasta: "PASTA",
	calisan: "CALISAN",
	ekskul: "Ekskul",
	savings_mandatory: "Tabungan Wajib",
	daycare: "Daycare",
	graduation: "Wisuda",
};

const LEVEL_LABELS: Record<string, string> = {
	all: "Semua",
	mutiara: "Mutiara",
	intan: "Intan",
	berlian: "Berlian",
};

const GENDER_LABELS: Record<string, string> = {
	all: "Semua",
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

	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [itemToDelete, setItemToDelete] =
		useState<DtoFeeConfigItemResponse | null>(null);

	const [filterCategory, setFilterCategory] = useState("");

	const { data: configResponse, isLoading: configLoading } =
		useGetV1FeeConfigsId(configId);
	const config = (configResponse?.data as any)?.data;

	const { data: itemsResponse, isLoading: itemsLoading } =
		useGetV1FeeConfigsIdItems(
			configId,
			filterCategory ? { category: filterCategory } : undefined,
		);
	const items: DtoFeeConfigItemResponse[] =
		(itemsResponse?.data as any)?.data || [];

	useEffect(() => {
		if (config) setSavingsRate(config.savings_admin_rate ?? 0);
	}, [config]);

	const invalidateConfig = () =>
		queryClient.invalidateQueries({
			queryKey: getGetV1FeeConfigsIdQueryKey(configId),
		});
	const invalidateItems = () =>
		queryClient.invalidateQueries({
			queryKey: getGetV1FeeConfigsIdItemsQueryKey(configId),
		});

	const updateConfigMutation = usePutV1FeeConfigsId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Rate admin tabungan berhasil diperbarui.",
				});
				invalidateConfig();
				setIsEditingRate(false);
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal memperbarui konfigurasi.";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const deleteItemMutation = useDeleteV1FeeConfigsIdItemsItemId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Item tarif berhasil dihapus.",
				});
				invalidateItems();
				setIsDeleteOpen(false);
				setItemToDelete(null);
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal menghapus item tarif.";
				addToast({ variant: "error", title: "Gagal", message: msg });
				setIsDeleteOpen(false);
			},
		},
	});

	const isLoading = configLoading || itemsLoading;

	if (isLoading) {
		return (
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 h-64 animate-pulse" />
		);
	}

	if (!config) {
		return (
			<EmptyState
				title="Konfigurasi tidak ditemukan"
				description="Konfigurasi tarif dengan ID ini tidak ditemukan."
				action={
					<Button
						variant="secondary"
						onClick={() => navigate({ to: "/pengaturan/tarif" })}
					>
						Kembali
					</Button>
				}
			/>
		);
	}

	const groupedItems = items.reduce<Record<string, DtoFeeConfigItemResponse[]>>(
		(acc, item) => {
			const cat = item.category || "other";
			if (!acc[cat]) acc[cat] = [];
			acc[cat].push(item);
			return acc;
		},
		{},
	);

	return (
		<div className="space-y-6">
			<div>
				<button
					onClick={() => navigate({ to: "/pengaturan/tarif" })}
					className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
				>
					<ArrowLeft className="h-4 w-4" />
					Kembali ke Daftar Tarif
				</button>

				<div className="sm:flex sm:items-center sm:justify-between">
					<div>
						<h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
							Tarif {config.academic_year?.name}
						</h1>
						<p className="mt-1 text-sm text-gray-500">
							Kelola item-item tarif biaya pendidikan.
						</p>
					</div>
					<div className="mt-4 sm:ml-4 sm:mt-0">
						<Button
							onClick={() => {
								setEditingItem(null);
								setIsItemFormOpen(true);
							}}
							className="flex items-center gap-2"
						>
							<Plus className="h-4 w-4" />
							Tambah Item
						</Button>
					</div>
				</div>
			</div>

			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-5">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-sm font-medium text-gray-500">
							Rate Admin Tabungan
						</h2>
						{isEditingRate ? (
							<div className="flex items-center gap-2 mt-1">
								<input
									type="number"
									min={0}
									max={100}
									step={0.1}
									value={savingsRate}
									onChange={(e) => setSavingsRate(Number(e.target.value))}
									className="w-24 rounded-md border-0 py-1 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
								/>
								<span className="text-sm text-gray-500">%</span>
								<button
									onClick={() =>
										updateConfigMutation.mutate({
											id: configId,
											data: { savings_admin_rate: savingsRate },
										})
									}
									className="p-1 text-green-600 hover:text-green-700"
								>
									<Save className="h-4 w-4" />
								</button>
								<button
									onClick={() => {
										setSavingsRate(config.savings_admin_rate ?? 0);
										setIsEditingRate(false);
									}}
									className="p-1 text-gray-400 hover:text-gray-600"
								>
									<X className="h-4 w-4" />
								</button>
							</div>
						) : (
							<div className="flex items-center gap-2 mt-1">
								<p className="text-2xl font-bold text-gray-900">
									{config.savings_admin_rate ?? 0}%
								</p>
								<button
									onClick={() => setIsEditingRate(true)}
									className="p-1 text-gray-400 hover:text-indigo-600"
								>
									<Edit className="h-4 w-4" />
								</button>
							</div>
						)}
					</div>
					<div className="text-right">
						<p className="text-sm text-gray-500">Total Item</p>
						<p className="text-2xl font-bold text-gray-900">{items.length}</p>
					</div>
				</div>
			</div>

			<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5">
				<div className="flex gap-2 flex-wrap">
					<button
						onClick={() => setFilterCategory("")}
						className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
							!filterCategory
								? "bg-indigo-100 text-indigo-700 ring-1 ring-inset ring-indigo-600/20"
								: "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
						}`}
					>
						Semua
					</button>
					{Object.entries(CATEGORY_LABELS).map(([key, label]) => (
						<button
							key={key}
							onClick={() => setFilterCategory(key)}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								filterCategory === key
									? "bg-indigo-100 text-indigo-700 ring-1 ring-inset ring-indigo-600/20"
									: "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
							}`}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			{items.length === 0 ? (
				<EmptyState
					title="Tidak ada item tarif"
					description={
						filterCategory
							? "Tidak ada item untuk kategori ini."
							: "Belum ada item tarif yang ditambahkan."
					}
					action={
						!filterCategory ? (
							<Button
								onClick={() => {
									setEditingItem(null);
									setIsItemFormOpen(true);
								}}
								className="flex items-center gap-2"
							>
								<Plus className="h-4 w-4" />
								Tambah Item
							</Button>
						) : undefined
					}
				/>
			) : filterCategory ? (
				<ItemTable
					items={items}
					onEdit={(item) => {
						setEditingItem(item);
						setIsItemFormOpen(true);
					}}
					onDelete={(item) => {
						setItemToDelete(item);
						setIsDeleteOpen(true);
					}}
				/>
			) : (
				Object.entries(groupedItems).map(([category, catItems]) => (
					<div key={category} className="space-y-2">
						<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
							{CATEGORY_LABELS[category] || category}
						</h3>
						<ItemTable
							items={catItems}
							onEdit={(item) => {
								setEditingItem(item);
								setIsItemFormOpen(true);
							}}
							onDelete={(item) => {
								setItemToDelete(item);
								setIsDeleteOpen(true);
							}}
						/>
					</div>
				))
			)}

			<ItemFormSlideOver
				isOpen={isItemFormOpen}
				onClose={() => setIsItemFormOpen(false)}
				configId={configId}
				initialData={editingItem}
				onSuccess={invalidateItems}
			/>

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
				confirmLabel="Hapus"
				cancelLabel="Batal"
			>
				<p>
					Anda yakin ingin menghapus <strong>{itemToDelete?.name}</strong>? Item
					yang sudah digunakan pada tagihan tidak dapat dihapus.
				</p>
			</ConfirmDialog>
		</div>
	);
}

function ItemTable({
	items,
	onEdit,
	onDelete,
}: {
	items: DtoFeeConfigItemResponse[];
	onEdit: (item: DtoFeeConfigItemResponse) => void;
	onDelete: (item: DtoFeeConfigItemResponse) => void;
}) {
	return (
		<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
			<table className="min-w-full divide-y divide-gray-200">
				<thead className="bg-gray-50">
					<tr>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Nama
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Kategori
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Level
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Gender
						</th>
						<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
							Nominal
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Satuan
						</th>
						<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
							Aksi
						</th>
					</tr>
				</thead>
				<tbody className="bg-white divide-y divide-gray-200">
					{items.map((item) => (
						<tr key={item.id} className="hover:bg-gray-50">
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="text-sm font-medium text-gray-900">
									{item.name}
								</div>
								<div className="text-xs text-gray-400">{item.item_key}</div>
							</td>
							<td className="px-6 py-4 whitespace-nowrap">
								<Badge variant="secondary">
									{CATEGORY_LABELS[item.category || ""] || item.category}
								</Badge>
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{LEVEL_LABELS[item.level || ""] || item.level}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{GENDER_LABELS[item.gender || ""] || item.gender}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
								{item.unit === "percent"
									? `${item.amount}%`
									: formatCurrency(item.amount ?? 0)}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{UNIT_LABELS[item.unit || ""] || item.unit}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-right">
								<div className="flex justify-end gap-2">
									<button
										onClick={() => onEdit(item)}
										className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
									>
										<Edit className="h-4 w-4" />
									</button>
									<button
										onClick={() => onDelete(item)}
										className="p-1.5 text-gray-400 hover:text-red-600 rounded"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function ItemFormSlideOver({
	isOpen,
	onClose,
	configId,
	initialData,
	onSuccess,
}: {
	isOpen: boolean;
	onClose: () => void;
	configId: number;
	initialData: DtoFeeConfigItemResponse | null;
	onSuccess: () => void;
}) {
	const { addToast } = useToast();
	const isEditing = !!initialData;

	const [formData, setFormData] = useState<DtoCreateFeeConfigItemRequest>({
		name: "",
		item_key: "",
		category: "initial",
		amount: 0,
		level: "all",
		gender: "all",
		unit: "fixed",
	});

	useEffect(() => {
		if (isOpen) {
			if (initialData) {
				setFormData({
					name: initialData.name || "",
					item_key: initialData.item_key || "",
					category: (initialData.category as any) || "initial",
					amount: initialData.amount || 0,
					level: (initialData.level as any) || "all",
					gender: (initialData.gender as any) || "all",
					unit: (initialData.unit as any) || "fixed",
				});
			} else {
				setFormData({
					name: "",
					item_key: "",
					category: "initial",
					amount: 0,
					level: "all",
					gender: "all",
					unit: "fixed",
				});
			}
		}
	}, [isOpen, initialData]);

	const createMutation = usePostV1FeeConfigsIdItems({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Item tarif berhasil ditambahkan.",
				});
				onSuccess();
				onClose();
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal menambahkan item tarif.";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const updateMutation = usePutV1FeeConfigsIdItemsItemId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Item tarif berhasil diperbarui.",
				});
				onSuccess();
				onClose();
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal memperbarui item tarif.";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isEditing && initialData) {
			updateMutation.mutate({
				id: configId,
				itemId: initialData.id as number,
				data: formData,
			});
		} else {
			createMutation.mutate({ id: configId, data: formData });
		}
	};

	const update = (field: keyof DtoCreateFeeConfigItemRequest, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title={isEditing ? "Edit Item Tarif" : "Tambah Item Tarif"}
			size="lg"
			footer={
				<>
					<Button variant="secondary" onClick={onClose} disabled={isPending}>
						Batal
					</Button>
					<Button variant="primary" onClick={handleSubmit} disabled={isPending}>
						{isPending ? "Menyimpan..." : "Simpan"}
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<FormField
					id="name"
					name="name"
					label="Nama Item"
					placeholder="e.g. SPP Bulanan Mutiara"
					value={formData.name}
					onChange={(e) => update("name", e.target.value)}
					required
					maxLength={100}
				/>
				<FormField
					id="item_key"
					name="item_key"
					label="Kode Item"
					placeholder="e.g. spp_mutiara"
					value={formData.item_key}
					onChange={(e) => update("item_key", e.target.value)}
					required
					maxLength={50}
				/>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<label
							htmlFor="category"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Kategori
						</label>
						<select
							id="category"
							value={formData.category}
							onChange={(e) => update("category", e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							required
						>
							{Object.entries(DtoCreateFeeConfigItemRequestCategory).map(
								([, val]) => (
									<option key={val} value={val}>
										{CATEGORY_LABELS[val] || val}
									</option>
								),
							)}
						</select>
					</div>
					<div>
						<label
							htmlFor="unit"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Satuan
						</label>
						<select
							id="unit"
							value={formData.unit}
							onChange={(e) => update("unit", e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							required
						>
							{Object.entries(DtoCreateFeeConfigItemRequestUnit).map(
								([, val]) => (
									<option key={val} value={val}>
										{UNIT_LABELS[val] || val}
									</option>
								),
							)}
						</select>
					</div>
				</div>

				<div>
					<label
						htmlFor="amount"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						{formData.unit === "percent" ? "Persentase (%)" : "Nominal (Rp)"}
					</label>
					<input
						id="amount"
						type="number"
						min={0}
						step={formData.unit === "percent" ? 0.1 : 1000}
						value={formData.amount}
						onChange={(e) => update("amount", Number(e.target.value))}
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						required
					/>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<label
							htmlFor="level"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Level
						</label>
						<select
							id="level"
							value={formData.level}
							onChange={(e) => update("level", e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							required
						>
							{Object.entries(DtoCreateFeeConfigItemRequestLevel).map(
								([, val]) => (
									<option key={val} value={val}>
										{LEVEL_LABELS[val] || val}
									</option>
								),
							)}
						</select>
					</div>
					<div>
						<label
							htmlFor="gender"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Gender
						</label>
						<select
							id="gender"
							value={formData.gender}
							onChange={(e) => update("gender", e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							required
						>
							{Object.entries(DtoCreateFeeConfigItemRequestGender).map(
								([, val]) => (
									<option key={val} value={val}>
										{GENDER_LABELS[val] || val}
									</option>
								),
							)}
						</select>
					</div>
				</div>
			</form>
		</SlideOver>
	);
}
