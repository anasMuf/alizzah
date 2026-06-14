import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight } from "lucide-react";
import { EmptyState } from "#/components/ui";
import { RombelForm } from "../../../../features/administrasi/components/RombelForm";
import { academicYearAtom } from "../../../../store/global";

export const Route = createFileRoute(
	"/_authenticated/administrasi/rombel/baru",
)({
	component: RombelBaruPage,
});

function RombelBaruPage() {
	const [activeAy] = useAtom(academicYearAtom);

	if (!activeAy) {
		return (
			<EmptyState
				title="Menunggu Tahun Ajaran"
				description="Data tahun ajaran sedang dimuat..."
			/>
		);
	}

	return (
		<div className="space-y-6 max-w-4xl">
			{/* Breadcrumb */}
			<nav className="flex" aria-label="Breadcrumb">
				<ol role="list" className="flex items-center space-x-2">
					<li>
						<Link
							to="/administrasi/rombel"
							className="text-gray-400 hover:text-gray-500"
						>
							Administrasi
						</Link>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight
								className="h-5 w-5 flex-shrink-0 text-gray-400"
								aria-hidden="true"
							/>
							<Link
								to="/administrasi/rombel"
								className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
							>
								Rombel
							</Link>
						</div>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight
								className="h-5 w-5 flex-shrink-0 text-gray-400"
								aria-hidden="true"
							/>
							<span
								className="ml-2 text-sm font-medium text-gray-900"
								aria-current="page"
							>
								Buat Baru
							</span>
						</div>
					</li>
				</ol>
			</nav>

			<div className="border-b border-gray-200 pb-5">
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Buat Rombel Baru
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Tahun Ajaran Aktif:{" "}
					<span className="font-semibold text-gray-700">{activeAy.name}</span>
				</p>
			</div>

			<div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
				<div className="px-4 py-6 sm:p-8">
					<RombelForm academicYearId={activeAy.id} />
				</div>
			</div>
		</div>
	);
}
