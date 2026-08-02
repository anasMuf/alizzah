import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customInstance } from "../../mutator/custom-instance";

// ── Types ──

export interface AppSettings {
	school_name?: string;
	signatory_name?: string;
	signatory_title?: string;
	logo_url?: string;
	signature_url?: string;
}

// ── Helpers ──

/** customInstance wraps response as { data: APIResponse, status, headers }.
 *  Gunakan helper ini untuk mengakses nested data. */
function unwrap<T>(res: unknown): T {
	return (res as any).data.data as T;
}

/** API base URL tanpa trailing /api (untuk akses static file) */
function apiBase(): string {
	const raw = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
	return raw.replace(/\/api\/?$/, "");
}

/** Normalisasi path relatif dari API menjadi absolute URL */
function normalizeUrl(path: string | undefined): string | undefined {
	if (!path) return undefined;
	if (path.startsWith("http://") || path.startsWith("https://")) return path;
	return apiBase() + path;
}

/** Normalisasi semua URL dalam settings object */
function normalizeSettings(s: AppSettings): AppSettings {
	return {
		...s,
		logo_url: normalizeUrl(s.logo_url),
		signature_url: normalizeUrl(s.signature_url),
	};
}

// ── Fetch settings ──

const SETTINGS_KEY = ["settings"] as const;

async function fetchSettings(): Promise<AppSettings> {
	const res = await customInstance("/v1/settings", { method: "GET" });
	return normalizeSettings(unwrap<AppSettings>(res));
}

export function useGetSettings() {
	return useQuery({
		queryKey: SETTINGS_KEY,
		queryFn: fetchSettings,
		staleTime: 5 * 60 * 1000,
	});
}

// ── Update settings ──

async function updateSettings(settings: Record<string, string>): Promise<void> {
	await customInstance("/v1/settings", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(settings),
	});
}

export function useUpdateSettings() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateSettings,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
		},
	});
}

// ── Upload file ──

interface UploadResponse {
	url: string;
}

async function uploadFile(file: File, prefix: string): Promise<string> {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("prefix", prefix);

	const res = await customInstance("/v1/settings/upload", {
		method: "POST",
		body: formData,
	});
	const data = unwrap<UploadResponse>(res);
	// Kembalikan path relatif apa adanya — normalisasi dilakukan saat display
	return data.url;
}

export function useUploadSettingFile() {
	return useMutation({
		mutationFn: ({ file, prefix }: { file: File; prefix: string }) =>
			uploadFile(file, prefix),
	});
}
