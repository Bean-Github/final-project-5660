let activeDevice: GPUDevice | null = null;

export function setDevice(device: GPUDevice): void {
  if (activeDevice && activeDevice !== device) {
    throw new Error('A WebGPU device is already active');
  }
  activeDevice = device;
}

export function getDevice(): GPUDevice {
  if (!activeDevice) {
    throw new Error('WebGPU device has not been initialized');
  }
  return activeDevice;
}

export function clearDevice(device: GPUDevice): void {
  if (activeDevice === device) activeDevice = null;
}
