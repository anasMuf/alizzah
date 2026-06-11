import { useQueryClient } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { setTokenGetter } from "@alizzah/api-client/mutator/custom-instance";
import {
	getGetV1AuthMeQueryKey,
	useGetV1AuthMe,
} from "@alizzah/api-client/endpoints/auth/auth";

export interface User {
	id: number;
	full_name: string;
	username: string;
	email: string;
	phone: string;
	address: string;
	role: string;
	deposit: number;
}

interface AuthContextType {
	isAuthenticated: boolean;
	isLoading: boolean;
	user: User | null;
	login: (token: string) => void;
	logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Token storage ───
// Disimpan di localStorage agar sesi bertahan saat halaman di-reload.
// Token JWT punya masa berlaku (exp) dan tetap divalidasi ke server via /auth/me,
// jadi token kedaluwarsa/invalid otomatis memicu logout.
const TOKEN_KEY = "alizzah_token";

// Inisialisasi dari localStorage saat modul dimuat, supaya hasToken() sudah
// tersedia untuk route guard (beforeLoad) yang jalan SEBELUM React render.
let _token: string | null =
	typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

export function getToken(): string | null {
	return _token;
}

// Daftarkan sumber token ke api-client (memutus siklus auth <-> api-client).
setTokenGetter(getToken);

export function setTokenValue(token: string | null) {
	_token = token;
	if (typeof localStorage === "undefined") return;
	if (token) {
		localStorage.setItem(TOKEN_KEY, token);
	} else {
		localStorage.removeItem(TOKEN_KEY);
	}
}

/**
 * Checks if a token exists in memory.
 * Used by route guards (beforeLoad) which run BEFORE React renders.
 */
export function hasToken(): boolean {
	return !!_token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
	// Inisialisasi dari token yang sudah dipersist (bertahan saat reload)
	const [token, setToken] = useState<string | null>(() => getToken());
	const queryClient = useQueryClient();

	// Fetch user profile when token is available
	const {
		data: userResponse,
		isLoading,
		isError,
	} = useGetV1AuthMe({
		query: { enabled: !!token, retry: false, staleTime: 5 * 60 * 1000 },
	});

	// Gunakan ref untuk stabilkan referensi logout (M02: cegah effect loop)
	const logoutRef = useRef<() => void>(() => {});

	logoutRef.current = () => {
		setTokenValue(null);
		setToken(null);
		localStorage.removeItem("alizzah_role");
		queryClient.removeQueries({ queryKey: getGetV1AuthMeQueryKey() });
	};

	const logout = useCallback(() => {
		logoutRef.current();
	}, []);

	// M02: Effect hanya depend pada isError — logout via ref tidak trigger re-run
	useEffect(() => {
		if (isError) {
			logoutRef.current();
		}
	}, [isError]);

	const login = useCallback(
		(newToken: string) => {
			setTokenValue(newToken);
			setToken(newToken);
			queryClient.invalidateQueries({ queryKey: getGetV1AuthMeQueryKey() });
		},
		[queryClient],
	);

	// Derive user from response
	const user: User | null = (() => {
		if (!userResponse?.data) return null;
		if ("data" in userResponse.data) {
			const u = userResponse.data.data as User;
			if (u && u.role) {
				localStorage.setItem("alizzah_role", u.role);
			}
			return u;
		}
		return null;
	})();

	return (
		<AuthContext.Provider
			value={{
				isAuthenticated: !!token && !!user && !isError,
				isLoading: !!token && isLoading,
				user,
				login,
				logout,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
