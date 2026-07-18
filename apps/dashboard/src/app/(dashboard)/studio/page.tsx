import { WorkspaceResourcePage } from '../../../components/WorkspaceResourcePage';

export default function StudioPage() {
  return <WorkspaceResourcePage title="Studio" endpoint="/studio/assets" createLabel="New visual or scene asset" defaultCategory="image" description="Create and manage project-based visual, image editing, scene, timeline, and video assets. Long-form movie work is composed from many project scenes rather than one generation call." featureGroups={["Text to Image", "Image Editing", "Product Photography", "Storyboards", "Scene Management", "Timeline", "Asset Library", "Generated Media History"]} />;
}
