import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { hasModule } from "#/features/auth/access";

export const Route = createFileRoute("/_authenticated/sdm")({
	beforeLoad: () => {
		if (!hasModule("sdm")) {
			throw redirect({ to: "/" });
		}
	},
	component: () => <Outlet />,
});
