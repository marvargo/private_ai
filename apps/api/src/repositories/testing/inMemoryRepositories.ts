import type { ApprovalRecord } from '../../services/approvals.js';
import type { Conversation, ConversationMessage } from '@wyndme/shared';
import type { Project } from '../../services/projects.js';
import type { ProjectActivityEvent, ProjectInitiative, ProjectInvitation, ProjectMember } from '../../services/projectDashboard.js';
import type { WorkspaceRecord } from '../../services/workspaces.js';

export const inMemoryStores = {
  projects: new Map<string, Project>(),
  conversations: new Map<string, Conversation>(),
  messages: new Map<string, ConversationMessage[]>(),
  projectMembers: new Map<string, ProjectMember>(),
  projectInvitations: new Map<string, ProjectInvitation>(),
  projectActivities: new Map<string, ProjectActivityEvent>(),
  projectInitiatives: new Map<string, ProjectInitiative>(),
  projectFavorites: new Set<string>(),
  workspaceRecords: new Map<string, WorkspaceRecord>(),
  approvals: new Map<string, ApprovalRecord>(),
};
