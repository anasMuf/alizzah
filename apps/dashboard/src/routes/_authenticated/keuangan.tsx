import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { hasModule } from "#/features/auth/access";

export const Route = createFileRoute("/_authenticated/keuangan")({
	beforeLoad: () => {
		if (!hasModule("keuangan")) {
			throw redirect({ to: "/" });
		}
	},
	component: () => <Outlet />,
});
