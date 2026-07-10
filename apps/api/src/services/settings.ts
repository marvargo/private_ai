import { env } from '../utils/env.js';

export interface OperatorSettings {
  privacy: {
    externalModelProvidersAllowed: boolean;
  };
  runpod: {
    defaultRegion: string;
    defaultGpuType: string;
    defaultGpuCount: number;
    defaultVolumeGb: number;
    defaultSessionHours: number;
    maxSessionHours: number;
    autoStopEnabled: boolean;
  };
  budget: {
    maxDailyGpuBudgetUsd?: number;
  };
  approvals: {
    deletePodRequired: boolean;
    productionActionRequired: boolean;
    destructiveActionRequired: boolean;
    externalSharingRequired: boolean;
  };
}

const settings: OperatorSettings = {
  privacy: {
    externalModelProvidersAllowed: env.ALLOW_EXTERNAL_MODEL_PROVIDERS === 'true',
  },
  runpod: {
    defaultRegion: env.RUNPOD_DEFAULT_REGION,
    defaultGpuType: env.RUNPOD_DEFAULT_GPU_TYPE,
    defaultGpuCount: env.RUNPOD_DEFAULT_GPU_COUNT,
    defaultVolumeGb: env.RUNPOD_DEFAULT_VOLUME_GB,
    defaultSessionHours: env.DEFAULT_SESSION_HOURS,
    maxSessionHours: env.MAX_SESSION_HOURS,
    autoStopEnabled: env.AUTO_STOP_ENABLED === 'true',
  },
  budget: {
    maxDailyGpuBudgetUsd: env.MAX_DAILY_GPU_BUDGET_USD,
  },
  approvals: {
    deletePodRequired: true,
    productionActionRequired: true,
    destructiveActionRequired: true,
    externalSharingRequired: true,
  },
};

export function getSettings() {
  return structuredClone(settings);
}

export type SettingsPatch = {
  privacy?: Partial<OperatorSettings['privacy']>;
  runpod?: Partial<OperatorSettings['runpod']>;
  budget?: Partial<OperatorSettings['budget']>;
  approvals?: Partial<OperatorSettings['approvals']>;
};

export function patchSettings(patch: SettingsPatch) {
  if (patch.privacy) settings.privacy = { ...settings.privacy, ...patch.privacy };
  if (patch.runpod) settings.runpod = { ...settings.runpod, ...patch.runpod };
  if (patch.budget) settings.budget = { ...settings.budget, ...patch.budget };
  if (patch.approvals) settings.approvals = { ...settings.approvals, ...patch.approvals };
  return getSettings();
}

export function resetSettingsForTests() {
  settings.privacy.externalModelProvidersAllowed = env.ALLOW_EXTERNAL_MODEL_PROVIDERS === 'true';
  settings.runpod.defaultRegion = env.RUNPOD_DEFAULT_REGION;
  settings.runpod.defaultGpuType = env.RUNPOD_DEFAULT_GPU_TYPE;
  settings.runpod.defaultGpuCount = env.RUNPOD_DEFAULT_GPU_COUNT;
  settings.runpod.defaultVolumeGb = env.RUNPOD_DEFAULT_VOLUME_GB;
  settings.runpod.defaultSessionHours = env.DEFAULT_SESSION_HOURS;
  settings.runpod.maxSessionHours = env.MAX_SESSION_HOURS;
  settings.runpod.autoStopEnabled = env.AUTO_STOP_ENABLED === 'true';
  settings.budget.maxDailyGpuBudgetUsd = env.MAX_DAILY_GPU_BUDGET_USD;
  settings.approvals.deletePodRequired = true;
  settings.approvals.productionActionRequired = true;
  settings.approvals.destructiveActionRequired = true;
  settings.approvals.externalSharingRequired = true;
}
