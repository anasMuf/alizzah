import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { TabunganDetail } from '../../../modules/keuangan/tabungan/components/TabunganDetail';

export const Route = createFileRoute('/keuangan/tabungan/$tabunganId')({
    component: TabunganDetailPage,
});

function TabunganDetailPage() {
    const { tabunganId } = Route.useParams();
    const navigate = useNavigate();

    return (
        <div className="animate-in slide-in-from-right-4 duration-500">
            <TabunganDetail
                tabunganId={tabunganId}
                onClose={() => navigate({ to: '/keuangan/tabungan' })}
            />
        </div>
    );
}
