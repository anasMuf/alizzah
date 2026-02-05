import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { BillingGeneratorForm } from '~/modules/keuangan/billing/components/BillingGeneratorForm';

export const Route = createFileRoute('/keuangan/billing/')({
    component: BillingGeneratorPage,
});

function BillingGeneratorPage() {
    const navigate = useNavigate();

    return (
        <BillingGeneratorForm
            onViewHistory={() => navigate({ to: '/keuangan/billing/history' })}
            onViewDetail={(periode) => navigate({ to: '/keuangan/billing/history/$periode', params: { periode } })}
        />
    );
}
