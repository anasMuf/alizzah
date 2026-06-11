import { useAuth } from "@alizzah/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoginForm } from "../features/auth/components/LoginForm";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
	const { isAuthenticated } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (isAuthenticated) {
			navigate({ to: "/" });
		}
	}, [isAuthenticated, navigate]);

	return (
		<div className="flex min-h-screen flex-col justify-center bg-gray-50 px-6 py-12 lg:px-8">
			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<h2 className="text-center text-2xl/9 font-bold tracking-tight text-gray-900">
					Sign in to your account
				</h2>
			</div>

			<div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
				<LoginForm onSuccess={() => navigate({ to: "/" })} />
			</div>
		</div>
	);
}
