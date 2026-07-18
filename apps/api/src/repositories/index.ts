import { AppError } from '../errors/AppError.js';
import { allowInMemoryFallback, isProductionRuntime } from '../utils/runtimeEnvironment.js';
import { getSupabaseAdminClient } from './supabaseClient.js';
import { ProjectRepository } from './projectRepository.js';
import { ProjectMemberRepository } from './projectMemberRepository.js';
import { ProjectInvitationRepository } from './projectInvitationRepository.js';
import { ProjectActivityRepository } from './projectActivityRepository.js';
import { ProjectInitiativeRepository } from './projectInitiativeRepository.js';
import { ProjectTaskRepository } from './projectTaskRepository.js';
import { ProjectApprovalRepository } from './projectApprovalRepository.js';
import { ConversationRepository } from './conversationRepository.js';
import { WorkspaceRepository } from './workspaceRepository.js';
import { RuntimePoolRepository } from './runtimePoolRepository.js';
import { RuntimeRepository } from './runtimeRepository.js';
import { RuntimePolicyRepository } from './runtimePolicyRepository.js';
import { ScalingRuleRepository } from './scalingRuleRepository.js';
import { CostRepository } from './costRepository.js';
import { inMemoryStores } from './testing/inMemoryRepositories.js';

export function getDevelopmentInMemoryStores() {
  if (isProductionRuntime() || !allowInMemoryFallback()) {
    throw new AppError({
      message: 'Persistent Supabase storage is required for this operation',
      code: 'PERSISTENCE_REQUIRED',
      statusCode: 503,
      safeDetails: { allowInMemoryFallback: allowInMemoryFallback(), production: isProductionRuntime() },
    });
  }
  return inMemoryStores;
}

export function createRepositories(client = getSupabaseAdminClient()) {
  return {
    projects: new ProjectRepository(client),
    projectMembers: new ProjectMemberRepository(client),
    projectInvitations: new ProjectInvitationRepository(client),
    projectActivities: new ProjectActivityRepository(client),
    projectInitiatives: new ProjectInitiativeRepository(client),
    projectTasks: new ProjectTaskRepository(client),
    projectApprovals: new ProjectApprovalRepository(client),
    conversations: new ConversationRepository(client),
    workspaces: new WorkspaceRepository(client),
    runtimePools: new RuntimePoolRepository(client),
    runtimes: new RuntimeRepository(client),
    runtimePolicies: new RuntimePolicyRepository(client),
    scalingRules: new ScalingRuleRepository(client),
    costs: new CostRepository(client),
  };
}
