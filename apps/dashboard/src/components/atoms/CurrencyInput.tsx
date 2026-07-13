import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import type { InputHTMLAttributes } from "react";

// ---------------------------------------------------------------------------
// Format / Unformat
// ---------------------------------------------------------------------------

/**
 * Format a number as currency string (optionally without symbol).
 * - Zero → empty string
 * - 1500000 → "Rp 1.500.000" (with symbol) or "1.500.000" (without)
 */
function format(value: number, showSymbol = false): string {
	if (value === 0) return "";
	if (showSymbol) {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(value);
	}
	return new Intl.NumberFormat("id-ID", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

/**
 * Strip all non-numeric characters and return a number.
 * "Rp 1.500.000" → 1500000
 * "" → 0
 */
function unformat(raw: string): number {
	const digits = raw.replace(/\D/g, "");
	return digits === "" ? 0 : Number(digits);
}

// ---------------------------------------------------------------------------
// Cursor helpers
// ---------------------------------------------------------------------------

/**
 * Given a formatted display string and the desired number of *digits* before the
 * cursor, compute the new cursor position in the formatted string.
 */
function cursorAfterFormat(
	formatted: string,
	digitsBeforeCursor: number,
): number {
	let digitCount = 0;
	for (let i = 0; i < formatted.length; i++) {
		if (digitCount === digitsBeforeCursor) return i;
		if (/\d/.test(formatted[i])) digitCount++;
	}
	// Cursor at end
	return formatted.length;
}

/**
 * Count how many digit characters appear before `pos` in `formatted`.
 */
function digitsBefore(formatted: string, pos: number): number {
	let count = 0;
	for (let i = 0; i < pos && i < formatted.length; i++) {
		if (/\d/.test(formatted[i])) count++;
	}
	return count;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface CurrencyInputProps
	extends Omit<
		InputHTMLAttributes<HTMLInputElement>,
		"value" | "onChange" | "type"
	> {
	/** Current numeric value. 0 = empty input. */
	value: number;
	/** Called with the new numeric value whenever the user edits. */
	onChange: (value: number) => void;
	/** Show the "Rp" prefix — useful for standalone fields. */
	showSymbol?: boolean;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
	({ value, onChange, showSymbol = false, className = "", disabled, onFocus, onBlur, ...rest }, ref) => {
		const innerRef = useRef<HTMLInputElement>(null);

		// Expose the internal ref to parent via forwarded ref
		useImperativeHandle(ref, () => innerRef.current!);

		// Local display state
		const [display, setDisplay] = useState(() => format(value, showSymbol));
		const [focused, setFocused] = useState(false);

		// Keep display in sync when external value changes and user isn't editing
		useEffect(() => {
			if (!focused) {
				setDisplay(format(value, showSymbol));
			}
		}, [value, focused, showSymbol]);

		// ------------------------------------------------------------------
		// Handlers
		// ------------------------------------------------------------------

		const handleChange = useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				const input = e.target;
				const raw = input.value;

				// Only allow digits — strip everything else
				const digits = raw.replace(/\D/g, "");
				const num = digits === "" ? 0 : Number(digits);

				// Format
				const formatted = num === 0 ? "" : format(num, showSymbol);

				// Calculate where cursor should land
				const prevDigitsBeforeCursor = digitsBefore(raw, input.selectionStart ?? 0);
				const newCursor = cursorAfterFormat(formatted, prevDigitsBeforeCursor);

				// Apply
				setDisplay(formatted);
				onChange(num);

				// Restore cursor after React re-render
				requestAnimationFrame(() => {
					if (innerRef.current) {
						innerRef.current.setSelectionRange(newCursor, newCursor);
					}
				});
			},
			[onChange],
		);

		const handleFocus = useCallback(
			(e: React.FocusEvent<HTMLInputElement>) => {
				setFocused(true);
				// Place cursor at end of digits on focus
				requestAnimationFrame(() => {
					if (innerRef.current) {
						const len = innerRef.current.value.length;
						innerRef.current.setSelectionRange(len, len);
					}
				});
				onFocus?.(e);
			},
			[onFocus],
		);

		const handleBlur = useCallback(
			(e: React.FocusEvent<HTMLInputElement>) => {
				setFocused(false);
				// Re-format on blur (handles edge case where display drifted)
				setDisplay(format(value, showSymbol));
				onBlur?.(e);
			},
			[value, onBlur, showSymbol],
		);

		// Prevent non-digit keystrokes at the event level for robustness
		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent<HTMLInputElement>) => {
				const allowed = [
					"Backspace",
					"Delete",
					"ArrowLeft",
					"ArrowRight",
					"ArrowUp",
					"ArrowDown",
					"Home",
					"End",
					"Tab",
					"Enter",
					"Escape",
				];
				// Allow Ctrl/Cmd + A, C, V, X, Z
				if (e.ctrlKey || e.metaKey) return;
				// Allow digits
				if (/^[0-9]$/.test(e.key)) return;
				// Allow navigation keys
				if (allowed.includes(e.key)) return;
				e.preventDefault();
			},
			[],
		);

		// Handle paste — strip formatting
		const handlePaste = useCallback(
			(e: React.ClipboardEvent<HTMLInputElement>) => {
				e.preventDefault();
				const pasted = e.clipboardData.getData("text/plain");
				const num = unformat(pasted);
					const formatted = num === 0 ? "" : format(num, showSymbol);
					setDisplay(formatted);
					onChange(num);
					requestAnimationFrame(() => {
						if (innerRef.current) {
							const len = innerRef.current.value.length;
							innerRef.current.setSelectionRange(len, len);
						}
					});
				},
				[onChange, showSymbol],
		);

		// ------------------------------------------------------------------
		// Render
		// ------------------------------------------------------------------

		return (
			<input
				ref={innerRef}
				type="text"
				inputMode="numeric"
				autoComplete="off"
				className={`
          block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900
          outline-1 -outline-offset-1 outline-gray-300
          placeholder:text-gray-400
          focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600
          sm:text-sm/6
          disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
          ${className}
        `}
				value={display}
				onChange={handleChange}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				onPaste={handlePaste}
				disabled={disabled}
				{...rest}
			/>
		);
	},
);

CurrencyInput.displayName = "CurrencyInput";
