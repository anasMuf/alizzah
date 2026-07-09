import { createFileRoute } from "@tanstack/react-router";
import { AnggotaDetailPage } from "../../../../features/koperasi/anggota/AnggotaDetailPage";

export const Route = createFileRoute("/_authenticated/koperasi/anggota/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const memberId = parseInt(id, 10);

	if (Number.isNaN(memberId)) {
		return <div className="p-4 text-red-600">ID Anggota tidak valid</div>;
	}

	return <AnggotaDetailPage id={memberId} />;
}
