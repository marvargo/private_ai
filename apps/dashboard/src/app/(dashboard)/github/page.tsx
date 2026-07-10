import { ApiResourcePage } from '../../../components/ApiResourcePage';

export default function Page() {
  return <ApiResourcePage title="GitHub" description="Connected repositories, branch/PR workflows, and audit-safe repository operations." endpoint="/github/repos" actions={[]} />;
}
