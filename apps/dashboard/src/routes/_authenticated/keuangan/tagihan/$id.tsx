import { createFileRoute, Link } from "@tanstack/react-router";
import {
	CalendarDays,
	ChevronDown,
	ChevronRight,
	Edit2,
	Plus,
	Printer,
	Trash2,
} from "lucide-react";
import { useMemo } from "react";
import {
	Badge,
	Button,
	ConfirmDialog,
	FormField,
	SlideOver,
} from "#/components/ui";
import { useTagihanDetail } from "#/features/keuangan/tagihan/hooks/useTagihanDetail";
import { formatCurrency, formatDate } from "@/utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/tagihan/$id")({
	component: DetailTagihanPage,
});

function DetailTagihanPage() {
	const { id: routeId } = Route.useParams();
	const d = useTagihanDetail(Number(routeId));
	const toggleInvoiceCat = (cat: string) =>
		d.setExpandedInvoiceCats((prev: Record<string, boolean>) => ({
			...prev,
			[cat]: !prev[cat],
		}));
	const calculatedAmount = useMemo(() => {
		if (!d.selectedFeeItem) return 0;
		if (
			d.selectedFeeItem.unit === "per_day" ||
			d.selectedFeeItem.unit === "per_monday"
		)
			return d.selectedFeeItem.amount * (Number(d.unitQuantity) || 0);
		return d.selectedFeeItem.amount;
	}, [d.selectedFeeItem, d.unitQuantity]);
	const canSubmit = useMemo(() => {
		if (d.editingItem) {
			if (d.editingItem.quantity != null && d.editingItem.unit_price != null)
				return Number(d.unitQuantity) > 0;
			return !!d.itemName && Number(d.itemAmount) > 0;
		}
		if (!d.selectedFeeItemId) return false;
		if (d.selectedFeeItemId === "custom")
			return !!d.itemName && Number(d.itemAmount) > 0;
		if (
			d.selectedFeeItem?.unit === "per_day" ||
			d.selectedFeeItem?.unit === "per_monday"
		)
			return Number(d.unitQuantity) > 0;
		return true;
	}, [
		d.selectedFeeItemId,
		d.selectedFeeItem,
		d.itemName,
		d.itemAmount,
		d.unitQuantity,
		d.editingItem,
	]);
	const { invoice, isLoading, isRegistration, installments } = d;

	if (isLoading)
		return (
			<div className="p-8 text-center text-gray-500">
				Memuat detail tagihan...
			</div>
		);
	if (!invoice)
		return (
			<div className="p-8 text-center text-red-500">
				Tagihan tidak ditemukan.
			</div>
		);

	const totalAmount = Number(invoice.total_amount);
	const paidAmount = Number(invoice.paid_amount);
	const sisa = totalAmount - paidAmount;
	const groupedInvoiceItems = ((invoice.items as any[]) || []).reduce(
		(acc: Record<string, any[]>, it: any) => {
			const c = it.category || "other";
			if (!acc[c]) acc[c] = [];
			acc[c].push(it);
			return acc;
		},
		{} as Record<string, any[]>,
	);
	const collapseRincian = ["initial", "registration", "graduation"].includes(
		invoice.type,
	);

	const categoryLabels: Record<string, string> = {
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
		incidental: "Insidental / Tambahan",
	};

	const handleOpenAddItem = () => {
		d.setItemName("");
		d.setItemAmount("");
		d.setItemCategory("incidental");
		d.setSelectedFeeItemId("");
		d.setSelectedFeeItem(null);
		d.setUnitQuantity("");
		d.setIsAddItemOpen(true);
	};
	const handleFeeItemSelect = (feeItemIdStr: string) => {
		d.setSelectedFeeItemId(feeItemIdStr);
		d.setUnitQuantity("");
		if (feeItemIdStr === "custom") {
			d.setSelectedFeeItem(null);
			d.setItemName("");
			d.setItemAmount("");
			d.setItemCategory("incidental");
			return;
		}
		if (feeItemIdStr === "") {
			d.setSelectedFeeItem(null);
			d.setItemName("");
			d.setItemAmount("");
			return;
		}
		const feeItem = d.filteredFeeItems.find(
			(fi: any) => fi.id.toString() === feeItemIdStr,
		);
		if (feeItem) {
			d.setSelectedFeeItem(feeItem);
			d.setItemCategory(feeItem.category || "incidental");
			d.setItemName(feeItem.name);
			if (feeItem.unit === "fixed") d.setItemAmount(feeItem.amount.toString());
			else d.setItemAmount("");
		}
	};
	const handleOpenEditItem = (item: any) => {
		if (Number(item.paid_amount) > 0) return;
		d.setItemName(item.name);
		d.setItemAmount(item.amount.toString());
		d.setItemCategory(item.category || "incidental");
		d.setSelectedVariantId(item.koperasi_variant_id);
		d.setUnitQuantity(item.quantity != null ? item.quantity.toString() : "");
		d.setEditingItem(item);
	};
	const handleSaveItem = (e: React.FormEvent) => {
		e.preventDefault();
		if (d.editingItem) {
			if (d.editingItem.quantity != null && d.editingItem.unit_price != null)
				d.quantityMutation.mutate({
					invoiceId: Number(routeId),
					itemId: d.editingItem.id,
					data: { quantity: Number(d.unitQuantity) },
				});
			else
				d.editItemMutation.mutate({
					id: Number(routeId),
					itemId: d.editingItem.id,
					data: {
						name: d.itemName,
						amount: Number(d.itemAmount),
						koperasi_variant_id: d.selectedVariantId,
					},
				});
		} else {
			let finalName = d.itemName;
			let finalAmount = Number(d.itemAmount);
			if (d.selectedFeeItem) {
				if (d.selectedFeeItem.unit === "per_day") {
					finalName = `${d.selectedFeeItem.name} (${d.unitQuantity} hari)`;
					finalAmount = calculatedAmount;
				} else if (d.selectedFeeItem.unit === "per_monday") {
					finalName = `${d.selectedFeeItem.name} (${d.unitQuantity} Senin)`;
					finalAmount = calculatedAmount;
				}
			}
			d.addItemMutation.mutate({
				id: Number(routeId),
				data: {
					name: finalName,
					amount: finalAmount,
					category: d.itemCategory,
				},
			});
		}
	};
	const handleOpenInstallments = () => {
		if (installments.length > 0)
			d.setInstallmentItems(
				installments.map((i: any) => ({
					amount: Number(i.amount),
					due_date: i.due_date.split("T")[0],
					installment_number: i.installment_number,
					notes: i.notes || "",
				})),
			);
		else
			d.setInstallmentItems([
				{ amount: 0, due_date: "", installment_number: 1, notes: "" },
			]);
		d.setIsInstallmentOpen(true);
	};
	const handleSaveInstallments = (e: React.FormEvent) => {
		e.preventDefault();
		const totalInst = d.installmentItems.reduce(
			(acc: number, curr: any) => acc + Number(curr.amount),
			0,
		);
		if (totalInst !== totalAmount) return;
		d.installmentsMutation.mutate({
			id: Number(routeId),
			data: {
				installments: d.installmentItems.map((i: any) => ({
					...i,
					amount: Number(i.amount),
					due_date: `${i.due_date}T00:00:00Z`,
				})),
			},
		});
	};

	const translateType = (type: string) =>
		(
			({
				monthly: "Bulanan",
				registration: "Registrasi Tahunan",
				initial: "Biaya Awal",
				incidental: "Insidental",
			}) as Record<string, string>
		)[type] || type;
	const getStatusText = (status: string) => {
		if (status === "paid")
			return (
				<span className="text-green-700 bg-green-50 px-2 py-1 rounded font-bold uppercase">
					Lunas
				</span>
			);
		if (status === "partial")
			return (
				<span className="text-amber-700 bg-amber-50 px-2 py-1 rounded font-bold uppercase">
					⚠ Sebagian Dibayar
				</span>
			);
		return (
			<span className="text-red-700 bg-red-50 px-2 py-1 rounded font-bold uppercase">
				Belum Lunas
			</span>
		);
	};

	const renderItemRow = (item: any) => {
		const itemTotal = Number(item.amount);
		const itemPaid = Number(item.paid_amount);
		const itemSisa = itemTotal - itemPaid;
		const isPaid = itemPaid >= itemTotal;
		const isPartial = itemPaid > 0 && !isPaid;
		const hasQuantity = item.quantity != null && item.unit_price != null;
		const unitLabel = item.category === "savings_mandatory" ? "Senin" : "hari";
		return (
			<li key={item.id} className="p-4 sm:px-6 hover:bg-gray-50">
				<div className="flex justify-between items-start">
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
							{isPaid ? (
								<Badge variant="success">Lunas</Badge>
							) : isPartial ? (
								<Badge variant="warning">
									Sisa: {formatCurrency(itemSisa)}
								</Badge>
							) : (
								<Badge variant="danger">Belum Lunas</Badge>
							)}
						</div>
						{hasQuantity && (
							<div className="mt-1.5">
								<span className="text-xs text-gray-500">
									{item.quantity} {unitLabel} &times;{" "}
									{formatCurrency(item.unit_price)}
								</span>
							</div>
						)}
					</div>
					<div className="text-right ml-4">
						<div className="text-sm font-semibold text-gray-900">
							{formatCurrency(itemTotal)}
						</div>
						{!isPaid && (
							<div className="mt-2 flex gap-2 justify-end">
								<button
									type="button"
									className={`text-xs flex items-center font-medium ${itemPaid > 0 ? "text-gray-400 cursor-not-allowed" : "text-indigo-600 hover:text-indigo-800"}`}
									onClick={() => handleOpenEditItem(item)}
									disabled={itemPaid > 0}
								>
									<Edit2 className="w-3 h-3 mr-1" /> Edit
								</button>
								<button
									type="button"
									className={`text-xs flex items-center font-medium ${itemPaid > 0 || item.is_mandatory ? "text-gray-400 cursor-not-allowed" : "text-rose-600 hover:text-rose-800"}`}
									onClick={() => {
										if (itemPaid === 0 && !item.is_mandatory)
											d.setDeletingItem(item);
									}}
									disabled={itemPaid > 0 || item.is_mandatory}
								>
									<Trash2 className="w-3 h-3 mr-1" /> Hapus
								</button>
							</div>
						)}
					</div>
				</div>
			</li>
		);
	};

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-12">
			<div className="contents print:hidden">
				<nav className="flex" aria-label="Breadcrumb">
					<ol
						role="list"
						className="flex items-center space-x-2 text-sm text-gray-500"
					>
						<li>
							<Link to="/keuangan/tagihan" className="hover:text-gray-900">
								Tagihan
							</Link>
						</li>
						<li>
							<ChevronRight className="h-4 w-4" />
						</li>
						<li>
							<Link
								to="/keuangan/tagihan/siswa/$id"
								params={{ id: invoice.student?.id.toString() }}
								className="hover:text-gray-900"
							>
								{invoice.student?.full_name}
							</Link>
						</li>
						<li>
							<ChevronRight className="h-4 w-4" />
						</li>
						<li className="font-medium text-gray-900">Detail #{invoice.id}</li>
					</ol>
				</nav>
				<div className="border-b border-gray-200 pb-5">
					<h2 className="text-2xl font-bold leading-7 text-gray-900">
						Tagihan {translateType(invoice.type)} &mdash;{" "}
						{invoice.month && invoice.year
							? `Bulan ${invoice.month}/${invoice.year}`
							: invoice.academic_year?.name}
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Siswa:{" "}
						<span className="font-semibold text-gray-900">
							{invoice.student?.full_name}
						</span>{" "}
						&bull;{" "}
						{invoice.student?.active_enrollment?.class_group?.name ||
							"Tanpa Rombel"}
					</p>
				</div>
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-6">
					<div>
						<div className="text-sm text-gray-500 mb-1">Status Pembayaran</div>
						<div className="text-xl">{getStatusText(invoice.status)}</div>
						<div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-2">
							<div>
								<div className="text-sm text-gray-500">Total Tagihan</div>
								<div className="text-lg font-semibold text-gray-900">
									{formatCurrency(totalAmount)}
								</div>
							</div>
							<div>
								<div className="text-sm text-gray-500">Sudah Dibayar</div>
								<div className="text-lg font-semibold text-gray-900">
									{formatCurrency(paidAmount)}
								</div>
							</div>
							<div>
								<div className="text-sm font-medium text-amber-600">
									Sisa Tunggakan
								</div>
								<div className="text-lg font-bold text-amber-600">
									{formatCurrency(sisa)}
								</div>
							</div>
						</div>
					</div>
					<div className="flex flex-col sm:flex-row gap-3">
						<Button variant="secondary" onClick={() => window.print()}>
							<Printer className="w-4 h-4 mr-2" /> Cetak Tagihan
						</Button>
						<Link
							to="/keuangan/pembayaran/baru"
							search={{
								student_id: invoice.student?.id,
								invoice_id: invoice.id,
							}}
						>
							<Button variant="primary" disabled={invoice.status === "paid"}>
								+ Catat Pembayaran
							</Button>
						</Link>
					</div>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div
						className={`space-y-6 ${isRegistration ? "lg:col-span-2" : "lg:col-span-3"}`}
					>
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
							<div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
								<h3 className="text-base font-semibold leading-6 text-gray-900">
									Rincian Item Tagihan
								</h3>
								{invoice.status !== "paid" && (
									<Button
										variant="secondary"
										size="sm"
										onClick={handleOpenAddItem}
									>
										<Plus className="w-4 h-4 mr-1" /> Tambah Item
									</Button>
								)}
							</div>
							<ul className="divide-y divide-gray-200">
								{collapseRincian
									? Object.entries(groupedInvoiceItems).map(
											([cat, catItems]: [string, any[]]) => {
												const subtotal = catItems.reduce(
													(s: number, it: any) => s + Number(it.amount),
													0,
												);
												const isCatOpen = d.expandedInvoiceCats[cat] ?? false;
												return (
													<li key={cat}>
														<button
															type="button"
															onClick={() => toggleInvoiceCat(cat)}
															className="w-full flex items-center justify-between gap-3 p-4 sm:px-6 text-left hover:bg-gray-50"
														>
															<div className="flex items-center gap-2">
																{isCatOpen ? (
																	<ChevronDown className="h-4 w-4 text-gray-400" />
																) : (
																	<ChevronRight className="h-4 w-4 text-gray-400" />
																)}
																<span className="text-sm font-semibold text-gray-900">
																	{categoryLabels[cat] || cat}
																</span>
																<span className="text-xs text-gray-400">
																	{catItems.length} item
																</span>
															</div>
															<span className="text-sm font-bold text-gray-900 tabular-nums">
																{formatCurrency(subtotal)}
															</span>
														</button>
														{isCatOpen && (
															<ul className="divide-y divide-gray-100">
																{catItems.map((item: any) =>
																	renderItemRow(item),
																)}
															</ul>
														)}
													</li>
												);
											},
										)
									: (invoice.items as any[])?.map((item: any) =>
											renderItemRow(item),
										)}
							</ul>
						</div>
					</div>
					{isRegistration && (
						<div className="space-y-6 lg:col-span-1">
							<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
								<div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
									<h3 className="text-base font-semibold leading-6 text-gray-900 flex items-center">
										<CalendarDays className="w-4 h-4 mr-2" /> Jadwal Cicilan
									</h3>
									<Button
										variant="ghost"
										size="sm"
										onClick={handleOpenInstallments}
									>
										Atur
									</Button>
								</div>
								<div className="p-4 sm:px-6">
									{installments.length === 0 ? (
										<p className="text-sm text-gray-500 italic">
											Belum ada jadwal cicilan.
										</p>
									) : (
										<div className="space-y-4">
											{installments.map((inst: any) => (
												<div
													key={inst.id}
													className="flex justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0"
												>
													<div>
														<p className="text-sm font-medium text-gray-900">
															Cicilan {inst.installment_number}
														</p>
														<p className="text-xs text-gray-500">
															{formatDate(inst.due_date)}
														</p>
													</div>
													<p className="text-sm font-semibold text-gray-900">
														{formatCurrency(Number(inst.amount))}
													</p>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
			<SlideOver
				isOpen={d.isAddItemOpen}
				onClose={() => d.setIsAddItemOpen(false)}
				title={d.editingItem ? "Edit Item Tagihan" : "Tambah Item Tagihan"}
				footer={
					<>
						<Button
							variant="secondary"
							onClick={() => d.setIsAddItemOpen(false)}
						>
							Batal
						</Button>
						<Button
							variant="primary"
							onClick={handleSaveItem}
							disabled={
								!canSubmit ||
								d.addItemMutation.isPending ||
								d.editItemMutation.isPending ||
								d.quantityMutation.isPending
							}
						>
							Simpan
						</Button>
					</>
				}
			>
				<form onSubmit={handleSaveItem} className="space-y-6">
					<FormField
						id="itemCategory"
						label="Kategori"
						value={d.itemCategory}
						onChange={(e: any) => d.setItemCategory(e.target.value)}
						required
						placeholder="Kategori item"
					/>
				</form>
			</SlideOver>
			<ConfirmDialog
				open={!!d.deletingItem}
				onCancel={() => d.setDeletingItem(null)}
				onConfirm={() => {
					if (d.deletingItem)
						d.deleteItemMutation.mutate({
							id: Number(routeId),
							itemId: d.deletingItem.id,
						});
				}}
				title="Hapus Item Tagihan"
				variant="danger"
				confirmLabel="Hapus Item"
			>
				<p>
					Apakah Anda yakin ingin menghapus item{" "}
					<strong>{d.deletingItem?.name}</strong>?
				</p>
			</ConfirmDialog>
		</div>
	);
}
