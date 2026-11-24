import { useEffect, useRef, useState } from "react";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Starting WebGPU…");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        if (!navigator.gpu) {
          throw new Error("WebGPU isn't available in this browser.");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error("Couldn't get a GPU adapter.");

        const device = await adapter.requestDevice();
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = 800;
        canvas.height = 500;

        const context = canvas.getContext("webgpu");
        if (!context) throw new Error("Couldn't create a WebGPU canvas.");

        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format });

        const shader = device.createShaderModule({
          code: `
            @vertex
            fn vertexMain(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
              var points = array<vec2f, 3>(
                vec2f( 0.0,  0.6),
                vec2f(-0.6, -0.6),
                vec2f( 0.6, -0.6)
              );
              return vec4f(points[i], 0.0, 1.0);
            }

            @fragment
            fn fragmentMain() -> @location(0) vec4f {
              return vec4f(0.2, 0.85, 0.45, 1.0);
            }
          `,
        });

        const pipeline = device.createRenderPipeline({
          layout: "auto",
          vertex: { module: shader, entryPoint: "vertexMain" },
          fragment: {
            module: shader,
            entryPoint: "fragmentMain",
            targets: [{ format }],
          },
          primitive: { topology: "triangle-list" },
        });

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.04, g: 0.06, b: 0.1, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          }],
        });

        pass.setPipeline(pipeline);
        pass.draw(3);
        pass.end();
        device.queue.submit([encoder.finish()]);

        setStatus("WebGPU is working — triangle rendered.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error));
      }
    }

    void start();
    return () => { cancelled = true; };
  }, []);

  return (
    <main>
      <p>{status}</p>
      <canvas ref={canvasRef} />
    </main>
  );
}