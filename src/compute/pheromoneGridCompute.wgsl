struct GridParams {
  dt: f32,
  decay: f32,
  totalCells: u32,
  gridMax: f32,
};

@group(0) @binding(0) var<uniform> params: GridParams;
@group(0) @binding(1) var<storage, read_write> pheromoneGrid: array<vec2<f32>>; 
// each value in the grid is a vec2<f32> representing the pheromone levels for two types of pheromones 
// x is the leaving home pheromone (blue), y is the returning to colony pheromone (red)

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= params.totalCells) { return; }

    let d = params.decay * params.dt;
    // let x = pheromoneGrid[idx].x;
    // if (x > 0.0) {
    //     let nextX = x + d;
    //     pheromoneGrid[idx].x = select(nextX, 0.0, nextX >= params.gridMax); // the blue one gets stronger with age, but getsset to 0 when fully decayed
    // }
    pheromoneGrid[idx].x = max(pheromoneGrid[idx].x - d, 0.0); // the blue one gets weaker with age
    pheromoneGrid[idx].y = max(pheromoneGrid[idx].y - d, 0.0); // the red one gets weaker with age
}


