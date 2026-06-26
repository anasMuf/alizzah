import { createFileRoute } from "@tanstack/react-router";
import { IncomeDetail } from "#/features/keuangan/penerimaan/components/IncomeDetail";
import { useIncomeDetail } from "#/features/keuangan/penerimaan/hooks/useIncomeDetail";

export const Route = createFileRoute("/_authenticated/keuangan/penerimaan/$id")(
	{ component: PenerimaanDetailPage },
);

function PenerimaanDetailPage() {
	const { id } = Route.useParams();
	const d = useIncomeDetail(Number(id));

	return (
		<IncomeDetail
			item={d.item}
			isLoading={d.isLoading}
			showDelete={d.showDelete}
			onDeleteClick={() => d.setShowDelete(true)}
			onDeleteCancel={() => d.setShowDelete(false)}
			onDeleteConfirm={d.handleDelete}
		/>
	);
}
