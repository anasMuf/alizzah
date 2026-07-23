import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { hasModule } from "#/features/auth/access";

export const Route = createFileRoute("/_authenticated/administrasi")({
	beforeLoad: () => {
		if (!hasModule("administrasi")) {
			throw redirect({ to: "/" });
		}
	},
	component: () => <Outlet />,
});
