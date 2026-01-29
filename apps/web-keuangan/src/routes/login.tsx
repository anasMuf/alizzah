import { createFileRoute } from '@tanstack/react-router';
import { LoginForm } from '~/modules/auth';

export const Route = createFileRoute('/login')({
    component: LoginPage,
});

function LoginPage() {
    return (
        <div className="flex min-h-[calc(100vh-80px)] bg-slate-50 items-center justify-center p-4">
            <LoginForm />
        </div>
    );
}
