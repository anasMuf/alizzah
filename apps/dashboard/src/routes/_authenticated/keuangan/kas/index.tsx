import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { KasOverview } from "#/features/keuangan/kas/components/KasOverview";
import { useCashOverview } from "#/features/keuangan/kas/hooks/useCashOverview";
import { academicYearAtom } from "@/store/global";
import { formatDate } from "@/utils/format";

export const Route = createFileRoute("/_authenticated/keuangan/kas/")({
	component: KasBerangkasOverviewPage,
});

function KasBerangkasOverviewPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const data = useCashOverview();

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold leading-7 text-gray-900">
					Kas & Berangkas
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					TA {activeAy?.name || "-"} &middot; {formatDate(data.today)}
				</p>
			</div>
			<KasOverview
				cash={data.cash}
				vault={data.vault}
				todayTransactions={data.todayTransactions}
				cashBalance={data.cashBalance}
				vaultBalance={data.vaultBalance}
				cashLoading={data.cashLoading}
				vaultLoading={data.vaultLoading}
				txLoading={data.txLoading}
				today={data.today}
				transferOpen={data.transferOpen}
				onTransferOpen={data.setTransferOpen}
				transferAmount={data.transferAmount}
				onTransferAmountChange={data.setTransferAmount}
				transferNote={data.transferNote}
				onTransferNoteChange={data.setTransferNote}
				parsedAmount={data.parsedAmount}
				isAmountValid={data.isAmountValid}
				onTransfer={data.handleTransfer}
				isPending={data.isPending}
			/>
		</div>
	);
}
