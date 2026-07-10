import { ApiResourcePage } from '../../../components/ApiResourcePage';

export default function Page() {
  return <ApiResourcePage title="Models" description="Runtime health for Llama 405B, Qwen Coder, and test runtimes." endpoint="/model/status" actions={[{ label: 'Run health check', method: 'POST', endpoint: '/model/status/check' }]} />;
}
