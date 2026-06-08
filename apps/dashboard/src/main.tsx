if (import.meta.env.DEV) {
	import("react-grab");
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "./components/molecules/ErrorBoundary";
import { ToastProvider } from "./components/molecules/Toast";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 2,
			retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
			staleTime: 30 * 1000,
		},
		mutations: {
			retry: 1,
		},
	},
});

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	context: {
		auth: undefined!,
	},
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error('No root element found with id "app"');
}

function InnerApp() {
	const auth = useAuth();
	return <RouterProvider router={router} context={{ auth }} />;
}

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<QueryClientProvider client={queryClient}>
			<ToastProvider>
				<AuthProvider>
					<ErrorBoundary>
						<InnerApp />
					</ErrorBoundary>
				</AuthProvider>
			</ToastProvider>
		</QueryClientProvider>,
	);
}
