import { createFileRoute } from "@tanstack/react-router";
import { OlahHR } from "#/features/sdm/components/OlahHR";

export const Route = createFileRoute(
	"/_authenticated/sdm/penggajian/olah-hr/$id",
)({
	component: OlahHRPage,
});

function OlahHRPage() {
	const { id } = Route.useParams();
	return <OlahHR employeeId={Number(id)} />;
}
