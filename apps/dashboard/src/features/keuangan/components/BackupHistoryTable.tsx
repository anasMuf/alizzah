import { Database, Download } from "lucide-react";
import { EmptyState } from "#/components/ui";

interface BackupFile {
	filename: string;
	size_human: string;
	timestamp: string;
	format: string;
}

interface BackupHistoryTableProps {
	files: BackupFile[];
	isLoading: boolean;
	onDownload: (filename: string) => void;
}

export function BackupHistoryTable({
	files,
	isLoading,
	onDownload,
}: BackupHistoryTableProps) {
	return (
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
						{isLoading ? (
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
							files.map((file) => (
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
											onClick={() => onDownload(file.filename)}
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
	);
}
