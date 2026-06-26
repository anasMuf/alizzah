import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { CashTransactionTable } from "#/features/keuangan/kas/components/CashTransactionTable";
import { useCashTransactions } from "#/features/keuangan/kas/hooks/useCashTransactions";

export const Route = createFileRoute("/_authenticated/keuangan/kas/transaksi")({
	component: KasTransaksiPage,
});

function KasTransaksiPage() {
	const data = useCashTransactions();

	return (
		<div className="space-y-6">
			<nav className="flex items-center gap-1 text-sm text-gray-500">
				<Link to="/keuangan/kas" className="hover:text-indigo-600">
					Kas & Berangkas
				</Link>
				<ChevronRight className="h-4 w-4" />
				<span className="text-gray-900 font-medium">Riwayat Transaksi</span>
			</nav>
			<div>
				<h2 className="text-2xl font-bold leading-7 text-gray-900">
					Riwayat Transaksi Kas
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					TA {data.activeAy?.name || "-"}
				</p>
			</div>
			<CashTransactionTable
				transactions={data.transactions}
				meta={data.meta}
				isLoading={data.isLoading}
				startDate={data.startDate}
				onStartDateChange={data.setStartDate}
				endDate={data.endDate}
				onEndDateChange={data.setEndDate}
				jenis={data.jenis}
				onJenisChange={data.setJenis}
				tipe={data.tipe}
				onTipeChange={data.setTipe}
				page={data.page}
				onPageChange={data.setPage}
				totalCredit={data.totalCredit}
				totalDebit={data.totalDebit}
				groupedByDate={data.groupedByDate}
				onReset={data.handleReset}
			/>
		</div>
	);
}
