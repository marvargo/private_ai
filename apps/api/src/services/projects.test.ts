import { describe, expect, it } from 'vitest';
import { createProject, deleteProject, getProject, updateProject } from './projects.js';

// The test process explicitly enables the isolated development repository factory.
describe('project CRUD', () => {
  it('does not create an implicit project and manages an explicitly created project', async () => {
    const project = await createProject({ name: 'Personal planning', ownerId: 'owner-project-crud' });
    expect(project.name).toBe('Personal planning');
    expect((await getProject(project.id, 'owner-project-crud')).id).toBe(project.id);

    const archived = await updateProject({ projectId: project.id, ownerId: 'owner-project-crud', name: 'Updated planning', archived: true });
    expect(archived).toMatchObject({ name: 'Updated planning' });
    await expect(getProject(project.id, 'another-user')).rejects.toMatchObject({ code: 'PROJECT_ACCESS_DENIED', statusCode: 403 });

    await expect(deleteProject(project.id, 'owner-project-crud')).resolves.toMatchObject({ deleted: true });
    await expect(getProject(project.id, 'owner-project-crud')).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND', statusCode: 404 });
  });
});
