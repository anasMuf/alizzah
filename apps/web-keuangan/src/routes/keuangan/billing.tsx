
import { createFileRoute } from '@tanstack/react-router';
import { BillingGenerator } from '~/modules/keuangan/billing/components/BillingGenerator';
import { Toaster } from 'sonner';

export const Route = createFileRoute('/keuangan/billing')({
    component: BillingPage,
});

function BillingPage() {
    return (
        <div className="space-y-6">
            <Toaster position="top-right" richColors />
            <BillingGenerator />
        </div>
    );
}
