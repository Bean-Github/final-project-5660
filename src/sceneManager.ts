/// <reference types="@webgpu/types" />

import { vec3 } from 'gl-matrix';
import Stats from 'stats.js';
import * as DAT from 'dat.gui';
import Camera from './Camera';
import { setDevice } from './rendering/gpuDeviceRef';
import ObjectManager, { setObjectManager } from './ObjectManager';
import { setCamera } from './rendering/cameraRef';
import { setScene } from './scenes/Scene';
import SampleScene from './scenes/SampleScene';
import { initMouseInput, endInputFrame } from './utils/mouse'

import { getTime } from './utils/time';
import { initPipelineConfig } from './rendering/pipelineConfig';

export async function startScene(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
): Promise<() => void> {
  if (!navigator.gpu) throw new Error('WebGPU is unavailable');

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No GPU adapter available');

  const device = await adapter.requestDevice();

  // React may have removed the canvas while the request was in progress.
  if (signal.aborted) {
    device.destroy();
    return () => {};
  }

  setDevice(device);

  initMouseInput(canvas);

  const context = canvas.getContext('webgpu');
  if (!context) {
    device.destroy();
    throw new Error('Could not create a WebGPU canvas context');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  const sampleCount = 4;
  initPipelineConfig(format, sampleCount);
  
  const camera = new Camera(
    canvas,
    vec3.fromValues(0, 2, 8),
    vec3.fromValues(0, 0, 0),
  );

  setCamera(camera);

  const objectManager = new ObjectManager();
  await objectManager.setupObjectManager();
  setObjectManager(objectManager);

  const scene = new SampleScene(objectManager);
  setScene(scene);
  await scene.setupScene();

  const stats = new Stats();
  stats.showPanel(0);
  stats.dom.style.position = 'absolute';
  stats.dom.style.left = '0';
  stats.dom.style.top = '0';
  document.body.appendChild(stats.dom);

  async function restartScene() {
    scene.destroyScene();
    objectManager.destroyAll();
    await objectManager.setupObjectManager();
    await scene.setupScene();
  }

  const controls = {
    // tesselations: 5,
    'Load Scene': async () => await restartScene(),
  };
  const gui = new DAT.GUI();
  // gui.add(controls, 'tesselations', 0, 8)
  //   .step(1)
  //   .onFinishChange(rebuildSphere);
  gui.add(controls, 'Load Scene');

  let msaaTexture: GPUTexture | undefined;
  let depthTexture: GPUTexture | undefined;
  let frameId = 0;
  let previousTime: number | undefined;

  function resize() {
    const width = Math.max(1, Math.floor(canvas.clientWidth));
    const height = Math.max(1, Math.floor(canvas.clientHeight));

    canvas.width = width;
    canvas.height = height;

    msaaTexture?.destroy();
    msaaTexture = device.createTexture({
      size: [width, height],
      sampleCount,
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    depthTexture?.destroy();
    depthTexture = device.createTexture({
      size: [width, height],
      sampleCount,
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    camera.setAspectRatio(width / height);
    camera.updateProjectionMatrix();
  }

  function tick(currTime: number) {
    const dt = previousTime === undefined
    ? 0
    : Math.min((currTime - previousTime) / 1000, 0.05);

    previousTime = currTime;

    getTime().time = currTime / 1000;
    
    stats.begin();

    // UPDATE    
    camera.update(dt);
    objectManager.update(dt);
    scene.updateScene(dt);
    endInputFrame();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: msaaTexture!.createView(),
        resolveTarget: context!.getCurrentTexture().createView(),
        clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: depthTexture!.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    // DRAW
    objectManager.draw(pass);

    pass.end();

    device.queue.submit([encoder.finish()]);

    stats.end();
    frameId = requestAnimationFrame(tick); // this asks the browser to call tick() again when it's time to render a new frame
  }

  window.addEventListener('resize', resize);
  resize();
  tick(0);

  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', resize);
    gui.destroy();
    stats.dom.remove();
    msaaTexture?.destroy();
    scene.destroyScene();
    objectManager.destroyAll();

    depthTexture?.destroy();
    device.destroy();
  };
}


