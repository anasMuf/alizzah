import { forwardRef } from "react";
import { CurrencyInput, type CurrencyInputProps } from "../atoms/CurrencyInput";
import { Label } from "../atoms/Label";

interface CurrencyFormFieldProps extends CurrencyInputProps {
	label: string;
	error?: string;
	/** HTML id — auto-generated if omitted. Also used for label htmlFor. */
	id: string;
}

/**
 * CurrencyInput + Label + error message.
 * Drop-in replacement for FormField when a currency value is needed.
 */
export const CurrencyFormField = forwardRef<
	HTMLInputElement,
	CurrencyFormFieldProps
>(({ label, id, error, ...currencyProps }, ref) => {
	return (
		<div>
			<Label htmlFor={id}>{label}</Label>
			<div className="mt-2">
				<CurrencyInput
					id={id}
					ref={ref}
					{...currencyProps}
					className={error ? "ring-1 ring-red-500" : ""}
				/>
			</div>
			{error && <p className="mt-1 text-sm text-red-600">{error}</p>}
		</div>
	);
});

CurrencyFormField.displayName = "CurrencyFormField";
