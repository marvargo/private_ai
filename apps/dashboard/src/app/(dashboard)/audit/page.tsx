import { ApiResourcePage } from '../../../components/ApiResourcePage';

export default function Page() {
  return <ApiResourcePage title="Audit" description="Audit logs for RunPod, GitHub, Supabase, model, task, credential, and approval actions." endpoint="/audit-logs" actions={[]} />;
}
