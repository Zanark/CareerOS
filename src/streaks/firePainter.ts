export type FireVariant = 'card' | 'calendar' | 'hero';

const noiseSize = 128;
const noise = new Float32Array(noiseSize * noiseSize);
let seed = 0x9e3779b9;
for (let index = 0; index < noise.length; index++) {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  noise[index] = (seed >>> 0) / 0xffffffff;
}
const smooth = (value: number) => value * value * (3 - 2 * value);
const clamp = (value: number) => Math.max(0, Math.min(1, value));

function sample(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const x0 = ix & 127, x1 = (ix + 1) & 127, y0 = (iy & 127) * noiseSize, y1 = ((iy + 1) & 127) * noiseSize;
  const a = noise[y0 + x0] * (1 - fx) + noise[y0 + x1] * fx;
  const b = noise[y1 + x0] * (1 - fx) + noise[y1 + x1] * fx;
  return a * (1 - fy) + b * fy;
}

function turbulence(x: number, y: number) {
  return sample(x, y) * .54 + sample(x * 2.03 + 17, y * 2.03) * .28 + sample(x * 4.07, y * 4.07 + 31) * .18;
}

const palette = Array.from({ length: 256 }, (_, index) => {
  const heat = index / 255;
  return [
    Math.round(160 + 95 * clamp(heat * 3)),
    Math.round(28 + 220 * Math.pow(heat, 1.25)),
    Math.round(5 + 205 * Math.pow(heat, 4)),
  ];
});
const frameCache = new Map<FireVariant, { time: number; image: ImageData }>();

export function createFirePainter(canvas: HTMLCanvasElement, burning: boolean, variant: FireVariant) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return null;
  const width = variant === 'calendar' ? 72 : variant === 'hero' ? 320 : 256;
  const height = variant === 'calendar' ? 88 : variant === 'hero' ? 152 : 112;
  canvas.width = width;
  canvas.height = height;
  const image = context.createImageData(width, height);
  let frames = 0;

  function logs(context: CanvasRenderingContext2D) {
    if (variant === 'calendar') return;
    const cx = width * .84, base = height * .9, length = width * .18;
    context.lineCap = 'round';
    for (const direction of [-1, 1]) {
      context.strokeStyle = burning ? '#3d2c26' : '#3a4445';
      context.lineWidth = height * .066;
      context.beginPath();
      context.moveTo(cx - length / 2, base + direction * height * .028);
      context.lineTo(cx + length / 2, base - direction * height * .028);
      context.stroke();
      context.strokeStyle = burning ? '#b7653566' : '#a9b6b34d';
      context.lineWidth = 1;
      context.stroke();
    }
    for (let index = 0; index < 17; index++) {
      const x = cx + (noise[index] - .5) * length * 1.5;
      const y = base + (noise[index + 21] - .25) * height * .08;
      context.fillStyle = burning ? `rgba(255,154,65,${.2 + noise[index + 41] * .4})` : '#a8b7b955';
      context.fillRect(x, y, 1.5, .8);
    }
  }

  return (time: number) => {
    context.clearRect(0, 0, width, height);
    if (burning) {
      const cached = frameCache.get(variant);
      if (cached?.time === time) context.putImageData(cached.image, 0, 0);
      else {
        const pixels = image.data;
        for (let y = 0; y < height; y++) {
          const rise = 1 - y / (height - 1);
          for (let x = 0; x < width; x++) {
            const nx = x / (width - 1);
            const warp = turbulence(nx * 4.7, rise * 3.8 - time * .9);
            const curl = (warp - .5) * (.05 + rise * .29);
            const fuelX = nx + curl;
            const center = variant === 'calendar' ? .5 : .84;
            const spread = variant === 'calendar' ? .3 : .14;
            const plume = Math.max(0, 1 - Math.abs(fuelX - center) / (spread * (1 - rise * .65)));
            const edge = variant === 'calendar' ? 0 : Math.max(0, 1 - Math.abs(fuelX - .035) / .055) * .42;
            const fine = turbulence(nx * 14 + warp * 1.8, rise * 8 - time * 2.1);
            // Advected multiscale density gives tongues and holes, not translated flame silhouettes.
            const density = Math.max(plume, edge) * (1 - rise * .9) + (fine - .48) * (.4 + rise * .25) - rise * .24;
            const heat = clamp(density * 1.8 + (1 - rise) * .15);
            let alpha = clamp((density - .025) * 5.2) * clamp((1 - rise) * 5);
            if (variant === 'calendar') {
              const readingWindow = clamp(1 - Math.abs(nx - .5) / .3) * clamp(1 - Math.abs(rise - .48) / .3);
              alpha *= 1 - readingWindow * .92;
            }
            const color = palette[Math.round(heat * 255)];
            const offset = (y * width + x) * 4;
            pixels[offset] = color[0];
            pixels[offset + 1] = color[1];
            pixels[offset + 2] = color[2];
            pixels[offset + 3] = Math.round(alpha * 230);
          }
        }
        context.putImageData(image, 0, 0);
        frameCache.set(variant, { time, image });
      }
      for (let index = 0; index < (variant === 'calendar' ? 3 : 7); index++) {
        const phase = (time * (.19 + noise[index] * .14) + noise[index + 7]) % 1;
        const center = variant === 'calendar' ? .5 : .84;
        const x = width * (center + (noise[index + 19] - .5) * .18 + Math.sin(phase * 5 + index) * .025);
        const y = height * (.84 - phase * .72);
        context.fillStyle = `rgba(255,197,105,${Math.sin(phase * Math.PI) * .65})`;
        context.fillRect(x, y, .7 + noise[index + 33], 1.2);
      }
    } else {
      context.strokeStyle = '#9baeb54d';
      context.lineWidth = 1.15;
      for (let index = 0; index < 3; index++) {
        const x = width * (.8 + index * .035);
        context.beginPath();
        context.moveTo(x, height * .76);
        context.bezierCurveTo(x - 9, height * .6, x + 12, height * .54, x + 2, height * .36);
        context.stroke();
      }
    }
    logs(context);
    canvas.dataset.fireFrame = String(++frames);
  };
}
