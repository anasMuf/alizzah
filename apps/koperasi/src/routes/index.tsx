import { Button } from "@alizzah/ui";
import { createFileRoute } from "@tanstack/react-router";
import { Store } from "lucide-react";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
			<div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
				<div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
					<Store className="w-6 h-6 text-indigo-600" />
				</div>
				<h1 className="text-xl font-bold text-gray-900">Koperasi Alizzah</h1>
				<p className="text-sm text-gray-500">
					App koperasi (scaffold Fase 0). Mengonsumsi{" "}
					<code>@alizzah/ui</code>, <code>@alizzah/auth</code>, dan{" "}
					<code>@alizzah/api-client</code>. Fitur menyusul mulai sub-batch 8a.
				</p>
				<Button type="button" onClick={() => alert("Halo dari @alizzah/ui!")}>
					Tes Tombol UI
				</Button>
			</div>
		</div>
	);
}
