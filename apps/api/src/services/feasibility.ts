import { FeasibilityInput, FeasibilityResult, REQUIRED_405B_GPU_COUNT, REQUIRED_405B_MIN_VRAM_GB } from '@wyndme/shared';
export function checkLlama405BFeasibility(input: FeasibilityInput): FeasibilityResult {
  const missing: string[] = []; const warnings: string[] = [];
  if (input.gpuCount < REQUIRED_405B_GPU_COUNT) missing.push(`Need at least ${REQUIRED_405B_GPU_COUNT} GPUs; found ${input.gpuCount}.`);
  if (!/(H100|H200|B200|A100)/i.test(input.gpuModel)) warnings.push(`GPU model ${input.gpuModel} is not an expected production 405B class GPU.`);
  if (input.totalVramGb < REQUIRED_405B_MIN_VRAM_GB) missing.push(`Need at least ${REQUIRED_405B_MIN_VRAM_GB}GB total VRAM; found ${input.totalVramGb}GB.`);
  if (input.diskGb < 2000) missing.push(`Need at least 2000GB disk/model cache; found ${input.diskGb}GB.`);
  if (!input.cudaAvailable) missing.push('CUDA is not available.');
  if (!input.dockerAvailable) missing.push('Docker is not available.');
  if (!input.hfTokenPresent && !input.modelPathAvailable) missing.push('Hugging Face access token or pre-mounted model path is required.');
  if (input.servingEngine !== 'vllm' && input.servingEngine !== 'sglang') warnings.push('vLLM is the primary supported engine; SGLang is fallback.');
  return { ok: missing.length === 0, missing, warnings, recommendedTestMode: missing.length ? '70b' : undefined };
}
