import { ApiResourcePage } from '../../../components/ApiResourcePage';

export default function Page() {
  return <ApiResourcePage title="Tasks" description="Create, inspect, run, retry, cancel, and audit AI task execution." endpoint="/tasks" actions={[]} />;
}
