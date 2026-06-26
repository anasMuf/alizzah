import { createFileRoute } from "@tanstack/react-router";
import { ExpenseDetail } from "#/features/keuangan/pengeluaran/components/ExpenseDetail";
import { useExpenseDetail } from "#/features/keuangan/pengeluaran/hooks/useExpenseDetail";

export const Route = createFileRoute(
	"/_authenticated/keuangan/pengeluaran/$id",
)({
	component: PengeluaranDetailPage,
});

function PengeluaranDetailPage() {
	const { id } = Route.useParams();
	const detail = useExpenseDetail(Number(id));

	return (
		<ExpenseDetail
			expense={detail.expense}
			isLoading={detail.isLoading}
			isError={detail.isError}
			isEditing={detail.isEditing}
			onStartEdit={() => detail.setIsEditing(true)}
			expenseDate={detail.expenseDate}
			onExpenseDateChange={detail.setExpenseDate}
			categories={detail.categories}
			parentCategoryId={detail.parentCategoryId}
			onParentCategoryChange={detail.setParentCategoryId}
			subCategoryId={detail.subCategoryId}
			onSubCategoryChange={detail.setSubCategoryId}
			subCategories={detail.subCategories}
			amount={detail.amount}
			onAmountChange={detail.setAmount}
			description={detail.description}
			onDescriptionChange={detail.setDescription}
			formError={detail.formError}
			onClearError={() => detail.setFormError("")}
			categoryDisplay={detail.categoryDisplay}
			isPending={detail.isPending}
			onSave={detail.handleSave}
			onCancelEdit={detail.handleCancelEdit}
			confirmDeleteOpen={detail.confirmDeleteOpen}
			onOpenDelete={() => detail.setConfirmDeleteOpen(true)}
			onCloseDelete={() => detail.setConfirmDeleteOpen(false)}
			onConfirmDelete={detail.handleDelete}
		/>
	);
}
