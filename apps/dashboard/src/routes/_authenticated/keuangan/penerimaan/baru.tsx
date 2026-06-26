import { createFileRoute } from "@tanstack/react-router";
import { IncomeForm } from "#/features/keuangan/penerimaan/components/IncomeForm";
import { useIncomeForm } from "#/features/keuangan/penerimaan/hooks/useIncomeForm";

export const Route = createFileRoute(
	"/_authenticated/keuangan/penerimaan/baru",
)({ component: PenerimaanBaruPage });

function PenerimaanBaruPage() {
	const f = useIncomeForm();
	return (
		<IncomeForm
			category={f.category}
			onCategoryChange={f.setCategory}
			sourceName={f.sourceName}
			onSourceNameChange={f.setSourceName}
			amount={f.amount}
			onAmountChange={f.setAmount}
			transactionDate={f.transactionDate}
			onTransactionDateChange={f.setTransactionDate}
			referenceNumber={f.referenceNumber}
			onReferenceNumberChange={f.setReferenceNumber}
			notes={f.notes}
			onNotesChange={f.setNotes}
			isPending={f.isPending}
			canSubmit={f.canSubmit}
			onSubmit={f.handleSubmit}
		/>
	);
}
