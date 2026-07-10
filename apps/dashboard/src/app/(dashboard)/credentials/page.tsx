import { ApiResourcePage } from '../../../components/ApiResourcePage';

export default function Page() {
  return <ApiResourcePage title="Credentials" description="Redacted backend-only credential inventory and status; secrets are never returned to the browser." endpoint="/credentials" actions={[]} />;
}
