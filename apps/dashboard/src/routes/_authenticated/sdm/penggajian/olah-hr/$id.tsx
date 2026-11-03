import { createFileRoute } from "@tanstack/react-router";
import { OlahHR } from "#/features/sdm/components/OlahHR";

export const Route = createFileRoute(
	"/_authenticated/sdm/penggajian/olah-hr/$id",
)({
	component: OlahHRPage,
	// Periode dibawa agar tombol kembali & tautan slip memakai bulan yang sama.
	validateSearch: (search: Record<string, unknown>): { periode?: string } => {
		const periode = search.periode;
		return typeof periode === "string" && periode !== "" ? { periode } : {};
	},
});

function OlahHRPage() {
	const { id } = Route.useParams();
	const { periode } = Route.useSearch();
	return <OlahHR employeeId={Number(id)} periode={periode} />;
}
