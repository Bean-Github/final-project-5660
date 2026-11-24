/// <reference types="@webgpu/types" />

import { mat4, vec3 } from 'gl-matrix';
import Stats from 'stats.js';
import * as DAT from 'dat.gui';
import Camera from './Camera';
import Icosphere from './geometry/Icosphere';
import shaderSource from './shaders/lambert.wgsl?raw';
import { setDevice } from './rendering/gpuDevice';
import ObjectManager from './ObjectManager';
import BallGO from './gameobjects/BallGO'

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

  const context = canvas.getContext('webgpu');
  if (!context) {
    device.destroy();
    throw new Error('Could not create a WebGPU canvas context');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  const shader = device.createShaderModule({ code: shaderSource });

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: shader,
      entryPoint: 'vertexMain',
      buffers: [
        {
          arrayStride: 16,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x4' },
          ],
        },
        {
          arrayStride: 16,
          attributes: [
            { shaderLocation: 1, offset: 0, format: 'float32x4' },
          ],
        },
      ],
    },
    fragment: {
      module: shader,
      entryPoint: 'fragmentMain',
      targets: [{ format }],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'none',
    },
    depthStencil: {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less',
    },
  });

  // 16 floats for model + 16 for viewProj + 4 for color.
  const uniformBuffer = device.createBuffer({
    size: 36 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
    ],
  });

  const camera = new Camera(
    canvas,
    vec3.fromValues(0, 0, 5),
    vec3.fromValues(0, 0, 0),
    );

  const controls = {
    // tesselations: 5,
    // 'Load Scene': () => rebuildSphere(),
  };

  // let sphere = new Icosphere(
  //   vec3.fromValues(0, 0, 0),
  //   1,
  //   5,
  // );
  //sphere.create();

  // function rebuildSphere() {
  //   sphere.destroy();
  //   sphere = new Icosphere(
  //     vec3.fromValues(0, 0, 0),
  //     1,
  //     controls.tesselations,
  //   );
  //   sphere.create(device);
  // }

  const objectManager = new ObjectManager();
  objectManager.add(new BallGO(vec3.fromValues(0, 0, 0)));

  const stats = new Stats();
  stats.showPanel(0);
  stats.dom.style.position = 'absolute';
  stats.dom.style.left = '0';
  stats.dom.style.top = '0';
  document.body.appendChild(stats.dom);

  const gui = new DAT.GUI();
  // gui.add(controls, 'tesselations', 0, 8)
  //   .step(1)
  //   .onFinishChange(rebuildSphere);
  //gui.add(controls, 'Load Scene');

  let depthTexture: GPUTexture | undefined;
  let frameId = 0;

  function resize() {
    const width = Math.max(1, Math.floor(canvas.clientWidth));
    const height = Math.max(1, Math.floor(canvas.clientHeight));

    canvas.width = width;
    canvas.height = height;

    depthTexture?.destroy();
    depthTexture = device.createTexture({
      size: [width, height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    camera.setAspectRatio(width / height);
    camera.updateProjectionMatrix();
  }

  function tick() {
    camera.update();
    stats.begin();

    const model = mat4.create();
    const viewProj = mat4.create();
    mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);

    const uniforms = new Float32Array(36);
    uniforms.set(model, 0);
    uniforms.set(viewProj, 16);
    uniforms.set([1, 0, 0, 1], 32); // Red sphere
    device.queue.writeBuffer(uniformBuffer, 0, uniforms);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context!.getCurrentTexture().createView(),
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

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    //sphere.draw(pass);

    objectManager.draw(pass);

    pass.end();

    device.queue.submit([encoder.finish()]);

    stats.end();
    frameId = requestAnimationFrame(tick); // this asks the browser to call tick() again when it's time to render a new frame
  }

  window.addEventListener('resize', resize);
  resize();
  tick();

  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', resize);
    gui.destroy();
    stats.dom.remove();
    
    objectManager.destroyAll();

    //sphere.destroy();
    depthTexture?.destroy();
    uniformBuffer.destroy();
    device.destroy();
  };
}