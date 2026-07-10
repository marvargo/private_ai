import { ApiResourcePage } from '../../../components/ApiResourcePage';

export default function Page() {
  return <ApiResourcePage title="Approvals" description="Approval queue for production, destructive, cost-impacting, and gated actions." endpoint="/approvals" actions={[]} />;
}
