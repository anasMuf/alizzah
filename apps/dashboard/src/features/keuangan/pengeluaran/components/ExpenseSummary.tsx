import { formatCurrency } from "@/utils/format";

interface ExpenseSummaryProps {
	totalAmount: number;
	count: number;
}

export function ExpenseSummary({ totalAmount, count }: ExpenseSummaryProps) {
	return (
		<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm text-gray-500">Total Pengeluaran Periode Ini</p>
					<p className="text-2xl font-bold text-gray-900">
						{formatCurrency(totalAmount)}
					</p>
				</div>
				<div className="text-sm text-gray-500">{count} transaksi</div>
			</div>
		</div>
	);
}
