import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { useState } from "react";
import {
	getGetV1CashBalanceQueryKey,
	getGetV1CashTransactionsQueryKey,
	useGetV1CashBalance,
	useGetV1CashTransactions,
	usePostV1CashTransfers,
} from "#/api/endpoints/cash/cash";
import {
	getGetV1VaultBalanceQueryKey,
	useGetV1VaultBalance,
} from "#/api/endpoints/vault/vault";
import { useToast } from "#/components/ui";
import { academicYearAtom } from "@/store/global";

export function useCashOverview() {
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const today = new Date().toISOString().split("T")[0];

	const [transferOpen, setTransferOpen] = useState(false);
	const [transferAmount, setTransferAmount] = useState("");
	const [transferNote, setTransferNote] = useState("");

	const { data: cashData, isLoading: cashLoading } = useGetV1CashBalance(
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } },
	);
	const { data: vaultData, isLoading: vaultLoading } = useGetV1VaultBalance(
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } },
	);
	const { data: todayTxData, isLoading: txLoading } = useGetV1CashTransactions(
		{
			academic_year_id: activeAy?.id,
			start_date: today,
			end_date: today,
			limit: 50,
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const transferMutation = usePostV1CashTransfers();

	const cash = (cashData?.data as any)?.data;
	const vault = (vaultData?.data as any)?.data;
	const todayTransactions = (todayTxData?.data as any)?.data?.data || [];

	const cashBalance = Number(cash?.balance || 0);
	const vaultBalance = Number(vault?.balance || 0);

	const parsedAmount = Number(transferAmount.replace(/\D/g, "")) || 0;
	const isAmountValid = parsedAmount > 0 && parsedAmount <= cashBalance;

	const handleTransfer = () => {
		if (!isAmountValid) return;
		transferMutation.mutate(
			{
				data: {
					amount: parsedAmount,
					description: transferNote || "Transfer kas ke berangkas",
				},
				params: { academic_year_id: activeAy?.id },
			},
			{
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Transfer Berhasil",
						message: `${parsedAmount.toLocaleString("id-ID")} berhasil ditransfer.`,
					});
					setTransferOpen(false);
					setTransferAmount("");
					setTransferNote("");
					queryClient.invalidateQueries({
						queryKey: getGetV1CashBalanceQueryKey(),
					});
					queryClient.invalidateQueries({
						queryKey: getGetV1VaultBalanceQueryKey(),
					});
					queryClient.invalidateQueries({
						queryKey: getGetV1CashTransactionsQueryKey(),
					});
				},
				onError: () =>
					addToast({
						variant: "error",
						title: "Transfer Gagal",
						message: "Terjadi kesalahan.",
					}),
			},
		);
	};

	return {
		cash,
		vault,
		todayTransactions,
		cashBalance,
		vaultBalance,
		cashLoading,
		vaultLoading,
		txLoading,
		today,
		transferOpen,
		setTransferOpen,
		transferAmount,
		setTransferAmount,
		transferNote,
		setTransferNote,
		parsedAmount,
		isAmountValid,
		handleTransfer,
		isPending: transferMutation.isPending,
	};
}
