import { createFileRoute } from "@tanstack/react-router";
import { Database, Download, HardDrive, RefreshCw } from "lucide-react";
import { useState } from "react";
import {
	type postV1BackupsResponse,
	useGetV1Backups,
	usePostV1Backups,
} from "#/api/endpoints/backup/backup";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, EmptyState, useToast } from "#/components/ui";
import { isSuperadmin as checkSuperadmin } from "#/features/auth/access";

export const Route = createFileRoute("/_authenticated/keuangan/backup/")({
	beforeLoad: () => {
		if (!checkSuperadmin()) {
			throw new Error("Akses tidak diizinkan");
		}
	},
	component: BackupPage,
});

type Format = "dump" | "sql" | "sql-compat";

const FORMAT_LABELS: Record<Format, string> = {
	dump: ".dump (Custom — pg_restore)",
	sql: ".sql (Plain SQL)",
	"sql-compat": ".sql Kompatibel (tanpa restrict)",
};

function BackupPage() {
	const [format, setFormat] = useState<Format>("dump");
	const { addToast } = useToast();

	// List backup files
	const { data: listData, isLoading: listLoading, refetch } = useGetV1Backups();
	const files: any[] = (listData as any)?.data?.data || [];

	// Create backup mutation
	const backupMutation = usePostV1Backups({
		mutation: {
			onSuccess: (response: postV1BackupsResponse) => {
				if (response.status === 201) {
					const result = response.data.data as any;
					addToast({
						variant: "success",
						title: "Backup berhasil",
						message: result
							? `${result.filename} (${result.size_human})`
							: "File backup telah dibuat.",
					});
					refetch();
				}
			},
			onError: (error: Error) => {
				const message =
					error instanceof ApiError
						? error.message
						: "Backup gagal. Periksa log server.";
				addToast({ variant: "error", title: "Backup gagal", message });
			},
		},
	});

	const handleBackup = () => {
		backupMutation.mutate({ params: { format } });
	};

	const handleBackupAndDownload = () => {
		backupMutation.mutate(
			{ params: { format } },
			{
				onSuccess: async (response: postV1BackupsResponse) => {
					if (response.status === 201) {
						const result = response.data.data as any;
						addToast({
							variant: "success",
							title: "Backup berhasil",
							message: `Mendownload ${result?.filename ?? "file"}...`,
						});
						refetch();

						// Download the file
						if (result?.filename) {
							try {
								const { getV1BackupsFilename } = await import(
									"#/api/endpoints/backup/backup"
								);
								const res = await getV1BackupsFilename(result.filename);
								if (res.status === 200) {
									const blob = await (res.data as unknown as Response).blob?.();
									if (blob) {
										const url = URL.createObjectURL(blob);
										const a = document.createElement("a");
										a.href = url;
										a.download = result.filename;
										document.body.appendChild(a);
										a.click();
										a.remove();
										URL.revokeObjectURL(url);
									}
								}
							} catch {
								addToast({
									variant: "error",
									title: "Download gagal",
									message: "File backup tidak dapat didownload.",
								});
							}
						}
					}
				},
			},
		);
	};

	const handleDownload = async (filename: string) => {
		try {
			const { getV1BackupsFilename } = await import(
				"#/api/endpoints/backup/backup"
			);
			const res = await getV1BackupsFilename(filename);
			if (res.status === 200) {
				const blob = await (res.data as unknown as Response).blob?.();
				if (blob) {
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = filename;
					document.body.appendChild(a);
					a.click();
					a.remove();
					URL.revokeObjectURL(url);
					addToast({
						variant: "success",
						title: "Download dimulai",
						message: filename,
					});
				}
			}
		} catch {
			addToast({
				variant: "error",
				title: "Download gagal",
				message: `Tidak dapat mendownload ${filename}`,
			});
		}
	};

	return (
		<div className="space-y-6 max-w-7xl mx-auto">
			{/* Header */}
			<div className="border-b border-gray-200 pb-5 sm:flex sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">
						Backup Database
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Kelola backup database PostgreSQL — superadmin only
					</p>
				</div>
				<div className="mt-4 sm:ml-4 sm:mt-0 flex gap-2">
					<Button variant="secondary" onClick={() => refetch()}>
						<RefreshCw className="-ml-0.5 mr-1.5 h-5 w-5" />
						Refresh
					</Button>
					<Button
						variant="secondary"
						onClick={handleBackup}
						disabled={backupMutation.isPending}
					>
						<HardDrive className="-ml-0.5 mr-1.5 h-5 w-5" />
						{backupMutation.isPending ? "Mem-backup..." : "Backup"}
					</Button>
					<Button
						variant="primary"
						onClick={handleBackupAndDownload}
						disabled={backupMutation.isPending}
					>
						<Download className="-ml-0.5 mr-1.5 h-5 w-5" />
						{backupMutation.isPending ? "Mem-backup..." : "Backup & Download"}
					</Button>
				</div>
			</div>

			{/* Format Selector */}
			<div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-4">
				<h3 className="text-sm font-semibold text-gray-900 mb-3">
					Format Backup
				</h3>
				<div className="flex flex-wrap gap-2">
					{(Object.keys(FORMAT_LABELS) as Format[]).map((fmt) => (
						<button
							key={fmt}
							type="button"
							onClick={() => setFormat(fmt)}
							className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${
								format === fmt
									? "bg-indigo-50 text-indigo-700 ring-indigo-700/20"
									: "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
							}`}
						>
							<Database
								className={`mr-2 h-4 w-4 ${
									format === fmt ? "text-indigo-500" : "text-gray-400"
								}`}
							/>
							{FORMAT_LABELS[fmt]}
						</button>
					))}
				</div>
			</div>

			{/* Backup History Table */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-300">
						<thead className="bg-gray-50">
							<tr>
								<th
									scope="col"
									className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
								>
									Nama File
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Ukuran
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Tanggal
								</th>
								<th
									scope="col"
									className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>
									Format
								</th>
								<th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
									<span className="sr-only">Aksi</span>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white">
							{listLoading ? (
								Array.from({ length: 3 }).map((_, i) => (
									<tr key={`skeleton-${i}`}>
										<td className="py-4 pl-4 sm:pl-6">
											<div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
										</td>
										<td className="px-3 py-4">
											<div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
										</td>
										<td className="px-3 py-4">
											<div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
										</td>
										<td className="px-3 py-4">
											<div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
										</td>
										<td className="py-4 pr-4 sm:pr-6" />
									</tr>
								))
							) : files.length === 0 ? (
								<tr>
									<td colSpan={5}>
										<EmptyState
											icon={<Database className="h-12 w-12 text-gray-300" />}
											title="Belum ada backup"
											description="Klik 'Backup' untuk membuat backup database pertama."
										/>
									</td>
								</tr>
							) : (
								files.map((file: any) => (
									<tr key={file.filename} className="group hover:bg-gray-50">
										<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
											{file.filename}
										</td>
										<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
											{file.size_human}
										</td>
										<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
											{file.timestamp}
										</td>
										<td className="whitespace-nowrap px-3 py-4 text-sm">
											<span
												className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
													file.format === "dump"
														? "bg-blue-50 text-blue-700"
														: "bg-emerald-50 text-emerald-700"
												}`}
											>
												{file.format === "dump" ? ".dump" : ".sql"}
											</span>
										</td>
										<td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
											<button
												type="button"
												onClick={() => handleDownload(file.filename)}
												className="text-indigo-600 hover:text-indigo-900 opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<Download className="h-4 w-4" />
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
