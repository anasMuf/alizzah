import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
	type postV1UsersResponse,
	usePostV1Users,
} from "#/api/endpoints/users/users";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, FormField, useToast } from "#/components/ui";
import {
	type RegisterFormData,
	registerSchema,
} from "../../../utils/validation";

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
	const { addToast } = useToast();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterFormData>({
		resolver: zodResolver(registerSchema),
	});

	const registerMutation = usePostV1Users({
		mutation: {
			onSuccess: (response: postV1UsersResponse) => {
				if (response.status === 201) {
					addToast({
						variant: "success",
						title: "Account created!",
						message: "Please sign in with your new account.",
					});
					onSuccess();
				} else if (response.status === 400 && "message" in response.data) {
					addToast({
						variant: "error",
						title: "Registration failed",
						message: response.data.message || "Please check your input.",
					});
				}
			},
			onError: (error: Error) => {
				const message =
					error instanceof ApiError
						? error.message
						: "An unexpected error occurred. Please try again.";
				addToast({ variant: "error", title: "Registration failed", message });
			},
		},
	});

	const onSubmit = (data: RegisterFormData) => {
		// role="parent" not in DtoCreateUserRequestRole enum but accepted by API for registration
		registerMutation.mutate({
			data: { ...data, role: "parent" } as any,
		});
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
				<FormField
					id="full_name"
					type="text"
					label="Full Name"
					error={errors.full_name?.message}
					{...register("full_name")}
				/>
				<FormField
					id="username"
					type="text"
					label="Username"
					error={errors.username?.message}
					{...register("username")}
				/>
			</div>

			<FormField
				id="email"
				type="email"
				label="Email address"
				error={errors.email?.message}
				{...register("email")}
			/>

			<div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
				<FormField
					id="phone"
					type="tel"
					label="Phone"
					error={errors.phone?.message}
					{...register("phone")}
				/>
				<FormField
					id="address"
					type="text"
					label="Address"
					error={errors.address?.message}
					{...register("address")}
				/>
			</div>

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
				disabled={registerMutation.isPending}
			>
				{registerMutation.isPending ? "Creating account..." : "Create account"}
			</Button>
		</form>
	);
}
