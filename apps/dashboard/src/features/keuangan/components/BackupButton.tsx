import { Database } from "lucide-react";
import { useState } from "react";
import {
	type postV1BackupsResponse,
	usePostV1Backups,
} from "#/api/endpoints/backup/backup";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, useToast } from "#/components/ui";

export function BackupButton() {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const { addToast } = useToast();

	const backupMutation = usePostV1Backups({
		mutation: {
			onSuccess: (response: postV1BackupsResponse) => {
				if (response.status === 201) {
					const result = response.data.data;
					addToast({
						variant: "success",
						title: "Backup berhasil",
						message: result
							? `${result.filename} (${result.size_human})`
							: "File backup telah dibuat.",
					});
				}
				setConfirmOpen(false);
			},
			onError: (error: Error) => {
				const message =
					error instanceof ApiError
						? error.message
						: "Backup gagal. Periksa log server.";
				addToast({
					variant: "error",
					title: "Backup gagal",
					message,
				});
				setConfirmOpen(false);
			},
		},
	});

	const handleBackup = () => {
		backupMutation.mutate();
	};

	return (
		<>
			<Button
				variant="secondary"
				onClick={() => setConfirmOpen(true)}
				disabled={backupMutation.isPending}
			>
				<Database className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
				{backupMutation.isPending ? "Mem-backup..." : "Backup Database"}
			</Button>

			{confirmOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					{/* Backdrop */}
					<div
						className="fixed inset-0 bg-black/30"
						onClick={() => setConfirmOpen(false)}
						onKeyUp={(e) => e.key === "Escape" && setConfirmOpen(false)}
					/>

					{/* Dialog */}
					<div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
								<Database className="h-5 w-5 text-amber-600" />
							</div>
							<div>
								<h3 className="text-lg font-semibold text-gray-900">
									Backup Database?
								</h3>
								<p className="mt-1 text-sm text-gray-500">
									Ini akan membuat full backup database (pg_dump -Fc) dan
									menyimpannya di direktori backup VPS. Proses mungkin memakan
									waktu beberapa detik.
								</p>
							</div>
						</div>
						<div className="mt-6 flex justify-end gap-3">
							<Button variant="secondary" onClick={() => setConfirmOpen(false)}>
								Batal
							</Button>
							<Button
								variant="primary"
								onClick={handleBackup}
								disabled={backupMutation.isPending}
							>
								{backupMutation.isPending ? "Mem-backup..." : "Ya, Backup"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
