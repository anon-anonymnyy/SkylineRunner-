export const VIRTUAL_H = 720;
export const BASE_Y = 470;

export const GRAVITY = 2950;
export const JUMP_V = -1010;
export const JUMP_CUT = 0.42;

export const BASE_SPEED = 520;
export const MAX_SPEED = 1060;
export const SPEED_PER_M = 0.5;
export const PX_PER_M = 51;

export const SLIDE_TIME = 0.55;
export const COYOTE = 0.1;
export const JUMP_BUFFER = 0.13;

export const PW = 40;
export const PH = 92;
export const PH_SLIDE = 50;

export const PALETTE = {
  skyTop: '#3f92d2',
  skyMid: '#a8d7f2',
  skyLow: '#ffe2b8',
  sun: '#fff6d8',
  cloud: '#ffffff',
  farCity: '#b8d2e6',
  midCity: '#8fb2cd',
  concrete: '#f0ebdd',
  concreteDark: '#dcd5c4',
  roofBand: '#faf6ea',
  roofEdge: '#5fbf9a',
  window: '#a6c8de',
  windowFrame: '#ffffff',
  ink: '#20304a',
  hazard: '#f0785f',
  hazardLight: '#fce8e2',
  coin: '#f7c948',
  coinDark: '#d9a11f',
  dust: '#ffffff',
};

export const SKINS = [
  { id: 'default', name: 'Морская',   price: 0,    suit: '#3fb3d8', trim: '#f0785f', legs: '#20304a' },
  { id: 'mint',    name: 'Мята',      price: 250,  suit: '#54c9a0', trim: '#ffe08a', legs: '#1f3a34' },
  { id: 'peach',   name: 'Персик',    price: 400,  suit: '#f59f72', trim: '#4f8fe0', legs: '#3a2318' },
  { id: 'lilac',   name: 'Сирень',    price: 700,  suit: '#a892e8', trim: '#ffd27a', legs: '#2a2340' },
  { id: 'sun',     name: 'Солнце',    price: 1500, suit: '#ffc94d', trim: '#e2583f', legs: '#3a2c10' },
  { id: 'snow',    name: 'Снег',      price: 2500, suit: '#f3f7fb', trim: '#3fb3d8', legs: '#2b3a4a' },
];

export const TRAILS = [
  { id: 'none',    name: 'Без следа', price: 0,    color: null },
  { id: 'cyan',    name: 'Бирюза',    price: 300,  color: '#3fb3d8' },
  { id: 'pink',    name: 'Коралл',    price: 600,  color: '#f0785f' },
  { id: 'rainbow', name: 'Радуга',    price: 1200, color: 'rainbow' },
];
