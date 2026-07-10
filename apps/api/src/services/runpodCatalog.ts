export interface RunPodGpuCatalogItem {
  id: string;
  displayName: string;
  memoryInGb: number;
  secureCloud: boolean;
  communityCloud: boolean;
  lowestPrice?: { minimumBidPrice: number | null; uninterruptablePrice: number | null };
  eightGpuSupported: boolean;
  totalEightGpuVramGb: number;
}

const TARGET_GPU_IDS = ['NVIDIA H100 80GB HBM3', 'NVIDIA H200', 'NVIDIA B200'] as const;

export function summarizeTargetGpus(items: RunPodGpuCatalogItem[]) {
  return TARGET_GPU_IDS.map((id) => {
    const item = items.find((gpu) => gpu.id === id);
    return {
      id,
      found: Boolean(item),
      displayName: item?.displayName,
      memoryInGb: item?.memoryInGb,
      totalEightGpuVramGb: item ? item.memoryInGb * 8 : undefined,
      secureCloud: item?.secureCloud ?? false,
      communityCloud: item?.communityCloud ?? false,
      eightGpuPrice: item?.lowestPrice,
      currentlyPricedForEightGpu: Boolean(item?.lowestPrice?.minimumBidPrice || item?.lowestPrice?.uninterruptablePrice),
    };
  });
}
