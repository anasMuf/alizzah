import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { hasModule } from "#/features/auth/access";

export const Route = createFileRoute("/_authenticated/koperasi")({
	beforeLoad: () => {
		if (!hasModule("koperasi")) {
			throw redirect({ to: "/" });
		}
	},
	component: () => <Outlet />,
});
