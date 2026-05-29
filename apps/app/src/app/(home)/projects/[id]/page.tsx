import ProjectView from "@/components/project/project-view";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectView projectId={id} />;
}
