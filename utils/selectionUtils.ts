export interface PixelPoint { x: number; y: number; }

export const rectangleSelection = (
  start: PixelPoint, end: PixelPoint, width: number, height: number,
): Set<string> => {
  const points = new Set<string>();
  const minX = Math.max(0, Math.min(start.x, end.x));
  const maxX = Math.min(width - 1, Math.max(start.x, end.x));
  const minY = Math.max(0, Math.min(start.y, end.y));
  const maxY = Math.min(height - 1, Math.max(start.y, end.y));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) points.add(`${x},${y}`);
  }
  return points;
};

export const lassoSelection = (path: PixelPoint[], width: number, height: number): Set<string> => {
  if (path.length < 3) return path.length ? rectangleSelection(path[0], path[path.length - 1], width, height) : new Set();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return new Set();
  context.beginPath();
  context.moveTo(path[0].x + 0.5, path[0].y + 0.5);
  for (let index = 1; index < path.length; index++) context.lineTo(path[index].x + 0.5, path[index].y + 0.5);
  context.closePath();
  context.fillStyle = '#fff';
  context.fill();
  const pixels = context.getImageData(0, 0, width, height).data;
  const selected = new Set<string>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] >= 128) selected.add(`${x},${y}`);
    }
  }
  if (!selected.size) return rectangleSelection(path[0], path[0], width, height);
  return selected;
};

interface BoundaryEdge {
  x1: number; y1: number; x2: number; y2: number;
  direction: number;
}

// Trace only exposed pixel edges into continuous paths so canvas dashes travel
// around a selection instead of restarting on every individual pixel.
export const selectionOutlinePath = (selection: Set<string>, width: number, height: number): string => {
  const edges: BoundaryEdge[] = [];
  const outgoing = new Map<string, number[]>();
  const addEdge = (x1: number, y1: number, x2: number, y2: number, direction: number) => {
    const index = edges.length;
    edges.push({ x1, y1, x2, y2, direction });
    const key = `${x1},${y1}`;
    const existing = outgoing.get(key);
    if (existing) existing.push(index);
    else outgoing.set(key, [index]);
  };

  selection.forEach(key => {
    const [x, y] = key.split(',').map(Number);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= width || y >= height) return;
    if (y === 0 || !selection.has(`${x},${y - 1}`)) addEdge(x, y, x + 1, y, 0);
    if (x === width - 1 || !selection.has(`${x + 1},${y}`)) addEdge(x + 1, y, x + 1, y + 1, 1);
    if (y === height - 1 || !selection.has(`${x},${y + 1}`)) addEdge(x + 1, y + 1, x, y + 1, 2);
    if (x === 0 || !selection.has(`${x - 1},${y}`)) addEdge(x, y + 1, x, y, 3);
  });

  const path: string[] = [];
  const visited = new Uint8Array(edges.length);
  const turnPriority = [1, 0, 3, 2]; // right, straight, left, reverse
  for (let first = 0; first < edges.length; first++) {
    if (visited[first]) continue;
    const start = edges[first];
    const startKey = `${start.x1},${start.y1}`;
    path.push(`M${start.x1} ${start.y1}`);
    let current = first;
    while (!visited[current]) {
      visited[current] = 1;
      const edge = edges[current];
      path.push(`L${edge.x2} ${edge.y2}`);
      const endKey = `${edge.x2},${edge.y2}`;
      if (endKey === startKey) {
        path.push('Z');
        break;
      }
      const options = (outgoing.get(endKey) || []).filter(index => !visited[index]);
      if (!options.length) break;
      options.sort((left, right) => {
        const leftTurn = (edges[left].direction - edge.direction + 4) % 4;
        const rightTurn = (edges[right].direction - edge.direction + 4) % 4;
        return turnPriority.indexOf(leftTurn) - turnPriority.indexOf(rightTurn);
      });
      current = options[0];
    }
  }
  return path.join('');
};
