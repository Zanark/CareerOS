import {
  BoxGeometry, BufferGeometry, Color, CylinderGeometry, Euler, Float32BufferAttribute,
  Group, Matrix4, Mesh, MeshBasicMaterial, OctahedronGeometry, Quaternion, Vector3,
} from 'three';

type Triple = readonly [number, number, number];
const light = new Vector3(-.4, .8, .7).normalize();

class Draft {
  private positions: number[] = [];
  private colors: number[] = [];

  add(source: BufferGeometry, color: string, position: Triple, rotation: Triple = [0, 0, 0]) {
    const geometry = source.index ? source.toNonIndexed() : source;
    geometry.applyMatrix4(new Matrix4().compose(new Vector3(...position),
      new Quaternion().setFromEuler(new Euler(...rotation)), new Vector3(1, 1, 1)));
    const points = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const base = new Color(color);
    const normal = new Vector3();
    for (let index = 0; index < points.count; index++) {
      normal.fromBufferAttribute(normals, index);
      const shade = Math.round((.67 + .33 * Math.max(0, normal.dot(light))) * 6) / 6;
      this.positions.push(points.getX(index), points.getY(index), points.getZ(index));
      this.colors.push(base.r * shade, base.g * shade, base.b * shade);
    }
    geometry.dispose();
    if (geometry !== source) source.dispose();
  }

  box(position: Triple, size: Triple, color: string, rotation?: Triple) {
    this.add(new BoxGeometry(...size), color, position, rotation);
  }

  cylinder(position: Triple, top: number, bottom: number, height: number, color: string, rotation?: Triple, sides = 6) {
    this.add(new CylinderGeometry(top, bottom, height, sides, 1), color, position, rotation);
  }

  triangle(a: Triple, b: Triple, c: Triple, color: string) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([...a, ...b, ...c, ...c, ...b, ...a], 3));
    geometry.computeVertexNormals();
    this.add(geometry, color, [0, 0, 0]);
  }

  mesh(name: string, material: MeshBasicMaterial) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    return mesh;
  }
}

function traveler() {
  const d = new Draft();
  d.cylinder([0, 1.02, 0], .29, .41, .77, '#548e85', [0, Math.PI / 4, 0], 4);
  d.box([0, 1.38, 0], [.21, .22, .21], '#244651');
  d.box([0, 1.76, 0], [.52, .48, .44], '#63988b');
  d.box([0, 1.99, 0], [.57, .12, .48], '#9cb7a6');
  d.box([-.26, 1.7, 0], [.11, .38, .48], '#376471');
  d.box([.26, 1.7, 0], [.11, .38, .48], '#376471');
  d.box([0, 1.76, .239], [.38, .3, .035], '#102b3c');
  for (const x of [-.105, .105]) d.box([x, 1.81, .263], [.055, .05, .025], '#eee8d5');
  for (const x of [-.39, .39]) {
    d.box([x, 1.04, 0], [.18, .59, .22], '#3c716f', [0, 0, x < 0 ? -.07 : .07]);
    d.box([x * 1.04, .72, .025], [.15, .16, .17], '#d1c5a1');
  }
  for (const x of [-.15, .15]) {
    d.box([x, .43, 0], [.2, .5, .2], '#173b4b');
    d.box([x, .14, .06], [.25, .23, .36], '#102c3b');
    d.box([x, .038, .06], [.27, .035, .37], '#819a91');
  }
  d.box([0, .74, 0], [.64, .1, .59], '#243b43');
  d.box([0, .75, .32], [.12, .1, .045], '#d6b66e');
  d.box([-.06, 1.07, .285], [.065, .57, .035], '#b6ac87', [0, 0, -.2]);
  return d;
}

function equipment(level: number) {
  const d = new Draft();
  switch (level) {
    case 2:
      d.box([0, 1.48, 0], [.65, .12, .59], '#d6b66e');
      d.box([-.38, 1.33, -.27], [.2, .43, .04], '#d6b66e', [0, 0, -.38]);
      d.box([-.52, 1.13, -.27], [.22, .12, .04], '#ad854c', [0, 0, -.38]);
      d.cylinder([.46, .8, .15], .12, .12, .045, '#d6b66e', [Math.PI / 2, 0, 0], 8);
      d.cylinder([.46, .8, .18], .085, .085, .012, '#eee8d5', [Math.PI / 2, 0, 0], 8);
      d.triangle([.46, .875, .192], [.435, .785, .192], [.485, .785, .192], '#cb4b16');
      break;
    case 3:
      d.box([0, 1.11, -.38], [.48, .55, .28], '#8f9275');
      d.box([0, 1.29, -.54], [.5, .18, .07], '#bdba91');
      d.box([0, .95, -.54], [.26, .17, .08], '#b8a77c');
      for (const x of [-.21, .21]) d.box([x, 1.16, .29], [.055, .43, .04], '#ccbc93');
      d.box([.04, 1.06, .285], [.24, .38, .06], '#6b8fa2');
      d.cylinder([0, 1.46, -.41], .08, .08, .66, '#d8ceaa', [0, 0, Math.PI / 2]);
      for (const x of [-.3, .3]) d.cylinder([x, 1.46, -.41], .09, .09, .04, '#ba9b65', [0, 0, Math.PI / 2]);
      break;
    case 4:
      d.cylinder([0, 1.48, 0], .38, .38, .09, '#c2d0b8', undefined, 8);
      d.box([0, 2.045, 0], [.65, .09, .57], '#a6c8bc');
      for (const x of [-.31, .31]) d.box([x, 1.79, 0], [.09, .43, .56], '#8bb3ad');
      d.box([0, 1.59, .08], [.64, .09, .58], '#a6c8bc');
      d.box([0, 1.8, .295], [.5, .28, .035], '#255469');
      for (const x of [-.105, .105]) d.box([x, 1.81, .32], [.055, .05, .02], '#e7edcc');
      for (const x of [-.365, .365]) d.cylinder([x, 1.78, 0], .095, .095, .08, '#d6b66e', [0, 0, Math.PI / 2]);
      for (const x of [-.15, .15]) d.box([x, .06, .16], [.3, .055, .48], '#69a4a3');
      d.add(new OctahedronGeometry(.15, 0), '#69b5d1', [-.44, .7, .17]);
      break;
    case 5:
      d.box([0, 1.4, -.04], [.92, .09, .54], '#aaa1d8');
      for (const x of [-.28, .28]) d.box([x, 1.24, .32], [.14, .3, .04], '#b9b1d5');
      d.cylinder([.62, 1.03, .14], .025, .025, 1.8, '#b79a5e');
      d.box([.52, .74, .14], [.2, .12, .12], '#ccbe98');
      d.box([.62, 1.79, .14], [.22, .29, .2], '#efcb7d');
      for (const x of [.48, .76]) for (const z of [.02, .26]) d.box([x, 1.79, z], [.025, .36, .025], '#b89d64');
      d.box([.62, 1.6, .14], [.35, .055, .32], '#d6b66e');
      d.cylinder([.62, 2.02, .14], 0, .26, .17, '#dfc58c', [0, Math.PI / 4, 0], 4);
      break;
    case 6:
      d.cylinder([0, 1.62, -.59], .025, .025, 2.5, '#d6b66e', [0, 0, Math.PI / 2]);
      d.triangle([0, 1.96, -.58], [-1.25, 1.63, -.58], [-.72, 1.2, -.58], '#aaa1d8');
      d.triangle([0, 1.96, -.58], [-.72, 1.2, -.58], [0, 1.43, -.58], '#d4cbbd');
      d.triangle([0, 1.96, -.58], [.72, 1.2, -.58], [1.25, 1.63, -.58], '#69b5d1');
      d.triangle([0, 1.96, -.58], [0, 1.43, -.58], [.72, 1.2, -.58], '#d4cbbd');
      d.box([0, 1.7, -.52], [.08, .6, .08], '#ba9b65');
      d.triangle([-.08, 1.9, -.6], [-.4, 2.08, -.6], [-.28, 1.77, -.6], '#d99383');
      break;
    case 7:
      d.box([0, 2.12, 0], [.62, .09, .55], '#e2c481');
      for (const x of [-.25, 0, .25]) d.box([x, 2.21, .2], [.09, x === 0 ? .25 : .16, .08], '#e2c481');
      d.add(new OctahedronGeometry(.065, 0), '#aaa1d8', [0, 2.23, .26]);
      for (const x of [-.28, .28]) d.box([x, 1.08, .36], [.08, .41, .045], '#dfc58c');
      d.triangle([.91, 1.34, .04], [1.11, 1.45, .05], [1.3, 1.34, .04], '#c2b9e5');
      d.triangle([1.08, 1.39, .04], [.65, 1.51, 0], [.84, 1.23, .04], '#aaa1d8');
      d.triangle([1.15, 1.39, .04], [1.55, 1.51, 0], [1.37, 1.23, .04], '#69b5d1');
      d.triangle([1.05, 1.34, .04], [1.12, 1.07, .02], [1.18, 1.34, .04], '#c2b9e5');
      for (const x of [1.05, 1.18]) d.box([x, 1.38, .065], [.035, .025, .015], '#eee8d5');
      break;
    default: throw new Error('Unknown Wayfinder equipment level.');
  }
  return d;
}

/** Original texture-free low-poly geometry. Every earned bundle stays on the base traveler. */
export function createWayfinderModel(level: number, material: MeshBasicMaterial) {
  if (!Number.isInteger(level) || level < 1 || level > 7) throw new Error('Invalid 3D Wayfinder level.');
  const group = new Group();
  group.name = 'wayfinder';
  group.add(traveler().mesh('harbor-traveler', material));
  const names = ['tide-compass-and-scarf', 'cartographer-pack-and-map', 'diving-seal-and-crystal',
    'beacon-mantle-and-lantern', 'stormsail-glider', 'astral-crown-and-star-manta'];
  for (let next = 2; next <= level; next++) {
    const mesh = equipment(next).mesh(names[next - 2], material);
    mesh.userData.level = next;
    group.add(mesh);
  }
  return group;
}

export function disposeWayfinderModel(model: Group) {
  model.traverse(child => { if (child instanceof Mesh) child.geometry.dispose(); });
  model.clear();
}

/** One baked, texture-free mesh for the entire movable chapter diorama. */
export function createWayfinderDiorama(level: number, material: MeshBasicMaterial) {
  if (!Number.isInteger(level) || level < 1 || level > 7) throw new Error('Invalid Wayfinder diorama level.');
  const d = new Draft();
  const stone = ['#40646b', '#607571', '#596b77', '#3c6b7b', '#5d667a', '#615e7c', '#77728c'][level - 1];
  if (level === 6) {
    d.cylinder([0, -.49, 0], 3.08, 1.05, .9, stone, [0, Math.PI / 4, 0], 4);
    d.box([0, -.035, 0], [4.4, .07, 4.4], '#91a59a');
  } else if (level === 7) {
    d.cylinder([0, -.23, 0], 2.65, 2.45, .46, stone, undefined, 8);
    d.cylinder([0, -.025, 0], 2.55, 2.55, .05, '#b7b2b4', undefined, 8);
  } else {
    d.box([0, -.27, 0], [4.6, .48, 4.6], stone);
    d.box([0, -.025, 0], [4.5, .05, 4.5], level === 1 || level === 4 ? '#38768a' : level === 2 ? '#849b7c' : '#9a9e97');
  }
  const flag = (x: number, z: number, color: string) => {
    d.box([x, .59, z], [.055, 1.18, .055], '#b5a078');
    d.box([x + .24, 1.02, z], [.46, .28, .025], color);
  };
  const crate = (x: number, z: number, size = .4) => {
    d.box([x, size / 2, z], [size, size, size], '#b3a477');
    d.box([x, size / 2, z + size / 2 + .01], [.045, size, .025], '#766d52');
    d.box([x, size + .01, z], [.045, .025, size], '#766d52');
  };
  switch (level) {
    case 1:
      d.box([1.51, .01, 0], [1.46, .08, 4.5], '#879d91');
      d.box([.02, -.015, .18], [1.48, .03, 3.65], '#9b997d');
      d.box([.8, .01, -.92], [1.45, .06, .62], '#9b997d');
      for (const z of [-1.4, -.7, 0, .7, 1.4]) d.box([.02, .006, z], [1.4, .012, .025], '#69776c');
      for (const x of [-.65, .65]) for (const z of [-1.45, 1.66]) d.box([x, -.04, z], [.1, .6, .1], '#6b776a');
      flag(-.62, -1.65, '#d6c69a');
      crate(1.48, -.84, .48);
      crate(1.7, -1.42, .34);
      for (const [x, z] of [[-1.45, -1.3], [-1.8, .1], [-1.3, 1.25]]) d.box([x, .007, z], [.45, .012, .035], '#9bbeb5');
      break;
    case 2:
      d.box([-1.83, .012, .8], [.72, .025, 2.8], '#4c91a0');
      d.box([-2.28, -.3, 1.4], [.04, .56, .65], '#65abb2');
      d.box([-1.32, .13, -1.56], [1.2, .26, .9], '#6b857d');
      d.box([-1.32, .28, -1.56], [1.14, .04, .84], '#a4b18b');
      d.add(new OctahedronGeometry(.42), '#6f8d83', [1.53, .24, -1.54]);
      d.add(new OctahedronGeometry(.28), '#8b9b84', [1.86, .16, -1.07]);
      flag(-1.38, -1.55, '#dfc58c');
      for (const x of [.7, 1.13, 1.56]) d.box([x, .035, .96], [.28, .07, .42], '#c0bd9b');
      d.box([1.8, .25, 1.56], [.08, .5, .08], '#708e78');
      d.box([1.8, .3, 1.56], [.48, .08, .08], '#708e78');
      break;
    case 3:
      d.box([-.44, .77, -1.74], [2.4, 1.54, .4], '#314f63');
      for (const y of [.08, .58, 1.09, 1.57]) d.box([-.44, y, -1.48], [2.5, .07, .16], '#b8a47f');
      for (let row = 0; row < 3; row++) for (let book = 0; book < 4; book++) {
        d.box([-1.35 + book * .51, .29 + row * .5, -1.48], [.26, .36 + (book % 2) * .06, .25], ['#83a0a4', '#b8b195', '#9092ac', '#d2bd93'][book]);
      }
      d.box([1.45, .49, -.94], [1.0, .11, .75], '#a89570');
      for (const x of [1.07, 1.83]) for (const z of [-1.2, -.69]) d.box([x, .23, z], [.07, .46, .07], '#6c735e');
      d.box([1.45, .57, -.94], [.63, .04, .47], '#d4cead', [0, -.18, 0]);
      d.box([1.45, .596, -.94], [.035, .01, .47], '#74978a', [0, -.18, 0]);
      break;
    case 4:
      d.box([0, -.018, .15], [1.5, .036, 3.8], '#779b9c');
      for (const x of [-.92, .92]) {
        d.box([x, .75, -1.52], [.35, 1.5, .42], '#8aa8a6');
        d.box([x, .08, -1.52], [.5, .16, .6], '#a5bcb1');
      }
      d.box([0, 1.59, -1.52], [2.2, .26, .45], '#a5bcb1');
      d.box([0, 1.8, -1.52], [1.38, .16, .45], '#789aa1');
      for (const x of [-1.7, 1.7]) {
        d.box([x, .28, .8], [.09, .56, .09], '#a397b1');
        d.box([x + .16, .33, .8], [.28, .08, .08], '#a397b1');
        d.box([x - .1, .42, .8], [.08, .24, .08], '#a397b1');
      }
      d.add(new OctahedronGeometry(.23), '#69b5d1', [-1.61, .18, -1.02]);
      d.add(new OctahedronGeometry(.17), '#aaa1d8', [1.55, .16, -1.08]);
      break;
    case 5:
      d.box([1.13, .09, -1.12], [1.4, .18, 1.45], '#8b8b94');
      d.cylinder([1.13, .94, -1.12], .29, .44, 1.55, '#b7c2b5', undefined, 6);
      d.cylinder([1.13, 1.71, -1.12], .47, .47, .11, '#8e9da2', undefined, 6);
      d.box([1.13, 1.91, -1.12], [.47, .32, .47], '#efcf86');
      d.cylinder([1.13, 2.16, -1.12], 0, .52, .23, '#bcbba6', undefined, 6);
      for (const x of [-1.9, -1.3, -.7]) d.box([x, .06, -1.6], [.42, .12, .5], '#b3b0a1');
      d.box([-1.83, .17, 1.56], [.17, .34, .17], '#b6ab8e');
      d.box([-1.18, .17, 1.56], [.17, .34, .17], '#b6ab8e');
      d.box([-1.51, .28, 1.56], [.75, .07, .07], '#8f927e');
      break;
    case 6:
      for (let plank = 0; plank < 5; plank++) d.box([-.98 + plank * .48, .017, 1.68], [.39, .034, .72], '#b8ac8c');
      for (const z of [1.3, 2.05]) {
        d.box([0, .3, z], [2.7, .055, .055], '#c4bc9b');
        for (const x of [-1.22, 1.22]) d.box([x, .17, z], [.07, .62, .07], '#929383');
      }
      d.box([-1.6, .1, -1.6], [.8, .2, .8], '#adb5a6');
      d.cylinder([-1.6, -.19, -1.6], .56, .2, .39, '#7b8294', [0, Math.PI / 4, 0], 4);
      flag(1.54, -1.6, '#d99383');
      break;
    case 7:
      for (const x of [-1.65, 1.65]) {
        d.cylinder([x, .65, -1.44], .22, .29, 1.3, '#7d86a1', undefined, 6);
        d.cylinder([x, 1.33, -1.44], .34, .34, .1, '#d1c5aa', undefined, 6);
      }
      d.box([0, -.05, .05], [1.56, .1, 1.55], '#c4b598');
      d.box([0, -.08, 1.13], [1.7, .13, .45], '#a8a4ab');
      d.add(new OctahedronGeometry(.37), '#ded7bc', [0, 1.8, -1.8]);
      d.box([0, .72, -1.8], [.08, 1.43, .08], '#b7a481');
      d.box([0, 1.8, -1.8], [1.2, .045, .045], '#d6b66e', [0, 0, .26]);
      for (const x of [-1.3, 1.3]) d.box([x, .03, .94], [.18, .06, .18], '#d6b66e', [0, Math.PI / 4, 0]);
      break;
  }
  d.cylinder([0, .013, 0], .48, .48, .007, level === 1 ? '#717b70' : '#596c74', undefined, 8);
  return d.mesh(`chapter-${level}-diorama`, material);
}
