import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
	type postV1AuthLoginResponse,
	usePostV1AuthLogin,
} from "../../../api/endpoints/auth/auth";
import { ApiError } from "../../../api/mutator/custom-instance";
import { Button } from "../../../components/atoms/Button";
import { FormField } from "../../../components/molecules/FormField";
import { useToast } from "../../../components/molecules/Toast";
import { type LoginFormData, loginSchema } from "../../../utils/validation";
import { useAuth } from "../AuthContext";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
	const { login } = useAuth();
	const { addToast } = useToast();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
	});

	const loginMutation = usePostV1AuthLogin({
		mutation: {
			onSuccess: (response: postV1AuthLoginResponse) => {
				if (response.status === 200 && response.data.data?.token) {
					login(response.data.data?.token);
					addToast({
						variant: "success",
						title: "Welcome back!",
						message: "You have signed in successfully.",
					});
					onSuccess();
				}
			},
			onError: (error: Error) => {
				const message =
					error instanceof ApiError
						? error.message
						: "An unexpected error occurred. Please try again.";
				addToast({ variant: "error", title: "Sign in failed", message });
			},
		},
	});

	const onSubmit = (data: LoginFormData) => {
		loginMutation.mutate({ data });
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<FormField
				id="email"
				type="email"
				label="Email address"
				error={errors.email?.message}
				{...register("email")}
			/>

			<FormField
				id="password"
				type="password"
				label="Password"
				error={errors.password?.message}
				{...register("password")}
			/>

			<Button
				type="submit"
				className="w-full"
				disabled={loginMutation.isPending}
			>
				{loginMutation.isPending ? "Signing in..." : "Sign in"}
			</Button>
		</form>
	);
}
