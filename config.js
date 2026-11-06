export const LANE_X = [-4, 0, 4];
export const ROOF_W = 15;
export const CHUNK_LEN = 44;

export const START_SPEED = 21;
export const MAX_SPEED = 44;
export const SPEED_GROWTH = 0.09;

export const GRAVITY = -34;
export const JUMP_V = 12.5;
export const DOUBLE_JUMP_V = 10.5;

export const LANE_SWITCH_SPEED = 12;

export const PLAYER_H = 2.0;
export const PLAYER_H_SLIDE = 0.8;
export const SLIDE_TIME = 0.62;

export const GRAPPLE_HEIGHT = 8.6;

export const COIN_VALUE = 1;

export const PALETTE = {
  skyTop: 0x5fa8e6,
  skyMid: 0xb6dcf7,
  skyHorizon: 0xfff0d4,
  fog: 0xcfe9fb,
  sun: 0xfff1cf,
  roof: 0xe2dccf,
  roofEdge: 0x7fcfc0,
  tower: 0xc3d1e2,
  hazard: 0xf07c6a,
  gate: 0x6fb7e8,
  blocker: 0x9b8be0,
  coin: 0xffc53d,
  facades: [0xf6e1bc, 0xcfe9d7, 0xf5c8bf, 0xc9dcf2, 0xf2e7a6],
};

export const SKINS = [
  { id: 'default', name: 'Голубой',   price: 0,    suit: 0x4fb8e0, trim: 0xff8fb1 },
  { id: 'mint',    name: 'Мята',      price: 250,  suit: 0x6fd3a6, trim: 0xffe08a },
  { id: 'peach',   name: 'Персик',    price: 400,  suit: 0xf59f72, trim: 0x7fb8ff },
  { id: 'lilac',   name: 'Сирень',    price: 700,  suit: 0xa892e8, trim: 0xffd27a },
  { id: 'sun',     name: 'Солнце',    price: 1500, suit: 0xffc94d, trim: 0x5aa9ff },
  { id: 'snow',    name: 'Снег',      price: 2500, suit: 0xf3f7fb, trim: 0x4fb8e0 },
];

export const TRAILS = [
  { id: 'none',    name: 'Без следа', price: 0,    color: 0xffffff },
  { id: 'cyan',    name: 'Бирюза',    price: 300,  color: 0x4fc3c7 },
  { id: 'pink',    name: 'Роза',      price: 600,  color: 0xff8fb1 },
  { id: 'rainbow', name: 'Радуга',    price: 1200, color: 0xffffff },
];
