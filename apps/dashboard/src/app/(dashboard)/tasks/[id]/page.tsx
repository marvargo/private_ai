import { ApiResourcePage } from '../../../../components/ApiResourcePage';

export default async function TaskDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApiResourcePage title="Task detail" description="Task logs and execution controls." endpoint={`/tasks/${id}/logs`} actions={[{ label: 'Run task', method: 'POST', endpoint: `/tasks/${id}/run` }, { label: 'Retry task', method: 'POST', endpoint: `/tasks/${id}/retry` }, { label: 'Cancel task', method: 'POST', endpoint: `/tasks/${id}/cancel` }]} />;
}
