import {
	Code,
	Database,
	Eye,
	Hash,
	List,
	RefreshCw,
	Table,
} from "lucide-react";
import { Button } from "#/components/ui";

interface TableInfo {
	name: string;
	schema: string;
	type: string;
}

interface RestorePreview {
	filename: string;
	format: string;
	size_bytes: number;
	tables: TableInfo[];
}

interface RestoreDialogProps {
	file: File;
	isLoading: boolean;
	previewData: RestorePreview | null;
	isRestoring: boolean;
	onClose: () => void;
	onRestore: () => void;
}

function getTableIcon(type?: string) {
	const iconClass = "h-3.5 w-3.5 inline-block mr-1";
	switch (type) {
		case "TABLE":
			return <Table className={iconClass} />;
		case "SEQUENCE":
			return <List className={iconClass} />;
		case "FUNCTION":
			return <Code className={iconClass} />;
		case "INDEX":
			return <Hash className={iconClass} />;
		case "VIEW":
			return <Eye className={iconClass} />;
		default:
			return <Database className={iconClass} />;
	}
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getTypeBadge(type: string) {
	const colors: Record<string, string> = {
		TABLE: "bg-blue-50 text-blue-700",
		SEQUENCE: "bg-green-50 text-green-700",
		FUNCTION: "bg-purple-50 text-purple-700",
		INDEX: "bg-amber-50 text-amber-700",
		VIEW: "bg-cyan-50 text-cyan-700",
	};
	return `inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${colors[type] ?? "bg-gray-50 text-gray-600"}`;
}

export function RestoreDialog({
	file,
	isLoading,
	previewData,
	isRestoring,
	onClose,
	onRestore,
}: RestoreDialogProps) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="fixed inset-0 bg-black/30" onClick={onClose} />
			<div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
				{isLoading ? (
					<div className="text-center py-8">
						<RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
						<p className="mt-3 text-sm text-gray-600">Memuat preview...</p>
					</div>
				) : previewData ? (
					<>
						<h3 className="text-lg font-semibold text-gray-900">
							Preview Restore
						</h3>

						<div className="mt-3 space-y-1 text-sm text-gray-600">
							<p>
								<strong>File:</strong> {file.name}
							</p>
							<p>
								<strong>Ukuran:</strong> {formatBytes(file.size)}
							</p>
							<p>
								<strong>Format:</strong> {previewData.format}
							</p>
						</div>

						<p className="mt-3 text-sm text-red-600">
							Ini akan <strong>menghapus semua data</strong> di database saat
							ini dan menggantinya dengan data dari file backup.
						</p>

						<div className="mt-4 max-h-60 overflow-y-auto border rounded-md">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
											Schema
										</th>
										<th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
											Nama
										</th>
										<th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
											Tipe
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100">
									{previewData.tables.map((t, i) => (
										<tr key={`${t.schema}-${t.name}-${i}`}>
											<td className="px-3 py-1.5 text-xs text-gray-500">
												{t.schema}
											</td>
											<td className="px-3 py-1.5 text-xs font-medium text-gray-900">
												<span className="inline-flex items-center">
													{getTableIcon(t.type)}
													{t.name}
												</span>
											</td>
											<td className="px-3 py-1.5 text-xs">
												<span className={getTypeBadge(t.type)}>{t.type}</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
							{previewData.tables.length === 0 && (
								<p className="p-4 text-sm text-gray-500 text-center">
									Tidak ada tabel ditemukan
								</p>
							)}
						</div>

						<div className="mt-6 flex justify-end gap-3">
							<Button variant="secondary" onClick={onClose}>
								Batal
							</Button>
							<Button
								variant="danger"
								onClick={onRestore}
								disabled={isRestoring}
							>
								{isRestoring ? "Merestore..." : "Restore"}
							</Button>
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
