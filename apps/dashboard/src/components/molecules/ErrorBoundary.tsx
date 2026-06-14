import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ReactNode } from "react";
import { Button } from "../atoms/Button";

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught:", error, errorInfo);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback;

			return (
				<div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
					<div className="text-center max-w-md">
						<AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
						<h2 className="mt-4 text-lg font-semibold text-gray-900">
							Terjadi kesalahan
						</h2>
						<p className="mt-2 text-sm text-gray-500">
							{this.state.error?.message || "Kesalahan tidak diketahui"}
						</p>
						<div className="mt-6 flex justify-center gap-3">
							<Button
								variant="secondary"
								onClick={() => window.location.reload()}
							>
								<RefreshCw className="mr-1.5 h-4 w-4" />
								Muat ulang halaman
							</Button>
							<Button variant="primary" onClick={this.handleReset}>
								Coba lagi
							</Button>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
