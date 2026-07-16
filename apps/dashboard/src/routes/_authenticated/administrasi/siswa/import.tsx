import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle2,
	ChevronRight,
	FileText,
	Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import {
	getGetV1StudentsQueryKey,
	usePostV1StudentsImport,
} from "#/api/endpoints/students/students";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, useToast } from "#/components/ui";

export const Route = createFileRoute(
	"/_authenticated/administrasi/siswa/import",
)({
	component: SiswaImportPage,
});

function SiswaImportPage() {
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();

	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [importResult, setImportResult] = useState<any>(null);

	const importMutation = usePostV1StudentsImport({
		mutation: {
			onSuccess: (res) => {
				const data = (res as any).data.data;
				setImportResult(data);
				if (data.total_failed === 0) {
					addToast({
						variant: "success",
						title: "Import Berhasil",
						message: "Semua data siswa berhasil diimpor.",
					});
				} else {
					addToast({
						variant: "warning",
						title: "Import Selesai dengan Error",
						message: `Berhasil: ${data.total_success}, Gagal: ${data.total_failed}`,
					});
				}
				queryClient.invalidateQueries({ queryKey: getGetV1StudentsQueryKey() });
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Terjadi kesalahan saat upload";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			setSelectedFile(e.target.files[0]);
			setImportResult(null); // Reset prev result
		}
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			const file = e.dataTransfer.files[0];
			if (file.type === "text/csv" || file.name.endsWith(".csv")) {
				setSelectedFile(file);
				setImportResult(null);
			} else {
				addToast({
					variant: "error",
					title: "Format Tidak Sesuai",
					message: "Hanya file CSV yang diizinkan.",
				});
			}
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (selectedFile) {
			importMutation.mutate({ data: { file: selectedFile } });
		}
	};

	const downloadTemplate = () => {
		const csvContent =
			"data:text/csv;charset=utf-8,full_name,birth_place,birth_date,gender,religion\nJohn Doe,Jakarta,2015-05-12,L,Islam\nJane Doe,Bandung,2016-10-21,P,Kristen";
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", "template_import_siswa.csv");
		document.body.appendChild(link);
		link.click();
		link.remove();
	};

	return (
		<div className="space-y-6 max-w-4xl mx-auto">
			{/* Breadcrumb */}
			<nav className="flex" aria-label="Breadcrumb">
				<ol className="flex items-center space-x-2">
					<li>
						<Link
							to="/administrasi/siswa"
							search={{} as any}
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
								to="/administrasi/siswa"
								search={{} as any}
								className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
							>
								Siswa
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
								Import CSV
							</span>
						</div>
					</li>
				</ol>
			</nav>

			<div className="border-b border-gray-200 pb-5">
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Import Data Siswa
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Upload file CSV yang berisi data siswa massal.
				</p>
			</div>

			{!importResult ? (
				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
						<div className="mb-6 flex items-center justify-between">
							<div>
								<h3 className="text-base font-semibold leading-6 text-gray-900">
									Format File
								</h3>
								<div className="mt-2 max-w-xl text-sm text-gray-500">
									<p>
										Pastikan file CSV Anda memiliki kolom:{" "}
										<code>full_name</code>, <code>birth_place</code>,{" "}
										<code>birth_date</code> (YYYY-MM-DD), <code>gender</code>{" "}
										(L/P), dan <code>religion</code>.
									</p>
								</div>
							</div>
							<Button
								type="button"
								variant="secondary"
								onClick={downloadTemplate}
							>
								Download Template
							</Button>
						</div>

						<div
							className={`mt-2 flex justify-center rounded-lg border border-dashed px-6 py-10 ${selectedFile ? "border-indigo-600 bg-indigo-50" : "border-gray-900/25"}`}
							onDragOver={(e) => e.preventDefault()}
							onDrop={handleDrop}
						>
							<div className="flex flex-col items-center justify-center pt-5 pb-6">
								{selectedFile ? (
									<FileText
										className="h-10 w-10 text-indigo-500 mb-3"
										aria-hidden="true"
									/>
								) : (
									<Upload
										className="h-10 w-10 text-gray-400 mb-3"
										aria-hidden="true"
									/>
								)}

								<div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
									<label
										htmlFor="file-upload"
										className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
									>
										<span>
											{selectedFile ? "Pilih file lain" : "Upload file CSV"}
										</span>
										<input
											id="file-upload"
											name="file-upload"
											type="file"
											accept=".csv"
											className="sr-only"
											onChange={handleFileChange}
											ref={fileInputRef}
										/>
									</label>
									{!selectedFile && (
										<p className="pl-1">atau drag and drop kesini</p>
									)}
								</div>
								{selectedFile && (
									<p className="mt-2 text-sm text-indigo-900 font-medium">
										Terpilih: {selectedFile.name}
									</p>
								)}
								{!selectedFile && (
									<p className="text-xs leading-5 text-gray-600">
										CSV up to 10MB
									</p>
								)}
							</div>
						</div>
					</div>

					<div className="flex justify-end gap-3">
						<Link to="/administrasi/siswa" search={{} as any}>
							<Button
								type="button"
								variant="secondary"
								disabled={importMutation.isPending}
							>
								Batal
							</Button>
						</Link>
						<Button
							type="submit"
							variant="primary"
							disabled={!selectedFile || importMutation.isPending}
						>
							{importMutation.isPending ? "Mengimpor..." : "Mulai Import"}
						</Button>
					</div>
				</form>
			) : (
				<div className="bg-white shadow sm:rounded-lg overflow-hidden">
					<div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
						<h3 className="text-base font-semibold leading-6 text-gray-900">
							Hasil Import
						</h3>
						<p className="mt-1 max-w-2xl text-sm text-gray-500">
							Total baris diproses: {importResult.total_processed}
						</p>
					</div>

					<div className="px-4 py-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
						<div className="bg-green-50 rounded-lg p-4 border border-green-200 flex items-start">
							<CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 mr-3" />
							<div>
								<h4 className="text-lg font-bold text-green-900">
									{importResult.total_success}
								</h4>
								<p className="text-sm text-green-700">Berhasil diimport</p>
							</div>
						</div>
						<div
							className={`rounded-lg p-4 border flex items-start ${importResult.total_failed > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}
						>
							<AlertCircle
								className={`h-6 w-6 mt-0.5 mr-3 ${importResult.total_failed > 0 ? "text-red-600" : "text-gray-400"}`}
							/>
							<div>
								<h4
									className={`text-lg font-bold ${importResult.total_failed > 0 ? "text-red-900" : "text-gray-900"}`}
								>
									{importResult.total_failed}
								</h4>
								<p
									className={`text-sm ${importResult.total_failed > 0 ? "text-red-700" : "text-gray-500"}`}
								>
									Gagal diimport
								</p>
							</div>
						</div>
					</div>

					{importResult.total_failed > 0 && (
						<div className="px-4 pb-6 sm:px-6">
							<h4 className="text-sm font-semibold text-gray-900 mb-3">
								Detail Error
							</h4>
							<div className="mt-2 flow-root">
								<div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
									<div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
										<table className="min-w-full divide-y divide-gray-300">
											<thead>
												<tr>
													<th
														scope="col"
														className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
													>
														Baris
													</th>
													<th
														scope="col"
														className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
													>
														Nama/Data
													</th>
													<th
														scope="col"
														className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
													>
														Error
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-200">
												{importResult.details
													.filter((d: any) => !d.success)
													.map((detail: any, idx: number) => (
														<tr key={idx}>
															<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
																{detail.row}
															</td>
															<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
																{detail.name || "-"}
															</td>
															<td className="px-3 py-4 text-sm text-red-600">
																{detail.error}
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</div>
					)}

					<div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200 flex justify-end">
						<Link to="/administrasi/siswa" search={{} as any}>
							<Button
								variant="secondary"
								onClick={() =>
									navigate({ to: "/administrasi/siswa", search: {} as any })
								}
							>
								Kembali ke Daftar Siswa
							</Button>
						</Link>
					</div>
				</div>
			)}
		</div>
	);
}
