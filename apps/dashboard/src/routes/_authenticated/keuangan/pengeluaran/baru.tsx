import { createFileRoute } from "@tanstack/react-router";
import { ExpenseForm } from "#/features/keuangan/pengeluaran/components/ExpenseForm";
import { useExpenseForm } from "#/features/keuangan/pengeluaran/hooks/useExpenseForm";

export const Route = createFileRoute(
	"/_authenticated/keuangan/pengeluaran/baru",
)({
	component: CatatPengeluaranPage,
});

function CatatPengeluaranPage() {
	const form = useExpenseForm();

	const clearField = (field: string) => {
		form.setFieldErrors((prev) => {
			const n = { ...prev };
			delete n[field];
			return n;
		});
	};

	const handleParentChange = (val: string) => {
		form.setParentCategoryId(val);
		form.setSubCategoryId("");
		clearField("parent_category");
		clearField("expense_category_id");
	};

	return (
		<ExpenseForm
			categories={form.categories}
			subCategories={form.subCategories}
			expenseDate={form.expenseDate}
			onExpenseDateChange={form.setExpenseDate}
			parentCategoryId={form.parentCategoryId}
			onParentCategoryChange={handleParentChange}
			subCategoryId={form.subCategoryId}
			onSubCategoryChange={form.setSubCategoryId}
			amount={form.amount}
			onAmountChange={form.setAmount}
			description={form.description}
			onDescriptionChange={form.setDescription}
			onReceiptChange={form.setReceiptFile}
			formError={form.formError}
			onClearError={() => form.setFormError("")}
			fieldErrors={form.fieldErrors}
			onClearFieldError={clearField}
			isPending={form.isPending}
			onSubmit={form.handleSubmit}
		/>
	);
}
