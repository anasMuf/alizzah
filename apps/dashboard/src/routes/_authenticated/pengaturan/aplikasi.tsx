import { createFileRoute, redirect } from "@tanstack/react-router";
import { Save, Upload } from "lucide-react";
import { useRef, useState } from "react";
import {
	useGetSettings,
	useUpdateSettings,
	useUploadSettingFile,
} from "#/api/endpoints/settings/settings";
import { Button, useToast } from "#/components/ui";
import { cacheAppSettings } from "#/utils/print";

export const Route = createFileRoute("/_authenticated/pengaturan/aplikasi")({
	beforeLoad: () => {
		const role = localStorage.getItem("alizzah_role");
		if (role !== "superadmin") {
			throw redirect({ to: "/" });
		}
	},
	component: PengaturanAplikasiPage,
});

function PengaturanAplikasiPage() {
	const { data: settings, isLoading } = useGetSettings();
	const updateMutation = useUpdateSettings();
	const uploadMutation = useUploadSettingFile();
	const { addToast } = useToast();

	const logoInputRef = useRef<HTMLInputElement>(null);
	const ttdInputRef = useRef<HTMLInputElement>(null);

	const [signatoryName, setSignatoryName] = useState("");
	const [signatoryTitle, setSignatoryTitle] = useState("");
	const [initialized, setInitialized] = useState(false);

	if (settings && !initialized) {
		setSignatoryName(settings.signatory_name || "");
		setSignatoryTitle(settings.signatory_title || "");
		setInitialized(true);
	}

	const refreshCache = async () => {
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL || "http://localhost:8080/api"}/v1/settings`,
				{
					headers: {
						Authorization: `Bearer ${localStorage.getItem("alizzah_token")}`,
					},
				},
			);
			const json = await res.json();
			if (json?.data) {
				cacheAppSettings(json.data);
			}
		} catch {
			// ignore
		}
	};

	const handleUpload = async (file: File, prefix: string) => {
		try {
			const url = await uploadMutation.mutateAsync({ file, prefix });
			addToast({
				variant: "success",
				title: "Berhasil",
				message: `File ${prefix} berhasil diupload`,
			});
			const key = prefix === "logo" ? "logo_url" : "signature_url";
			await updateMutation.mutateAsync({ [key]: url });
			await refreshCache();
		} catch (err: any) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: err?.message || "Upload gagal",
			});
		}
	};

	const handleSaveText = async () => {
		try {
			await updateMutation.mutateAsync({
				signatory_name: signatoryName,
				signatory_title: signatoryTitle,
			});
			addToast({
				variant: "success",
				title: "Berhasil",
				message: "Pengaturan tersimpan",
			});
			await refreshCache();
		} catch (err: any) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: err?.message || "Gagal menyimpan",
			});
		}
	};

	if (isLoading) {
		return (
			<div className="p-8">
				<p className="text-gray-500">Memuat pengaturan...</p>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto p-8">
			<h1 className="text-xl font-bold text-gray-900 mb-6">
				Pengaturan Aplikasi
			</h1>

			{/* ── Logo ── */}
			<section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
				<h2 className="text-base font-semibold text-gray-900 mb-1">Logo</h2>
				<p className="text-sm text-gray-500 mb-4">
					Logo yang tampil di kop surat saat mencetak laporan.
				</p>
				<div className="flex items-center gap-4">
					{settings?.logo_url && (
						<img
							src={settings.logo_url}
							alt="Logo"
							className="w-16 h-16 object-contain border rounded"
						/>
					)}
					<div>
						<input
							ref={logoInputRef}
							type="file"
							accept="image/png,image/jpeg,image/gif"
							className="hidden"
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) handleUpload(file, "logo");
							}}
						/>
						<Button
							variant="secondary"
							onClick={() => logoInputRef.current?.click()}
							disabled={uploadMutation.isPending}
						>
							<Upload className="w-4 h-4 mr-2" />
							{uploadMutation.isPending ? "Mengupload..." : "Upload Logo"}
						</Button>
					</div>
				</div>
			</section>

			{/* ── Tanda Tangan ── */}
			<section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
				<h2 className="text-base font-semibold text-gray-900 mb-1">
					Tanda Tangan Yayasan
				</h2>
				<p className="text-sm text-gray-500 mb-4">
					Gambar dan data penanda tangan yang tampil di bagian bawah laporan
					cetak.
				</p>

				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Gambar Tanda Tangan
					</label>
					<div className="flex items-center gap-4">
						{settings?.signature_url && (
							<img
								src={settings.signature_url}
								alt="Tanda Tangan"
								className="max-w-[140px] max-h-[60px] object-contain border rounded p-1"
							/>
						)}
						<div>
							<input
								ref={ttdInputRef}
								type="file"
								accept="image/png,image/jpeg,image/gif"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) handleUpload(file, "ttd-yayasan");
								}}
							/>
							<Button
								variant="secondary"
								onClick={() => ttdInputRef.current?.click()}
								disabled={uploadMutation.isPending}
							>
								<Upload className="w-4 h-4 mr-2" />
								{uploadMutation.isPending
									? "Mengupload..."
									: "Upload Tanda Tangan"}
							</Button>
						</div>
					</div>
				</div>

				<div className="mb-4">
					<label
						htmlFor="signatory_title"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Jabatan
					</label>
					<input
						id="signatory_title"
						type="text"
						value={signatoryTitle}
						onChange={(e) => setSignatoryTitle(e.target.value)}
						placeholder="e.g. Ketua Yayasan"
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
					/>
				</div>

				<div className="mb-4">
					<label
						htmlFor="signatory_name"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Nama Penanda Tangan
					</label>
					<input
						id="signatory_name"
						type="text"
						value={signatoryName}
						onChange={(e) => setSignatoryName(e.target.value)}
						placeholder="e.g. Khoirul Izzah"
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
					/>
				</div>

				<Button
					variant="primary"
					onClick={handleSaveText}
					disabled={updateMutation.isPending}
				>
					<Save className="w-4 h-4 mr-2" />
					{updateMutation.isPending ? "Menyimpan..." : "Simpan"}
				</Button>
			</section>

			{/* ── Preview ── */}
			<section className="bg-white rounded-lg border border-gray-200 p-6">
				<h2 className="text-base font-semibold text-gray-900 mb-3">
					Pratinjau Tanda Tangan pada Laporan
				</h2>
				<div className="border rounded-lg p-6 flex justify-end">
					<div className="text-center min-w-[180px]">
						<p className="text-xs text-gray-600 mb-0.5">Mengetahui,</p>
						<p className="text-xs font-semibold text-gray-900 mb-5">
							{signatoryTitle || "(Jabatan)"}
						</p>
						{settings?.signature_url ? (
							<div className="inline-block mb-1">
								<img
									src={settings.signature_url}
									alt="Tanda Tangan"
									className="max-w-[140px] max-h-[60px] object-contain mx-auto"
								/>
							</div>
						) : (
							<div className="h-[60px]" />
						)}
						<div className="border-b border-gray-800 mt-2 mb-1" />
						<p className="text-xs font-semibold text-gray-900">
							{signatoryName || "(Nama penanda tangan)"}
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}
