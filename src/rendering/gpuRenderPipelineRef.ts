let activePipeline: GPURenderPipeline | null = null;

export function setPipeline(pipeline: GPURenderPipeline): void {
    if (activePipeline && activePipeline !== pipeline) {
        throw new Error('A WebGPU pipeline is already active');
    }
    activePipeline = pipeline;
}

export function getPipeline(): GPURenderPipeline {
    if (!activePipeline) {
        throw new Error('WebGPU pipeline has not been initialized');
    }
    return activePipeline;
}

export function clearPipeline(pipeline: GPURenderPipeline): void {
    if (activePipeline === pipeline) activePipeline = null;
}
