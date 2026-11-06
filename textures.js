import * as THREE from 'three';
import roofUrl from './tex_roof.png';
import facadeUrl from './tex_facade.png';
import hazardUrl from './tex_hazard.png';
import suitUrl from './tex_suit.png';
import metalUrl from './tex_metal.png';

const loader = new THREE.TextureLoader();

function load(url, repeat) {
  const t = loader.load(url);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export const roofTexture = () => load(roofUrl, [3, 3]);
export const facadeTexture = () => load(facadeUrl, [2, 3]);
export const hazardTexture = () => load(hazardUrl, [2, 1]);
export const suitTexture = () => load(suitUrl, [1, 1]);
export const metalTexture = () => load(metalUrl, [1, 2]);
