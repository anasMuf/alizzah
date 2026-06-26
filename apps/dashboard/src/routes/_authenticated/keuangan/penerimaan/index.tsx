import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "#/components/ui";
import { IncomeTable } from "#/features/keuangan/penerimaan/components/IncomeTable";
import { useIncomeList } from "#/features/keuangan/penerimaan/hooks/useIncomeList";

export const Route = createFileRoute("/_authenticated/keuangan/penerimaan/")({
	component: PenerimaanListPage,
});

function PenerimaanListPage() {
	const data = useIncomeList();

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold leading-7 text-gray-900">
						Penerimaan Dana Bantuan
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Catat penerimaan dari BOS, donasi, hibah, dan sumber lainnya.
					</p>
				</div>
				<Link to="/keuangan/penerimaan/baru">
					<Button variant="primary">
						<Plus className="w-4 h-4 mr-2" /> Catat Penerimaan
					</Button>
				</Link>
			</div>

			<IncomeTable
				items={data.items}
				meta={data.meta}
				isLoading={data.isLoading}
				isError={data.isError}
				selectedCategory={data.selectedCategory}
				onCategoryChange={data.setSelectedCategory}
				dateFrom={data.dateFrom}
				onDateFromChange={data.setDateFrom}
				dateTo={data.dateTo}
				onDateToChange={data.setDateTo}
				page={data.page}
				onPageChange={data.setPage}
				onReset={data.handleReset}
				deletingItem={data.deletingItem}
				onDeleteClick={data.setDeletingItem}
				onDeleteCancel={() => data.setDeletingItem(null)}
				onDeleteConfirm={() =>
					data.deletingItem && data.handleDelete(data.deletingItem.id)
				}
			/>
		</div>
	);
}
