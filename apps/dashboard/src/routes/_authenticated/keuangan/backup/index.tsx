import { createFileRoute } from "@tanstack/react-router";
import { Download, HardDrive, RefreshCw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import {
	type postV1BackupsPreviewResponse,
	type postV1BackupsResponse,
	type postV1BackupsRestoreResponse,
	useGetV1Backups,
	usePostV1Backups,
	usePostV1BackupsPreview,
	usePostV1BackupsRestore,
} from "#/api/endpoints/backup/backup";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, useToast } from "#/components/ui";
import { isSuperadmin as checkSuperadmin } from "#/features/auth/access";
import { BackupHistoryTable } from "#/features/keuangan/components/BackupHistoryTable";
import { FormatSelector } from "#/features/keuangan/components/FormatSelector";
import { RestoreDialog } from "#/features/keuangan/components/RestoreDialog";

export const Route = createFileRoute("/_authenticated/keuangan/backup/")({
	beforeLoad: () => {
		if (!checkSuperadmin()) {
			throw new Error("Akses tidak diizinkan");
		}
	},
	component: BackupPage,
});

type Format = "dump" | "sql" | "sql-compat";

function BackupPage() {
	const [format, setFormat] = useState<Format>("dump");
	const { addToast } = useToast();

	const { data: listData, isLoading: listLoading, refetch } = useGetV1Backups();
	const files: any[] = (listData as any)?.data?.data || [];

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
				addToast({
					variant: "error",
					title: "Backup gagal",
					message:
						error instanceof ApiError
							? error.message
							: "Backup gagal. Periksa log server.",
				});
			},
		},
	});

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewData, setPreviewData] = useState<any>(null);

	const restoreMutation = usePostV1BackupsRestore({
		mutation: {
			onSuccess: (response: postV1BackupsRestoreResponse) => {
				if (response.status === 200) {
					addToast({
						variant: "success",
						title: "Restore berhasil",
						message:
							(response.data as any)?.message || "Database telah di-reset.",
					});
					refetch();
				}
				setPreviewData(null);
				setSelectedFile(null);
			},
			onError: (error: Error) => {
				addToast({
					variant: "error",
					title: "Restore gagal",
					message:
						error instanceof ApiError
							? error.message
							: "Gagal restore database.",
				});
				setPreviewData(null);
				setSelectedFile(null);
			},
		},
	});

	const previewMutation = usePostV1BackupsPreview({
		mutation: {
			onSuccess: (response: postV1BackupsPreviewResponse) => {
				if (response.status === 200) {
					setPreviewData((response.data as any)?.data);
				}
			},
			onError: (error: Error) => {
				addToast({
					variant: "error",
					title: "Preview gagal",
					message:
						error instanceof ApiError
							? error.message
							: "Gagal membaca file backup.",
				});
				setSelectedFile(null);
			},
		},
	});

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setSelectedFile(file);
			previewMutation.mutate({ data: { file } });
		}
		e.target.value = "";
	};

	const handleRestore = () => {
		if (selectedFile) restoreMutation.mutate({ data: { file: selectedFile } });
	};

	const handleBackup = () => backupMutation.mutate({ params: { format } });

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

	const closePreview = () => {
		setPreviewData(null);
		setSelectedFile(null);
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
						<RefreshCw className="-ml-0.5 mr-1.5 h-5 w-5" /> Refresh
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
					<input
						type="file"
						ref={fileInputRef}
						onChange={handleFileSelect}
						accept=".dump,.sql"
						className="hidden"
					/>
					<Button
						variant="secondary"
						onClick={() => fileInputRef.current?.click()}
						disabled={backupMutation.isPending}
					>
						<Upload className="-ml-0.5 mr-1.5 h-5 w-5" /> Import/Restore
					</Button>
				</div>
			</div>

			<FormatSelector format={format} onChange={setFormat} />

			<BackupHistoryTable
				files={files}
				isLoading={listLoading}
				onDownload={handleDownload}
			/>

			{selectedFile && (previewMutation.isPending || previewData) && (
				<RestoreDialog
					file={selectedFile}
					isLoading={previewMutation.isPending}
					previewData={previewData}
					isRestoring={restoreMutation.isPending}
					onClose={closePreview}
					onRestore={handleRestore}
				/>
			)}
		</div>
	);
}
