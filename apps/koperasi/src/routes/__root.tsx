import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

// Konteks router. `auth` diisi dari useAuth() di main.tsx.
// Diketik longgar untuk scaffold; dipersempit saat route guard ditambahkan.
export interface RouterContext {
	auth: unknown;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: () => <Outlet />,
});
