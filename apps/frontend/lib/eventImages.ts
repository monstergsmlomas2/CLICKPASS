const CATEGORY_IMAGES: Record<string, string[]> = {
  musica: [
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=900&q=80',
    'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=900&q=80',
    'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=900&q=80',
  ],
  electronica: [
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=80',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=80',
    'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=900&q=80',
  ],
  fiesta: [
    'https://images.unsplash.com/photo-1518972559570-7cc1309f3229?w=900&q=80',
    'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=900&q=80',
    'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=900&q=80',
  ],
  teatro: [
    'https://images.unsplash.com/photo-1503095396549-807759245b35?w=900&q=80',
    'https://images.unsplash.com/photo-1546484959-f9a381d1330d?w=900&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=900&q=80',
  ],
  deporte: [
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=900&q=80',
    'https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=900&q=80',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80',
  ],
  festival: [
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=900&q=80',
    'https://images.unsplash.com/photo-1551038247-3d9af20df552?w=900&q=80',
  ],
  rooftop: ['https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=900&q=80'],
  default: [
    'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=900&q=80',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=900&q=80',
    'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=900&q=80',
  ],
};

function hashToIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

export function getEventImage(category: string, bannerUrl?: string | null, seed = ''): string {
  if (bannerUrl) return bannerUrl;
  const pool = CATEGORY_IMAGES[category.toLowerCase()] ?? CATEGORY_IMAGES.default;
  const index = seed ? hashToIndex(seed, pool.length) : 0;
  return pool[index];
}
