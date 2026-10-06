import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { usePostV1AuthLogout } from "#/api/endpoints/auth/auth";
import { Button, ConfirmDialog } from "#/components/ui";
import { useAuth } from "#/features/auth/AuthContext";

interface TopbarProps {
	onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
	const { user, logout } = useAuth();
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);
	const logoutMutation = usePostV1AuthLogout();
	const navigate = useNavigate();

	const handleLogout = () => {
		logoutMutation.mutate(undefined, {
			onSettled: () => {
				logout();
				navigate({ to: "/login" });
			},
		});
	};

	// Simple breadcrumb logic from router state
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;
	const breadcrumbs = currentPath
		.split("/")
		.filter(Boolean)
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, " "));

	return (
		<header className="bg-white border-b border-gray-200">
			<div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
				<div className="flex min-w-0 items-center">
					<button
						type="button"
						className="text-gray-500 hover:text-gray-700 focus:outline-none lg:hidden mr-4"
						onClick={onMenuClick}
					>
						<span className="sr-only">Open sidebar</span>
						<Menu className="h-6 w-6" aria-hidden="true" />
					</button>

					<div className="flex min-w-0 items-center text-sm text-gray-500">
						{breadcrumbs.length > 0 ? (
							breadcrumbs.map((crumb, idx) => {
								const isLast = idx === breadcrumbs.length - 1;
								return (
									<span
										key={crumb}
										className={`min-w-0 items-center ${isLast ? "flex" : "hidden sm:flex"}`}
									>
										{idx > 0 && (
											<span className="mx-2 text-gray-300">{">"}</span>
										)}
										<span
											className={
												isLast
													? "truncate font-medium text-gray-900"
													: "truncate"
											}
										>
											{crumb}
										</span>
									</span>
								);
							})
						) : (
							<span className="font-medium text-gray-900">Dashboard</span>
						)}
					</div>
				</div>

				<div className="flex items-center gap-3 sm:gap-4">
					<div className="hidden max-w-[12rem] text-right text-sm sm:block">
						<p className="truncate font-medium text-gray-900">
							{user?.full_name || "User"}
						</p>
						<p className="truncate text-xs text-gray-500 uppercase">
							{user?.role || "Role"}
						</p>
					</div>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={() => setShowLogoutDialog(true)}
						className="shrink-0"
					>
						Logout
					</Button>
				</div>
			</div>

			<ConfirmDialog
				open={showLogoutDialog}
				title="Keluar"
				description="Apakah Anda yakin ingin keluar dari aplikasi?"
				confirmLabel="Ya, Keluar"
				cancelLabel="Batal"
				variant="danger"
				onConfirm={handleLogout}
				onCancel={() => setShowLogoutDialog(false)}
			/>
		</header>
	);
}
