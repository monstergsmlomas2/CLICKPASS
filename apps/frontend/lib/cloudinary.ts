import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from './config';

/** Tamaño máximo aceptado para el banner del evento. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Sube una imagen directo a Cloudinary (unsigned) y devuelve la URL pública.
 * No pasa por nuestro backend: el navegador habla con Cloudinary, que comprime
 * y sirve la imagen por su CDN.
 */
export async function uploadEventImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('La imagen no puede superar los 8 MB');
  }

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body },
  );
  if (!res.ok) {
    throw new Error('No se pudo subir la imagen. Probá de nuevo.');
  }
  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error('Cloudinary no devolvió la URL de la imagen');
  }
  return data.secure_url;
}
