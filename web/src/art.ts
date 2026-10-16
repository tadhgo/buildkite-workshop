const g1 = "#30f2a2";
const g2 = "#14cc80";
const g3 = "#0b9e62";
const p1 = "#9d8cff";
const p2 = "#7b61ff";
const p3 = "#5b3df5";

function diamond(cx: number, cy: number, w: number, h: number, c: string[]): string {
  const top = `${cx},${cy - h * 0.4}`;
  const left = `${cx - w / 2},${cy}`;
  const right = `${cx + w / 2},${cy}`;
  const bottom = `${cx},${cy + h * 0.6}`;
  const mid = `${cx},${cy}`;
  return `
    <polygon points="${top} ${left} ${mid}" fill="${c[0]}"/>
    <polygon points="${top} ${right} ${mid}" fill="${c[1]}"/>
    <polygon points="${left} ${bottom} ${mid}" fill="${c[1]}"/>
    <polygon points="${right} ${bottom} ${mid}" fill="${c[2]}"/>`;
}

function tail(x: number, y: number, color: string): string {
  return `
    <path d="M${x} ${y} C ${x - 14} ${y + 18}, ${x + 14} ${y + 30}, ${x - 4} ${y + 48}" stroke="${color}" stroke-width="2" fill="none"/>
    <polygon points="${x - 9},${y + 14} ${x - 1},${y + 18} ${x - 9},${y + 22}" fill="${color}"/>
    <polygon points="${x + 9},${y + 30} ${x + 1},${y + 34} ${x + 9},${y + 38}" fill="${color}"/>`;
}

const pieces: Record<string, string> = {
  "the-agent": diamond(100, 88, 96, 120, [g1, g2, g3]) + tail(100, 160, p1),

  "parallel-pair":
    diamond(70, 84, 64, 84, [g1, g2, g3]) +
    diamond(132, 84, 64, 84, [p1, p2, p3]) +
    `<path d="M70 134 L100 176 L132 134" stroke="#a3a3bd" stroke-width="1.5" fill="none"/>`,

  "pipeline-box-kite": `
    <polygon points="100,34 142,56 100,78 58,56" fill="${g1}"/>
    <polygon points="58,56 100,78 100,100 58,78" fill="${g2}"/>
    <polygon points="142,56 100,78 100,100 142,78" fill="${g3}"/>
    <path d="M58 78 L58 104 M100 100 L100 126 M142 78 L142 104" stroke="#a3a3bd" stroke-width="2"/>
    <polygon points="58,104 100,126 100,148 58,126" fill="${g2}"/>
    <polygon points="142,104 100,126 100,148 142,126" fill="${g3}"/>
    <polygon points="100,126 58,104 100,90 142,104" fill="${g1}" opacity="0.35"/>`,

  "green-build-delta": `
    <polygon points="100,40 100,130 36,130" fill="${g1}"/>
    <polygon points="100,40 164,130 100,130" fill="${g2}"/>
    <polygon points="100,100 100,130 80,130" fill="${g3}"/>
    <polygon points="100,100 120,130 100,130" fill="${g3}"/>` + tail(100, 130, p1),

  "the-cluster":
    diamond(100, 62, 44, 56, [g1, g2, g3]) +
    diamond(62, 104, 44, 56, [p1, p2, p3]) +
    diamond(138, 104, 44, 56, [p1, p2, p3]) +
    diamond(100, 138, 44, 56, [g1, g2, g3]),

  "hosted-glider": `
    <polygon points="100,64 100,112 24,120" fill="${p1}"/>
    <polygon points="100,64 176,120 100,112" fill="${p2}"/>
    <polygon points="100,112 100,140 76,116" fill="${p3}"/>
    <polygon points="100,112 124,116 100,140" fill="${p3}"/>`,
};

export function kiteArt(productId: string): string {
  const body = pieces[productId] ?? diamond(100, 88, 96, 120, [g1, g2, g3]);
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${body}</svg>`;
}
