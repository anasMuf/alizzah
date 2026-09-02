import { useAuth } from "./AuthContext";

// Modul yang dapat di-grant ke user. Akses dibatasi per-modul (sejalan dengan
// RBAC by-modul di backend). superadmin selalu bypass semua modul.
export const MODULES = {
	administrasi: "administrasi",
	keuangan: "keuangan",
	koperasi: "koperasi",
	sdm: "sdm",
	laporan: "laporan",
} as const;

export type ModuleKey = (typeof MODULES)[keyof typeof MODULES];

export const MODULE_LABELS: Record<string, string> = {
	administrasi: "Administrasi",
	keuangan: "Keuangan",
	koperasi: "Koperasi",
	sdm: "SDM / HR",
	laporan: "Laporan",
};

const ROLE_KEY = "alizzah_role";
const MODULES_KEY = "alizzah_modules";

export function getStoredRole(): string {
	if (typeof localStorage === "undefined") return "";
	return localStorage.getItem(ROLE_KEY) || "";
}

export function getStoredModules(): string[] {
	if (typeof localStorage === "undefined") return [];
	try {
		const raw = localStorage.getItem(MODULES_KEY);
		return raw ? (JSON.parse(raw) as string[]) : [];
	} catch {
		return [];
	}
}

/**
 * hasModule — true bila user superadmin, atau (untuk admin) memiliki modul.
 * Tanpa `ctx`, membaca role/modul dari localStorage — dipakai di route guard
 * `beforeLoad` yang berjalan sebelum React render.
 */
export function hasModule(
	module: string,
	ctx?: { role?: string; modules?: string[] },
): boolean {
	const role = ctx?.role ?? getStoredRole();
	if (role === "superadmin") return true;
	const modules = ctx?.modules ?? getStoredModules();
	return modules.includes(module);
}

export function isSuperadmin(role?: string): boolean {
	return (role ?? getStoredRole()) === "superadmin";
}

/**
 * useAccess — helper gating reaktif berbasis user yang sedang login. Selama
 * profil belum termuat, jatuh ke nilai localStorage agar konsisten dgn beforeLoad.
 */
export function useAccess() {
	const { user } = useAuth();
	const role = user?.role ?? getStoredRole();
	const modules = user?.modules ?? getStoredModules();
	const superadmin = role === "superadmin";
	return {
		role,
		modules,
		isSuperadmin: superadmin,
		hasModule: (m: string) => superadmin || modules.includes(m),
	};
}
