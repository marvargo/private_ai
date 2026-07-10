import { ApiResourcePage } from '../../../components/ApiResourcePage';

export default function Page() {
  return <ApiResourcePage title="RunPod" description="Backend-only pod lifecycle controls, budget checks, approvals, and emergency stop." endpoint="/runpod/pods" actions={[{ label: 'Emergency stop', method: 'POST', endpoint: '/runpod/emergency-stop' }]} />;
}
