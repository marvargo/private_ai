import { WorkspaceResourcePage } from '../../../components/WorkspaceResourcePage';

export default function WorkflowsPage() {
  return <WorkspaceResourcePage title="Workflows" endpoint="/workflows" createLabel="New workflow" defaultCategory="automation" description="Design project automations using natural language or a visual builder with triggers, actions, conditions, loops, approvals, schedules, execution history, and retry policy metadata." featureGroups={["Visual Builder", "Natural Language Builder", "Triggers", "Actions", "Conditions", "Approvals", "Schedules", "Execution History"]} />;
}
