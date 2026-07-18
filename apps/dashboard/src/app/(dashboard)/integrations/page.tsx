import { WorkspaceResourcePage } from '../../../components/WorkspaceResourcePage';

export default function IntegrationsPage() {
  return <WorkspaceResourcePage title="Integrations" endpoint="/integrations" createLabel="New integration" defaultCategory="native" description="Connect project tools such as MCP servers, native integrations, OAuth apps, API-key connections, webhooks, databases, payments, storage, email, calendar, CRM, and future integrations." featureGroups={["MCP Servers", "Native Integrations", "OAuth", "API Keys", "Webhooks", "Databases", "Payments", "Storage"]} />;
}
