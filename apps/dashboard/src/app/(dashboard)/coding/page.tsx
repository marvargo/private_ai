import { WorkspaceResourcePage } from '../../../components/WorkspaceResourcePage';

export default function CodingPage() {
  return <WorkspaceResourcePage title="Coding" endpoint="/coding/projects" createLabel="New software workspace" defaultCategory="software" description="Build software projects with files, editor planning, preview, build, deploy, source control, terminal output, environment variables, and project history. The platform chooses the private execution path automatically." featureGroups={["Projects", "File Tree", "Editor", "Preview", "Build", "Deploy", "Source Control", "Project History"]} />;
}
