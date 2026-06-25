import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "#/components/ui";
import { ExpenseFilter } from "#/features/keuangan/pengeluaran/components/ExpenseFilter";
import { ExpenseSummary } from "#/features/keuangan/pengeluaran/components/ExpenseSummary";
import { ExpenseTable } from "#/features/keuangan/pengeluaran/components/ExpenseTable";
import { useExpenseList } from "#/features/keuangan/pengeluaran/hooks/useExpenseList";

export const Route = createFileRoute("/_authenticated/keuangan/pengeluaran/")({
	component: PengeluaranListPage,
});

function PengeluaranListPage() {
	const {
		activeAy,
		expenses,
		meta,
		categories,
		isLoading,
		isError,
		search,
		setSearch,
		selectedCategory,
		setSelectedCategory,
		dateFrom,
		setDateFrom,
		dateTo,
		setDateTo,
		page,
		setPage,
		totalAmount,
		handleReset,
		getCategoryLabel,
	} = useExpenseList();

	return (
		<div className="space-y-6">
			<div className="sm:flex sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
						Pengeluaran
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Daftar semua pengeluaran operasional sekolah.
					</p>
				</div>
				<div className="mt-4 sm:mt-0">
					<Link to="/keuangan/pengeluaran/baru">
						<Button variant="primary">
							<Plus className="w-4 h-4 mr-2" />
							Catat Pengeluaran
						</Button>
					</Link>
				</div>
			</div>

			<ExpenseFilter
				search={search}
				onSearchChange={setSearch}
				categories={categories}
				selectedCategory={selectedCategory}
				onCategoryChange={(v) => {
					setSelectedCategory(v);
					setPage(1);
				}}
				dateFrom={dateFrom}
				onDateFromChange={(v) => {
					setDateFrom(v);
					setPage(1);
				}}
				dateTo={dateTo}
				onDateToChange={(v) => {
					setDateTo(v);
					setPage(1);
				}}
				onReset={handleReset}
			/>

			<ExpenseSummary totalAmount={totalAmount} count={expenses.length} />

			<ExpenseTable
				expenses={expenses}
				meta={meta}
				isLoading={isLoading}
				isError={isError}
				page={page}
				onPageChange={setPage}
				getCategoryLabel={getCategoryLabel}
			/>
		</div>
	);
}
