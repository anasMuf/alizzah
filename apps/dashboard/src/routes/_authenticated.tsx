import { createFileRoute, redirect } from "@tanstack/react-router";
import { getToken, hasToken, useAuth } from "#/features/auth/AuthContext";
import { DashboardLayout } from "../components/layout/DashboardLayout";

const TOKEN_KEY = "alizzah_token";
const ROLE_KEY = "alizzah_role";
const MODULES_KEY = "alizzah_modules";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: () => {
		if (!hasToken()) {
			throw redirect({ to: "/login" });
		}

		// Local JWT expiry check — avoids flash of loading spinner
		// when token is expired. Server-side validation (blacklist, role)
		// is still performed by AuthContext's /auth/me call.
		const token = getToken();
		if (token) {
			try {
				const payload = JSON.parse(atob(token.split(".")[1]));
				if (payload.exp * 1000 < Date.now()) {
					localStorage.removeItem(TOKEN_KEY);
					localStorage.removeItem(ROLE_KEY);
					localStorage.removeItem(MODULES_KEY);
					throw redirect({ to: "/login" });
				}
			} catch {
				// Malformed token — redirect
				throw redirect({ to: "/login" });
			}
		}
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
					<p className="mt-3 text-sm text-gray-500">Loading...</p>
				</div>
			</div>
		);
	}

	return <DashboardLayout />;
}
