import { describe, expect, it } from 'vitest';
import { summarizeTargetGpus } from './runpodCatalog.js';

describe('runpod target gpu summary', () => {
  it('confirms 8x target GPUs when catalog contains H100/H200/B200', () => {
    const result = summarizeTargetGpus([
      { id: 'NVIDIA H100 80GB HBM3', displayName: 'H100 SXM', memoryInGb: 80, secureCloud: true, communityCloud: true, eightGpuSupported: true, totalEightGpuVramGb: 640, lowestPrice: { minimumBidPrice: 21.52, uninterruptablePrice: 21.52 } },
      { id: 'NVIDIA H200', displayName: 'H200 SXM', memoryInGb: 141, secureCloud: true, communityCloud: true, eightGpuSupported: true, totalEightGpuVramGb: 1128, lowestPrice: { minimumBidPrice: null, uninterruptablePrice: 28.72 } },
      { id: 'NVIDIA B200', displayName: 'B200', memoryInGb: 180, secureCloud: true, communityCloud: true, eightGpuSupported: true, totalEightGpuVramGb: 1440, lowestPrice: { minimumBidPrice: null, uninterruptablePrice: null } },
    ]);
    expect(result).toHaveLength(3);
    expect(result.every((gpu) => gpu.found)).toBe(true);
    expect(result.map((gpu) => gpu.totalEightGpuVramGb)).toEqual([640, 1128, 1440]);
  });
});
