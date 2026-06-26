import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
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
import { useToast } from "#/components/ui";
import { useProducts } from "#/features/koperasi/barang/api";
import { academicYearAtom } from "@/store/global";

export function useTagihanDetail(id: number) {
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);

	const { data: invoiceResp, isLoading } = useGetV1InvoicesId(id);
	const invoice = (invoiceResp?.data as any)?.data;
	const isRegistration = invoice?.type === "registration";
	const { data: installmentsResp } = useGetV1InvoicesIdInstallments(id, {
		query: { enabled: !!invoice && isRegistration },
	});
	const installments = (installmentsResp?.data as any)?.data || [];

	const [isAddItemOpen, setIsAddItemOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<any>(null);
	const [deletingItem, setDeletingItem] = useState<any>(null);
	const [isInstallmentOpen, setIsInstallmentOpen] = useState(false);
	const [installmentItems, setInstallmentItems] = useState<
		{
			amount: number;
			due_date: string;
			installment_number: number;
			notes: string;
		}[]
	>([]);
	const [itemName, setItemName] = useState("");
	const [itemAmount, setItemAmount] = useState("");
	const [itemCategory, setItemCategory] = useState("incidental");
	const [expandedInvoiceCats, setExpandedInvoiceCats] = useState<
		Record<string, boolean>
	>({});
	const [selectedFeeItemId, setSelectedFeeItemId] = useState("");
	const [selectedFeeItem, setSelectedFeeItem] = useState<any>(null);
	const [unitQuantity, setUnitQuantity] = useState("");
	const [selectedVariantId, setSelectedVariantId] = useState<
		number | undefined
	>(undefined);
	const { data: products } = useProducts();

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

	const invoiceTypeCategories: Record<string, string[]> = {
		initial: ["initial"],
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

	const filteredFeeItems = useMemo(() => {
		if (!invoice || !allFeeItems.length) return [];
		const studentLevel = invoice.student?.active_enrollment?.class_group?.level;
		const studentGender = invoice.student?.gender;
		const allowedCategories = invoiceTypeCategories[invoice.type] || [];
		return allFeeItems.filter(
			(item: any) =>
				allowedCategories.includes(item.category) &&
				(item.level === "all" || item.level === studentLevel) &&
				(item.gender === "all" || item.gender === studentGender),
		);
	}, [allFeeItems, invoice]);

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
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
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
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
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
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});
	const quantityMutation = usePutV1InvoicesIdItemsItemIdQuantity({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Jumlah berhasil diubah.",
				});
				queryClient.invalidateQueries({ queryKey: [`/v1/invoices/${id}`] });
				setEditingItem(null);
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
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
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	return {
		id,
		invoice,
		isLoading,
		isRegistration,
		installments,
		isAddItemOpen,
		setIsAddItemOpen,
		editingItem,
		setEditingItem,
		deletingItem,
		setDeletingItem,
		isInstallmentOpen,
		setIsInstallmentOpen,
		installmentItems,
		setInstallmentItems,
		itemName,
		setItemName,
		itemAmount,
		setItemAmount,
		itemCategory,
		setItemCategory,
		expandedInvoiceCats,
		setExpandedInvoiceCats,
		selectedFeeItemId,
		setSelectedFeeItemId,
		selectedFeeItem,
		setSelectedFeeItem,
		unitQuantity,
		setUnitQuantity,
		selectedVariantId,
		setSelectedVariantId,
		products,
		feeConfigs,
		feeConfigId,
		allFeeItems,
		filteredFeeItems,
		addItemMutation,
		editItemMutation,
		deleteItemMutation,
		quantityMutation,
		installmentsMutation,
		activeAy,
	};
}
