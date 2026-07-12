import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	CalendarDays,
	ChevronDown,
	ChevronRight,
	Edit2,
	Plus,
	Printer,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	useGetV1FeeConfigs,
	useGetV1FeeConfigsIdItems,
} from "#/api/endpoints/fee-configs/fee-configs";
import { usePutV1InvoicesIdItemsItemIdQuantity } from "#/api/endpoints/invoices/invoice-quantity";
import {
	useDeleteV1InvoicesIdItemsItemId,
	useGetV1InvoicesId,
	useGetV1InvoicesIdInstallments,
	usePostV1InvoicesIdInstallments,
	usePostV1InvoicesIdItems,
	usePutV1InvoicesIdItemsItemId,
} from "#/api/endpoints/invoices/invoices";
import {
	Badge,
	Button,
	ConfirmDialog,
	FormField,
	SlideOver,
	useToast,
} from "#/components/ui";
import { useProducts } from "#/features/koperasi/barang/api";
import { academicYearAtom } from "../../../../store/global";
import { formatCurrency, formatDate } from "../../../../utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/tagihan/$id")({
	component: DetailTagihanPage,
});

function DetailTagihanPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);

	const { data: invoiceResp, isLoading } = useGetV1InvoicesId(Number(id));
	const invoice = (invoiceResp?.data as any)?.data;

	const isRegistration = invoice?.type === "registration";
	const { data: installmentsResp } = useGetV1InvoicesIdInstallments(
		Number(id),
		{
			query: { enabled: !!invoice && isRegistration },
		},
	);
	const installments = (installmentsResp?.data as any)?.data || [];

	const [isAddItemOpen, setIsAddItemOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<any>(null);
	const [deletingItem, setDeletingItem] = useState<any>(null);

	// Installments Management
	const [isInstallmentOpen, setIsInstallmentOpen] = useState(false);
	const [installmentItems, setInstallmentItems] = useState<
		{
			amount: number;
			due_date: string;
			installment_number: number;
			notes: string;
		}[]
	>([]);

	// Item Form State
	const [itemName, setItemName] = useState("");
	const [itemAmount, setItemAmount] = useState("");
	const [itemCategory, setItemCategory] = useState("incidental");
	// F08-3: rincian item dikelompokkan per kategori; default tertutup,
	// header menampilkan subtotal kategori, klik untuk membuka rincian.
	const [expandedInvoiceCats, setExpandedInvoiceCats] = useState<
		Record<string, boolean>
	>({});
	const toggleInvoiceCat = (cat: string) =>
		setExpandedInvoiceCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
	const [selectedFeeItemId, setSelectedFeeItemId] = useState<string>("");
	const [selectedFeeItem, setSelectedFeeItem] = useState<any>(null);
	const [unitQuantity, setUnitQuantity] = useState("");
	const [selectedVariantId, setSelectedVariantId] = useState<
		number | undefined
	>(undefined);
	const { data: products } = useProducts();

	// Fetch fee config and items for dropdown
	const { data: feeConfigsResp } = useGetV1FeeConfigs();
	const feeConfigs = (feeConfigsResp?.data as any)?.data || [];
	const activeFeeConfig = feeConfigs.find(
		(fc: any) => fc.academic_year?.id === activeAy?.id,
	);
	const feeConfigId = activeFeeConfig?.id;

	const { data: feeItemsResp } = useGetV1FeeConfigsIdItems(
		feeConfigId || 0,
		undefined,
		{ query: { enabled: !!feeConfigId } },
	);
	const allFeeItems: any[] = (feeItemsResp?.data as any)?.data || [];

	// Mapping tipe tagihan → kategori tarif yang relevan
	const invoiceTypeCategories: Record<string, string[]> = {
		initial: ["initial"],
		daycare_initial: ["daycare"],
		registration: ["registration"],
		monthly: [
			"monthly_spp",
			"monthly_infaq",
			"calisan",
			"pasta",
			"ekskul",
			"savings_mandatory",
		],
		graduation: ["graduation"],
	};

	// Filter fee items berdasarkan profil siswa (level + gender) dan tipe tagihan
	const filteredFeeItems = useMemo(() => {
		if (!invoice || !allFeeItems.length) return [];

		const studentLevel = invoice.student?.active_enrollment?.class_group?.level;
		const studentGender = invoice.student?.gender;
		const allowedCategories = invoiceTypeCategories[invoice.type] || [];

		return allFeeItems.filter((item: any) => {
			const categoryMatch = allowedCategories.includes(item.category);
			const levelMatch = item.level === "all" || item.level === studentLevel;
			const genderMatch =
				item.gender === "all" || item.gender === studentGender;
			return categoryMatch && levelMatch && genderMatch;
		});
	}, [allFeeItems, invoice, invoiceTypeCategories]);

	// Group filtered items by category for dropdown
	const feeItemsByCategory = useMemo(() => {
		const grouped: Record<string, any[]> = {};
		filteredFeeItems.forEach((item: any) => {
			const cat = item.category || "other";
			if (!grouped[cat]) grouped[cat] = [];
			grouped[cat].push(item);
		});
		return grouped;
	}, [filteredFeeItems]);

	// Auto-hitung total untuk item per_day / per_monday
	const calculatedAmount = useMemo(() => {
		if (!selectedFeeItem) return 0;
		if (
			selectedFeeItem.unit === "per_day" ||
			selectedFeeItem.unit === "per_monday"
		) {
			return selectedFeeItem.amount * (Number(unitQuantity) || 0);
		}
		return selectedFeeItem.amount;
	}, [selectedFeeItem, unitQuantity]);

	// Validasi tombol submit
	const canSubmit = useMemo(() => {
		if (editingItem) {
			// Item berbasis kuantitas: validasi unitQuantity
			if (editingItem.quantity != null && editingItem.unit_price != null) {
				return Number(unitQuantity) > 0;
			}
			// Item flat: validasi nama dan nominal
			return !!itemName && Number(itemAmount) > 0;
		}
		if (!selectedFeeItemId) return false;
		if (selectedFeeItemId === "custom") {
			return !!itemName && Number(itemAmount) > 0;
		}
		if (
			selectedFeeItem?.unit === "per_day" ||
			selectedFeeItem?.unit === "per_monday"
		) {
			return Number(unitQuantity) > 0;
		}
		return true;
	}, [
		selectedFeeItemId,
		selectedFeeItem,
		itemName,
		itemAmount,
		unitQuantity,
		editingItem,
	]);

	const addItemMutation = usePostV1InvoicesIdItems({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Item berhasil ditambahkan.",
				});
				queryClient.invalidateQueries({ queryKey: [`/v1/invoices/${id}`] });
				setIsAddItemOpen(false);
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal menambahkan item.",
				});
			},
		},
	});

	const editItemMutation = usePutV1InvoicesIdItemsItemId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Item berhasil diubah.",
				});
				queryClient.invalidateQueries({ queryKey: [`/v1/invoices/${id}`] });
				setEditingItem(null);
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal mengubah item.",
				});
			},
		},
	});

	const deleteItemMutation = useDeleteV1InvoicesIdItemsItemId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Item berhasil dihapus.",
				});
				queryClient.invalidateQueries({ queryKey: [`/v1/invoices/${id}`] });
				setDeletingItem(null);
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal menghapus item.",
				});
			},
		},
	});

	const quantityMutation = usePutV1InvoicesIdItemsItemIdQuantity({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Jumlah hari/Senin berhasil diubah.",
				});
				queryClient.invalidateQueries({ queryKey: [`/v1/invoices/${id}`] });
				setEditingItem(null);
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal mengubah jumlah.",
				});
			},
		},
	});

	const installmentsMutation = usePostV1InvoicesIdInstallments({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Jadwal cicilan berhasil disimpan.",
				});
				queryClient.invalidateQueries({
					queryKey: [`/v1/invoices/${id}/installments`],
				});
				setIsInstallmentOpen(false);
			},
			onError: (err: any) => {
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal menyimpan cicilan.",
				});
			},
		},
	});

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
		setItemName("");
		setItemAmount("");
		setItemCategory("incidental");
		setSelectedFeeItemId("");
		setSelectedFeeItem(null);
		setUnitQuantity("");
		setIsAddItemOpen(true);
	};

	const handleFeeItemSelect = (feeItemIdStr: string) => {
		setSelectedFeeItemId(feeItemIdStr);
		setUnitQuantity("");

		if (feeItemIdStr === "custom") {
			setSelectedFeeItem(null);
			setItemName("");
			setItemAmount("");
			setItemCategory("incidental");
			return;
		}

		if (feeItemIdStr === "") {
			setSelectedFeeItem(null);
			setItemName("");
			setItemAmount("");
			return;
		}

		const feeItem = filteredFeeItems.find(
			(fi: any) => fi.id.toString() === feeItemIdStr,
		);
		if (feeItem) {
			setSelectedFeeItem(feeItem);
			setItemCategory(feeItem.category || "incidental");
			setItemName(feeItem.name);

			if (feeItem.unit === "fixed") {
				setItemAmount(feeItem.amount.toString());
			} else {
				// per_day / per_monday: nominal dihitung dari calculatedAmount
				setItemAmount("");
			}
		}
	};

	const handleOpenEditItem = (item: any) => {
		if (Number(item.paid_amount) > 0) return;
		setItemName(item.name);
		setItemAmount(item.amount.toString());
		setItemCategory(item.category || "incidental");
		setSelectedVariantId(item.koperasi_variant_id);
		// Pre-fill quantity for per_day/per_monday items
		if (item.quantity != null) {
			setUnitQuantity(item.quantity.toString());
		} else {
			setUnitQuantity("");
		}
		setEditingItem(item);
	};

	const handleSaveItem = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingItem) {
			// Jika item punya quantity (per_day/per_monday), gunakan endpoint quantity
			if (editingItem.quantity != null && editingItem.unit_price != null) {
				quantityMutation.mutate({
					invoiceId: Number(id),
					itemId: editingItem.id,
					data: { quantity: Number(unitQuantity) },
				});
			} else {
				editItemMutation.mutate({
					id: Number(id),
					itemId: editingItem.id,
					data: {
						name: itemName,
						amount: Number(itemAmount),
						koperasi_variant_id: selectedVariantId,
					},
				});
			}
		} else {
			let finalName = itemName;
			let finalAmount = Number(itemAmount);

			if (selectedFeeItem) {
				if (selectedFeeItem.unit === "per_day") {
					finalName = `${selectedFeeItem.name} (${unitQuantity} hari)`;
					finalAmount = calculatedAmount;
				} else if (selectedFeeItem.unit === "per_monday") {
					finalName = `${selectedFeeItem.name} (${unitQuantity} Senin)`;
					finalAmount = calculatedAmount;
				}
			}

			addItemMutation.mutate({
				id: Number(id),
				data: {
					name: finalName,
					amount: finalAmount,
					category: itemCategory,
				},
			});
		}
	};

	const handleOpenInstallments = () => {
		if (installments.length > 0) {
			setInstallmentItems(
				installments.map((i: any) => ({
					amount: Number(i.amount),
					due_date: i.due_date.split("T")[0],
					installment_number: i.installment_number,
					notes: i.notes || "",
				})),
			);
		} else {
			setInstallmentItems([
				{ amount: 0, due_date: "", installment_number: 1, notes: "" },
			]);
		}
		setIsInstallmentOpen(true);
	};

	const handleSaveInstallments = (e: React.FormEvent) => {
		e.preventDefault();
		const totalInst = installmentItems.reduce(
			(acc, curr) => acc + Number(curr.amount),
			0,
		);
		const invoiceTotal = Number(invoice.total_amount);

		if (totalInst !== invoiceTotal) {
			addToast({
				variant: "error",
				title: "Validasi Gagal",
				message: `Total cicilan (${formatCurrency(totalInst)}) harus sama dengan total tagihan (${formatCurrency(invoiceTotal)}).`,
			});
			return;
		}

		installmentsMutation.mutate({
			id: Number(id),
			data: {
				installments: installmentItems.map((i) => ({
					...i,
					amount: Number(i.amount),
					due_date: `${i.due_date}T00:00:00Z`,
				})),
			},
		});
	};

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

	// F08-3: kelompokkan item tagihan per kategori untuk tampilan collapse.
	const groupedInvoiceItems = ((invoice.items as any[]) || []).reduce(
		(acc: Record<string, any[]>, it: any) => {
			const c = it.category || "other";
			if (!acc[c]) acc[c] = [];
			acc[c].push(it);
			return acc;
		},
		{} as Record<string, any[]>,
	);

	// F08-3: collapse rincian hanya untuk tagihan "bundel" (biaya awal,
	// registrasi, wisuda) yang berisi banyak item satu jenis. Tagihan bulanan
	// & insidental ditampilkan datar — tiap item sudah berdiri sendiri.
	const collapseRincian = ["initial", "daycare_initial", "registration", "graduation"].includes(
		invoice.type,
	);

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
						{item.category === "incidental" && (
							<p className="text-xs text-gray-500 mt-1">
								Tagihan Tambahan/Insidental
							</p>
						)}
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
									title={
										itemPaid > 0
											? "Item sudah sebagian dibayar, tidak dapat diedit"
											: ""
									}
								>
									<Edit2 className="w-3 h-3 mr-1" /> Edit
								</button>
								<button
									type="button"
									className={`text-xs flex items-center font-medium ${itemPaid > 0 || item.is_mandatory ? "text-gray-400 cursor-not-allowed" : "text-rose-600 hover:text-rose-800"}`}
									onClick={() => {
										if (itemPaid === 0 && !item.is_mandatory)
											setDeletingItem(item);
									}}
									disabled={itemPaid > 0 || item.is_mandatory}
									title={
										item.is_mandatory
											? "Item wajib tidak dapat dihapus"
											: itemPaid > 0
												? "Item sudah sebagian dibayar"
												: ""
									}
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

	const translateType = (type: string) => {
		const map: Record<string, string> = {
			monthly: "Bulanan",
			registration: "Registrasi Tahunan",
			initial: "Biaya Awal",
			daycare_initial: "Biaya Awal Daycare",
			incidental: "Insidental",
		};
		return map[type] || type;
	};

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

	const periodeStr =
		invoice.month && invoice.year
			? `Juli ${invoice.year}` // Using dummy month text, in real app need array
			: invoice.academic_year?.name;

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-12">
			{/* Screen-only content — hidden when printing (print uses .print-invoice below) */}
			<div className="contents print:hidden">
				{/* Breadcrumb */}
				<nav className="flex" aria-label="Breadcrumb">
					<ol className="flex items-center space-x-2 text-sm text-gray-500">
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
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Tagihan {translateType(invoice.type)} &mdash; {periodeStr}
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

				{/* Summary Box */}
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

				{/* Columns */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Left Col: Items */}
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
											([cat, catItems]) => {
												const subtotal = catItems.reduce(
													(s: number, it: any) => s + Number(it.amount),
													0,
												);
												const isCatOpen = expandedInvoiceCats[cat] ?? false;
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

					{/* Right Col: Installments (if registration) and Payment History */}
					<div className="space-y-6 lg:col-span-1">
						{isRegistration && (
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
						)}

						{/* Payment History */}
						<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
							<div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
								<h3 className="text-base font-semibold leading-6 text-gray-900">
									Riwayat Pembayaran
								</h3>
							</div>
							{invoice.payments && invoice.payments.length > 0 ? (
								<table className="min-w-full divide-y divide-gray-300">
									<thead className="bg-gray-50">
										<tr>
											<th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
												Tanggal
											</th>
											<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
												Sumber
											</th>
											<th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
												Petugas
											</th>
											<th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
												Nominal
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100">
										{invoice.payments.map((p: any) => (
											<tr key={p.id} className="hover:bg-gray-50">
												<td className="py-3 pl-6 pr-3 text-sm text-gray-900">
													{formatDate(p.payment_date)}
												</td>
												<td className="px-3 py-3 text-sm text-gray-500">
													{p.source === "cash" ? "Tunai (Kas)" : "Tabungan"}
												</td>
												<td className="px-3 py-3 text-sm text-gray-500">
													{p.created_by?.full_name || "-"}
												</td>
												<td className="px-3 py-3 text-sm text-right font-medium text-gray-900 pr-6 tabular-nums">
													{formatCurrency(Number(p.amount))}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<div className="p-4 sm:px-6">
									<p className="text-sm text-gray-500 italic">
										Belum ada pembayaran untuk tagihan ini.
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
			{/* end screen-only content */}

			{/* Printable Invoice - hidden on screen, shown on print */}
			<div className="hidden print:block print-invoice">
				<div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
					<h1 className="text-xl font-bold">ALIZZAH SCHOOL</h1>
					<p className="text-sm text-gray-600">Detail Tagihan Siswa</p>
				</div>
				<div className="mb-4 text-sm">
					<div className="grid grid-cols-2 gap-2">
						<div>
							<span className="text-gray-600">Nama Siswa:</span>{" "}
							<strong>{invoice.student?.full_name}</strong>
						</div>
						<div>
							<span className="text-gray-600">Rombel:</span>{" "}
							<strong>
								{invoice.student?.active_enrollment?.class_group?.name || "-"}
							</strong>
						</div>
						<div>
							<span className="text-gray-600">Jenis Tagihan:</span>{" "}
							<strong>{translateType(invoice.type)}</strong>
						</div>
						<div>
							<span className="text-gray-600">Periode:</span>{" "}
							<strong>{periodeStr}</strong>
						</div>
						<div>
							<span className="text-gray-600">Status:</span>{" "}
							<strong>
								{invoice.status === "paid"
									? "Lunas"
									: invoice.status === "partial"
										? "Sebagian Dibayar"
										: "Belum Lunas"}
							</strong>
						</div>
						<div>
							<span className="text-gray-600">Tanggal Cetak:</span>{" "}
							<strong>
								{new Date().toLocaleDateString("id-ID", {
									day: "numeric",
									month: "long",
									year: "numeric",
								})}
							</strong>
						</div>
					</div>
				</div>
				<table className="w-full text-sm border-collapse mb-4">
					<thead>
						<tr className="border-b-2 border-gray-800">
							<th className="text-left py-2 pr-2">No</th>
							<th className="text-left py-2 px-2">Item</th>
							<th className="text-right py-2 px-2">Nominal</th>
							<th className="text-right py-2 px-2">Dibayar</th>
							<th className="text-right py-2 pl-2">Sisa</th>
						</tr>
					</thead>
					<tbody>
						{invoice.items?.map((item: any, idx: number) => (
							<tr key={item.id} className="border-b border-gray-300">
								<td className="py-1.5 pr-2">{idx + 1}</td>
								<td className="py-1.5 px-2">{item.name}</td>
								<td className="py-1.5 px-2 text-right">
									{formatCurrency(Number(item.amount))}
								</td>
								<td className="py-1.5 px-2 text-right">
									{formatCurrency(Number(item.paid_amount))}
								</td>
								<td className="py-1.5 pl-2 text-right">
									{formatCurrency(
										Number(item.amount) - Number(item.paid_amount),
									)}
								</td>
							</tr>
						))}
					</tbody>
					<tfoot>
						<tr className="border-t-2 border-gray-800 font-bold">
							<td colSpan={2} className="py-2 text-right">
								Total
							</td>
							<td className="py-2 px-2 text-right">
								{formatCurrency(totalAmount)}
							</td>
							<td className="py-2 px-2 text-right">
								{formatCurrency(paidAmount)}
							</td>
							<td className="py-2 pl-2 text-right">{formatCurrency(sisa)}</td>
						</tr>
					</tfoot>
				</table>
				<div className="mt-8 text-sm text-gray-500 text-center">
					<p>Dokumen ini dicetak secara otomatis oleh sistem Alizzah School.</p>
				</div>
			</div>

			{/* Modals & SlideOvers */}
			<SlideOver
				isOpen={isAddItemOpen || !!editingItem}
				onClose={() => {
					setIsAddItemOpen(false);
					setEditingItem(null);
				}}
				title={editingItem ? "Edit Item Tagihan" : "Tambah Item Tagihan"}
			>
				<form
					onSubmit={handleSaveItem}
					className="flex h-full flex-col bg-white"
				>
					<div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
						{/* Dropdown pilih item tarif (hanya mode tambah, bukan edit) */}
						{!editingItem && (
							<div>
								<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
									Pilih Item dari Daftar Tarif
								</label>
								<select
									value={selectedFeeItemId}
									onChange={(e) => handleFeeItemSelect(e.target.value)}
									className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
								>
									<option value="">— Pilih item tagihan —</option>
									{Object.entries(feeItemsByCategory).map(([cat, items]) => (
										<optgroup key={cat} label={categoryLabels[cat] || cat}>
											{(items as any[]).map((fi: any) => (
												<option key={fi.id} value={fi.id.toString()}>
													{fi.name} — {formatCurrency(fi.amount)}
													{fi.unit === "per_day"
														? " /hari"
														: fi.unit === "per_monday"
															? " /Senin"
															: ""}
												</option>
											))}
										</optgroup>
									))}
									<option value="custom">
										--- Input Manual (Insidental) ---
									</option>
								</select>
								{filteredFeeItems.length === 0 && allFeeItems.length > 0 && (
									<p className="mt-1 text-xs text-amber-600">
										Tidak ada tarif yang sesuai untuk profil siswa ini. Anda
										bisa menambahkan item secara manual.
									</p>
								)}
								{allFeeItems.length === 0 && (
									<p className="mt-1 text-xs text-amber-600">
										Data item tarif belum tersedia. Anda bisa menambahkan item
										secara manual.
									</p>
								)}
							</div>
						)}

						{/* === FORM FIELDS BERDASARKAN UNIT TYPE === */}

						{/* Mode Edit — item berbasis kuantitas (per_day/per_monday) */}
						{editingItem &&
							editingItem.quantity != null &&
							editingItem.unit_price != null && (
								<>
									<FormField
										id="itemName"
										label="Nama Item"
										value={itemName}
										onChange={() => {}}
										disabled
									/>
									<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
										<div className="text-xs text-gray-500 mb-1">
											Tarif per{" "}
											{editingItem.category === "savings_mandatory"
												? "Senin"
												: "Hari"}
										</div>
										<div className="text-sm font-semibold text-gray-900">
											{formatCurrency(editingItem.unit_price)} /{" "}
											{editingItem.category === "savings_mandatory"
												? "Senin"
												: "hari"}
										</div>
									</div>
									<FormField
										id="editUnitQuantity"
										type="number"
										label={
											editingItem.category === "savings_mandatory"
												? "Jumlah Senin"
												: "Jumlah Hari"
										}
										value={unitQuantity}
										onChange={(e: any) => setUnitQuantity(e.target.value)}
										required
										min="1"
										placeholder={
											editingItem.category === "savings_mandatory"
												? "Masukkan jumlah Senin"
												: "Masukkan jumlah hari efektif"
										}
									/>
									{Number(unitQuantity) > 0 && (
										<div className="bg-indigo-50 rounded-md p-3 border border-indigo-200">
											<div className="text-xs text-indigo-600 mb-1">Total</div>
											<div className="text-lg font-bold text-indigo-700">
												{formatCurrency(
													Number(unitQuantity) * editingItem.unit_price,
												)}
											</div>
											<div className="text-xs text-indigo-500 mt-0.5">
												{formatCurrency(editingItem.unit_price)} &times;{" "}
												{unitQuantity}{" "}
												{editingItem.category === "savings_mandatory"
													? "Senin"
													: "hari"}
											</div>
										</div>
									)}
								</>
							)}

						{/* Mode Edit — item flat (tanpa kuantitas) */}
						{editingItem &&
							(editingItem.quantity == null ||
								editingItem.unit_price == null) && (
								<>
									<FormField
										id="itemName"
										label="Nama Item"
										value={itemName}
										onChange={(e: any) => setItemName(e.target.value)}
										required
									/>
									{editingItem.is_koperasi &&
									editingItem.koperasi_product_id ? (
										<div className="mb-4">
											<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
												Pilih Varian Barang Koperasi
											</label>
											<select
												value={selectedVariantId || ""}
												onChange={(e) => {
													const variantId = e.target.value
														? Number(e.target.value)
														: undefined;
													setSelectedVariantId(variantId);
													// Find product and variant price to auto-update amount
													const product = products?.find(
														(p) => p.id === editingItem.koperasi_product_id,
													);
													const variant = product?.variants?.find(
														(v) => v.id === variantId,
													);
													if (variant) {
														setItemAmount(variant.sale_price.toString());
													}
												}}
												className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
												required
											>
												<option value="">-- Pilih Varian --</option>
												{products
													?.find(
														(p) => p.id === editingItem.koperasi_product_id,
													)
													?.variants?.map((v) => (
														<option key={v.id} value={v.id}>
															{v.name} — {formatCurrency(v.sale_price)} (Stok:{" "}
															{v.stock})
														</option>
													))}
											</select>
										</div>
									) : null}
									<FormField
										id="itemAmount"
										type="number"
										label="Nominal (Rp)"
										value={itemAmount}
										onChange={(e: any) => setItemAmount(e.target.value)}
										required
										min="1"
										disabled={
											!!(
												editingItem.is_koperasi &&
												editingItem.koperasi_product_id
											)
										}
									/>
								</>
							)}

						{/* Mode Tambah: unit = fixed — nama & nominal read-only */}
						{!editingItem && selectedFeeItem?.unit === "fixed" && (
							<>
								<FormField
									id="itemName"
									label="Nama Item"
									value={itemName}
									onChange={() => {}}
									disabled
								/>
								<FormField
									id="itemAmount"
									type="number"
									label="Nominal (Rp)"
									value={itemAmount}
									onChange={() => {}}
									disabled
								/>
							</>
						)}

						{/* Mode Tambah: unit = per_day — tarif/hari + input jumlah hari */}
						{!editingItem && selectedFeeItem?.unit === "per_day" && (
							<>
								<FormField
									id="itemName"
									label="Nama Item"
									value={itemName}
									onChange={() => {}}
									disabled
								/>
								<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
									<div className="text-xs text-gray-500 mb-1">
										Tarif per Hari
									</div>
									<div className="text-sm font-semibold text-gray-900">
										{formatCurrency(selectedFeeItem.amount)} / hari
									</div>
								</div>
								<FormField
									id="unitQuantity"
									type="number"
									label="Jumlah Hari"
									value={unitQuantity}
									onChange={(e: any) => setUnitQuantity(e.target.value)}
									required
									min="1"
									placeholder="Masukkan jumlah hari efektif"
								/>
								{Number(unitQuantity) > 0 && (
									<div className="bg-indigo-50 rounded-md p-3 border border-indigo-200">
										<div className="text-xs text-indigo-600 mb-1">Total</div>
										<div className="text-lg font-bold text-indigo-700">
											{formatCurrency(calculatedAmount)}
										</div>
										<div className="text-xs text-indigo-500 mt-0.5">
											{formatCurrency(selectedFeeItem.amount)} x {unitQuantity}{" "}
											hari
										</div>
									</div>
								)}
							</>
						)}

						{/* Mode Tambah: unit = per_monday — tarif/Senin + input jumlah Senin */}
						{!editingItem && selectedFeeItem?.unit === "per_monday" && (
							<>
								<FormField
									id="itemName"
									label="Nama Item"
									value={itemName}
									onChange={() => {}}
									disabled
								/>
								<div className="bg-gray-50 rounded-md p-3 border border-gray-200">
									<div className="text-xs text-gray-500 mb-1">
										Tarif per Senin
									</div>
									<div className="text-sm font-semibold text-gray-900">
										{formatCurrency(selectedFeeItem.amount)} / Senin
									</div>
								</div>
								<FormField
									id="unitQuantity"
									type="number"
									label="Jumlah Senin"
									value={unitQuantity}
									onChange={(e: any) => setUnitQuantity(e.target.value)}
									required
									min="1"
									placeholder="Masukkan jumlah hari Senin"
								/>
								{Number(unitQuantity) > 0 && (
									<div className="bg-indigo-50 rounded-md p-3 border border-indigo-200">
										<div className="text-xs text-indigo-600 mb-1">Total</div>
										<div className="text-lg font-bold text-indigo-700">
											{formatCurrency(calculatedAmount)}
										</div>
										<div className="text-xs text-indigo-500 mt-0.5">
											{formatCurrency(selectedFeeItem.amount)} x {unitQuantity}{" "}
											Senin
										</div>
									</div>
								)}
							</>
						)}

						{/* Mode Tambah: Custom / Manual */}
						{!editingItem && selectedFeeItemId === "custom" && (
							<>
								<FormField
									id="itemName"
									label="Nama Item"
									value={itemName}
									onChange={(e: any) => setItemName(e.target.value)}
									required
									placeholder="Masukkan nama item"
								/>
								<FormField
									id="itemAmount"
									type="number"
									label="Nominal (Rp)"
									value={itemAmount}
									onChange={(e: any) => setItemAmount(e.target.value)}
									required
									min="1"
									placeholder="Masukkan nominal"
								/>
								<div>
									<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
										Kategori
									</label>
									<select
										value={itemCategory}
										onChange={(e: any) => setItemCategory(e.target.value)}
										className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
									>
										<option value="incidental">Insidental / Tambahan</option>
									</select>
								</div>
							</>
						)}
					</div>
					<div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 flex justify-end gap-3">
						<Button
							type="button"
							variant="secondary"
							onClick={() => {
								setIsAddItemOpen(false);
								setEditingItem(null);
							}}
						>
							Batal
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={
								addItemMutation.isPending ||
								editItemMutation.isPending ||
								!canSubmit
							}
						>
							Simpan
						</Button>
					</div>
				</form>
			</SlideOver>

			<SlideOver
				isOpen={isInstallmentOpen}
				onClose={() => setIsInstallmentOpen(false)}
				title="Atur Jadwal Cicilan"
			>
				<form
					onSubmit={handleSaveInstallments}
					className="flex h-full flex-col bg-white"
				>
					<div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
						<div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 mb-4">
							Total Tagihan: <strong>{formatCurrency(totalAmount)}</strong>
							<br />
							Total Cicilan Dibuat:{" "}
							<strong>
								{formatCurrency(
									installmentItems.reduce(
										(acc, curr) => acc + Number(curr.amount),
										0,
									),
								)}
							</strong>
						</div>

						{installmentItems.map((item, idx) => (
							<div
								key={idx}
								className="border border-gray-200 rounded-md p-4 relative group"
							>
								<button
									type="button"
									onClick={() =>
										setInstallmentItems((prev) =>
											prev.filter((_, i) => i !== idx),
										)
									}
									className="absolute top-2 right-2 text-gray-400 hover:text-rose-600"
								>
									<Trash2 className="w-4 h-4" />
								</button>
								<h4 className="text-sm font-semibold mb-3">
									Cicilan {idx + 1}
								</h4>
								<div className="space-y-3">
									<FormField
										id={`inst_amount_${idx}`}
										type="number"
										label="Nominal (Rp)"
										value={item.amount || ""}
										onChange={(e: any) => {
											const newArr = [...installmentItems];
											newArr[idx].amount = Number(e.target.value);
											setInstallmentItems(newArr);
										}}
										required
									/>
									<FormField
										id={`inst_date_${idx}`}
										type="date"
										label="Jatuh Tempo"
										value={item.due_date}
										onChange={(e: any) => {
											const newArr = [...installmentItems];
											newArr[idx].due_date = e.target.value;
											setInstallmentItems(newArr);
										}}
										required
									/>
								</div>
							</div>
						))}

						<Button
							type="button"
							variant="secondary"
							className="w-full"
							onClick={() =>
								setInstallmentItems((prev) => [
									...prev,
									{
										amount: 0,
										due_date: "",
										installment_number: prev.length + 1,
										notes: "",
									},
								])
							}
						>
							+ Tambah Baris Cicilan
						</Button>
					</div>
					<div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 flex justify-end gap-3">
						<Button
							type="button"
							variant="secondary"
							onClick={() => setIsInstallmentOpen(false)}
						>
							Batal
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={installmentsMutation.isPending}
						>
							Simpan Jadwal
						</Button>
					</div>
				</form>
			</SlideOver>

			<ConfirmDialog
				open={!!deletingItem}
				onCancel={() => setDeletingItem(null)}
				onConfirm={() => {
					if (deletingItem) {
						deleteItemMutation.mutate({
							id: Number(id),
							itemId: deletingItem.id,
						});
					}
				}}
				title="Hapus Item Tagihan"
				variant="danger"
				confirmLabel="Hapus Item"
			>
				<p>
					Apakah Anda yakin ingin menghapus item{" "}
					<strong>{deletingItem?.name}</strong> senilai{" "}
					<strong>{formatCurrency(Number(deletingItem?.amount))}</strong> dari
					tagihan ini?
				</p>
				<p className="mt-2 text-sm text-gray-500">
					Tindakan ini tidak dapat dibatalkan.
				</p>
			</ConfirmDialog>
		</div>
	);
}
