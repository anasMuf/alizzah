import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { parseSearch, stringifySearch } from "#/utils/search";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		stringifySearch,
		parseSearch,
		context: {
			auth: undefined!,
		},
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
