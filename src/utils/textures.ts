import antColorUrl from '../assets/antskin.png';
import defaultImageUrl from '../assets/default.png';


const textures = new Map<string, ImageBitmap>();

export async function preloadTextures(): Promise<void> {
  const [ant, def] = await Promise.all([
    loadBitmap(antColorUrl),
    loadBitmap(defaultImageUrl),
  ]);
  textures.set('ant', ant);
  textures.set('default', def);
}

export async function loadBitmap(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load texture: ${url}`);

  return createImageBitmap(await response.blob());
}

export function getTexture(url: string): ImageBitmap {
    const texture = textures.get(url);
    if (!texture) {
        throw new Error(`Texture not preloaded: ${url}`);
    }
    return texture;
}
