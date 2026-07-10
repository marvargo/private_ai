import { ApiResourcePage } from '../../../components/ApiResourcePage';

export default function Page() {
  return <ApiResourcePage title="Settings" description="Model defaults, RunPod defaults, budget limits, approval rules, and private-provider controls." endpoint="/settings" actions={[]} />;
}
