import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync, closeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = Object.fromEntries(process.argv.slice(2).reduce((entries, value, index, values) => {
  if (value.startsWith('--')) entries.push([value.slice(2), values[index + 1]?.startsWith('--') ? true : values[index + 1] ?? true]);
  return entries;
}, []));
assert(typeof options.output === 'string', 'Pass --output with an owned, disposable artifact directory.');
const output = path.resolve(options.output);
assert(output !== root && !output.startsWith(path.join(root, 'src') + path.sep), 'Do not write captures into application source.');
mkdirSync(output, { recursive: true });
const ffmpeg = options.ffmpeg;
assert(typeof ffmpeg === 'string' && existsSync(ffmpeg), 'Pass --ffmpeg with an existing FFmpeg executable.');
const base = new URL(options.url ?? 'http://127.0.0.1:4468/CareerOS/');
assert(['127.0.0.1', 'localhost'].includes(base.hostname), 'Use a verified local development preview, never an owner browser profile.');
const probe = options.probe === true;
const fps = 20;
const seconds = probe ? 2 : 44;
const rawVideo = path.join(output, 'graph-source.mkv');
const sourceReceipt = path.join(output, 'capture.json');
const digest = value => createHash('sha256').update(value).digest('hex');
const speeds = [60, 90, 120, 150, 180, 210, 240, 270, 300, 80, 140, 200];
const errors = [];
const externalRequests = [];

async function openPanel(page, panel) {
  const trigger = page.locator(`[data-graph-panel-trigger="${panel}"]`);
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
}

async function closePanels(page) {
  const open = page.locator('[data-graph-panel-trigger][aria-expanded="true"]');
  if (await open.count()) await open.click();
}

async function setRange(slider, value) {
  await expect(slider).toBeEnabled();
  await slider.press('Home');
  const step = Number(await slider.getAttribute('step'));
  for (let count = 0; count < value / step; count++) await slider.press('ArrowRight');
  await expect(slider).toHaveValue(String(value));
}

async function snapshot(scene) {
  return scene.evaluate(element => ({
    attributes: Object.fromEntries(Array.from(element.attributes).filter(item => item.name.startsWith('data-')).map(item => [item.name, item.value])),
    rings: Array.from(element.querySelectorAll('.career-graph-scene__orbit-diagnostic')).map(ring => Object.fromEntries(
      Array.from(ring.attributes).filter(item => item.name.startsWith('data-')).map(item => [item.name, item.value]),
    )),
  }));
}

async function wordmark(browser) {
  assert(typeof options.font === 'string', 'Pass --font with the reviewed Cormorant Garamond variable TTF.');
  const font = readFileSync(options.font);
  assert.equal(digest(font), 'b20b7d9626dd956b2c5e558692ad328b1f19e3275e2782db4fa07670d83f35e0', 'The reviewed font bytes changed.');
  const logo = readFileSync(path.join(root, 'src', 'assets', 'careerhq-mark.svg'));
  const page = await browser.newPage({ viewport: { width: 1200, height: 200 }, deviceScaleFactor: 2 });
  try {
    await page.setContent(`<html lang="en"><meta charset="utf-8"><title>CareerOS wordmark</title><style>
      @font-face { font-family: CareerOSTitle; src: url(data:font/ttf;base64,${font.toString('base64')}) format('truetype'); font-weight: 300 700; }
      * { box-sizing: border-box; } body { margin: 0; background: #000f13; }
      main { width: 1200px; height: 200px; display: flex; align-items: center; justify-content: center; gap: 35px; position: relative; }
      main::before, main::after { content: ''; width: 74px; height: 1px; background: #9c8052; opacity: .65; }
      img { width: 124px; height: 124px; } h1 { margin: -5px 0 0; color: #eee8d5; font: 600 108px/1 CareerOSTitle; letter-spacing: .015em; }
      .rule { position: absolute; bottom: 1px; left: 80px; right: 80px; height: 1px; background: linear-gradient(90deg, transparent, #9c8052, transparent); opacity: .35; }
      </style><main><img alt="CareerOS logo" src="data:image/svg+xml;base64,${logo.toString('base64')}"><h1>CareerOS</h1><span class="rule"></span></main></html>`);
    await page.evaluate(() => document.fonts.ready);
    assert(await page.evaluate(() => document.fonts.check('600 108px CareerOSTitle')));
    const bounds = await page.locator('h1').boundingBox();
    assert(bounds && bounds.x > 0 && bounds.y >= 0 && bounds.x + bounds.width < 1200 && bounds.y + bounds.height < 200);
    const file = path.join(output, 'readme-wordmark.png');
    await page.screenshot({ path: file, animations: 'disabled' });
    return { width: 2400, height: 400, font: 'Cormorant Garamond', weight: 600, fontSha256: digest(font), logoSha256: digest(logo), titleBounds: bounds };
  } finally {
    await page.close();
  }
}

async function capture() {
  assert(!existsSync(sourceReceipt) && !existsSync(rawVideo), 'Preserve an earlier capture; choose a fresh output directory or --encode-only.');
  const browser = await chromium.launch({
    channel: 'msedge', headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  let encoder;
  let encoderDone;
  let log;
  try {
    const branding = await wordmark(browser);
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.url().startsWith('http') && new URL(request.url()).origin !== base.origin) externalRequests.push(request.url());
    });
    await page.goto(new URL('#/hq', base).href);
    const fixture = await page.evaluate(async () => {
      const { createInitialState, parseState, STORAGE_KEY } = await import('/CareerOS/src/domain/engine.ts');
      const { missions } = await import('/CareerOS/src/domain/catalog.ts');
      const state = createInitialState(false);
      delete state.omscsPlan;
      state.sampleData = true;
      for (const mission of missions) {
        if (mission.planned) throw new Error(`Unavailable mission ${mission.id} cannot be presented as active.`);
        state.missions[mission.id].mode = 'active';
      }
      const valid = parseState(state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      localStorage.setItem('careerhq.theme.v1', 'dark');
      return { missions: missions.map(mission => ({ id: mission.id, name: mission.name, mode: valid.missions[mission.id].mode })),
        evidence: valid.evidence.length, events: valid.events.length, academicProfile: Object.hasOwn(valid, 'omscsPlan') };
    });
    assert.equal(fixture.missions.length, speeds.length);
    assert.equal(fixture.evidence, 0);
    assert.equal(fixture.events, 0);
    assert.equal(fixture.academicProfile, false);
    await page.goto(new URL('#/home', base).href);
    await page.reload();
    const scene = page.locator('.career-graph-scene');
    await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 30_000 });
    await expect(scene).toHaveAttribute('data-orbit-count', '12');
    const raw = await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'));
    const restored = JSON.parse(raw);
    assert(!Object.hasOwn(restored, 'omscsPlan') && restored.evidence.length === 0 && restored.events.length === 0);
    await openPanel(page, 'view');
    await page.getByRole('checkbox', { name: 'Auto-rotate', exact: true }).uncheck();
    await page.getByRole('checkbox', { name: 'Core heartbeat', exact: true }).check();
    await setRange(page.getByRole('slider', { name: 'Spark dots', exact: true }), 40);
    await setRange(page.getByRole('slider', { name: 'Spark lines', exact: true }), 20);
    await closePanels(page);
    await page.getByRole('checkbox', { name: 'Node labels', exact: true }).uncheck();
    const speedSettings = [];
    for (const [index, mission] of fixture.missions.entries()) {
      const id = `orbit:mission:${mission.id}`;
      await openPanel(page, 'rings');
      await page.locator(`.career-orbit-list > button[data-orbit-id="${id}"]`).click();
      const inspector = page.getByRole('complementary', { name: 'Selected career orbit', exact: true });
      await setRange(inspector.getByRole('slider', { name: 'Rotation speed', exact: true }), speeds[index]);
      await inspector.getByRole('button', { name: 'Close orbit details', exact: true }).click();
      speedSettings.push({ id, percent: speeds[index] });
    }
    await closePanels(page);
    await page.getByRole('button', { name: 'Full screen', exact: true }).click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await page.getByRole('button', { name: 'Frame all', exact: true }).click();
    await page.mouse.move(-20, -20);
    await page.addStyleTag({ content: '.career-graph-scene__space-note { display: none !important; }' });
    const rect = await scene.locator('canvas').boundingBox();
    assert(rect && rect.width >= 1200 && rect.height >= 700);
    const clip = { x: Math.ceil(rect.x), y: Math.ceil(rect.y), width: Math.floor(rect.x + rect.width) - Math.ceil(rect.x), height: Math.floor(rect.y + rect.height) - Math.ceil(rect.y) };
    await page.clock.install({ time: new Date('2026-11-27T06:30:00Z') });
    await page.clock.pauseAt(new Date('2026-11-27T06:30:01Z'));
    await page.getByRole('button', { name: 'Resume animation', exact: true }).dispatchEvent('click');
    await page.clock.runFor(500);
    await expect(scene).toHaveAttribute('data-animation-state', 'running');
    await expect(scene).toHaveAttribute('data-spark-density', '40');
    await expect(scene).toHaveAttribute('data-spark-line-density', '20');
    await expect(scene).toHaveAttribute('data-heartbeat-running', 'true');
    await expect(scene).toHaveAttribute('data-core-screen-visible', 'true');
    const first = await snapshot(scene);
    assert.equal(first.rings.length, speeds.length);
    assert(first.rings.every(ring => ring['data-orbit-revolving'] === 'true'));
    for (const speed of speedSettings) assert.equal(first.rings.find(ring => ring['data-orbit-id'] === speed.id)['data-rotation-speed'], String(speed.percent));
    log = openSync(path.join(output, 'capture-ffmpeg.log'), 'w');
    encoder = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-threads', '2', '-f', 'image2pipe', '-framerate', String(fps),
      '-vcodec', 'png', '-i', 'pipe:0', '-an', '-c:v', 'ffv1', '-level', '3', '-threads', '2', '-pix_fmt', 'bgr0', rawVideo],
    { stdio: ['pipe', 'ignore', log] });
    encoderDone = once(encoder, 'close');
    const samples = [];
    for (let index = 0; index < seconds * fps; index++) {
      await page.clock.runFor(1000 / fps);
      const frame = await page.screenshot({ type: 'png', clip, animations: 'allow', caret: 'hide' });
      if (index === 0 || index === seconds * fps - 1) writeFileSync(path.join(output, index === 0 ? 'first.png' : 'last.png'), frame);
      await new Promise((resolve, reject) => encoder.stdin.write(frame, error => error ? reject(error) : resolve()));
      if (index % fps === 0) samples.push({ frame: index, ...await snapshot(scene) });
      if (index % (fps * 5) === 0) console.log(`Captured ${index}/${seconds * fps} frames`);
    }
    encoder.stdin.end();
    assert.equal((await encoderDone)[0], 0, 'Lossless source encoding failed; see capture-ffmpeg.log.');
    encoder = undefined;
    const last = await snapshot(scene);
    assert(last.rings.every(ring => ring['data-rotation-phase'] !== first.rings.find(start => start['data-orbit-id'] === ring['data-orbit-id'])['data-rotation-phase']));
    assert.equal(await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1')), raw, 'View capture changed the fictional workspace.');
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    const receipt = { status: 'actual-graph-captured', createdAt: new Date().toISOString(), source: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      baseURL: base.href, browser: browser.version(), fps, sourceSeconds: seconds, frames: seconds * fps, clip, branding, fixture, speedSettings,
      first, last, samples, savedWorkspaceUnchanged: true, ownerBrowserAccessed: false, manualImageViews: 0, errors, externalRequests };
    writeFileSync(sourceReceipt, JSON.stringify(receipt, null, 2) + '\n');
    await context.close();
  } finally {
    if (encoder) {
      encoder.stdin.destroy();
      encoder.kill();
      if (encoderDone) await encoderDone;
    }
    if (log !== undefined) closeSync(log);
    await browser.close();
  }
}

function encode() {
  const receipt = JSON.parse(readFileSync(sourceReceipt, 'utf8'));
  assert.equal(receipt.status, 'actual-graph-captured');
  if (receipt.sourceSeconds !== 44) {
    console.log('Probe complete; preserve its source and receipt before the full capture.');
    return;
  }
  const filter = '[0:v]split[a][b];[a]trim=start=4:end=44,setpts=PTS-STARTPTS[body];[b]trim=start=0:end=4,setpts=PTS-STARTPTS[head];'
    + '[body][head]xfade=transition=fade:duration=4:offset=36,fps=15,scale=800:-1:flags=lanczos,format=rgb24,split[colors][frames];'
    + '[colors]palettegen=max_colors=128:reserve_transparent=1:stats_mode=diff[palette];'
    + '[frames][palette]paletteuse=dither=none:diff_mode=rectangle';
  const file = path.join(output, 'readme-graph.gif');
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-threads', '2', '-i', rawVideo, '-filter_complex_threads', '1',
    '-filter_complex', filter, '-gifflags', '+offsetting+transdiff', '-loop', '0', '-an', file], { stdio: ['ignore', 'inherit', 'inherit'] });
  console.log(JSON.stringify({ file, sha256: digest(readFileSync(file)), bytes: readFileSync(file).length, loopSeconds: 40 }));
}

if (options['encode-only'] !== true) await capture();
encode();
