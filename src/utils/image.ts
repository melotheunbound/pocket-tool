import sharp, { type OverlayOptions } from 'sharp';
import { makeRequest } from './request';
import { RequestMethod, ResponseType } from '../types/types';

const DEFAULT_PETPET_RESOLUTION = 128;
const DEFAULT_PETPET_DELAY = 20;
const PETPET_FRAME_COUNT = 10;
const PETPET_FRAME_REVISION = 'f591cdc5b809c4d52c2666519571484517ac5c8d';
const PETPET_HAND_FRAME_URLS = Array.from(
  { length: PETPET_FRAME_COUNT },
  (_, index) => `https://raw.githubusercontent.com/VenPlugs/petpet/${PETPET_FRAME_REVISION}/frames/pet${index}.gif`,
);

let defaultPetpetHandFrames: Promise<Buffer[]> | undefined;

export type SpeechBubbleOptions = {
  height?: number;
  fill?: string;
  tailPosition?: number;
};

export type PetpetOptions = {
  resolution?: number;
  delay?: number;
  background?: string | { r: number; g: number; b: number; alpha?: number };
  handFrames?: readonly Buffer[];
};

export async function addSpeechBubble(image: Buffer, options: SpeechBubbleOptions = {}): Promise<Buffer> {
  const source = await sharp(image, { animated: false }).rotate().png().toBuffer();
  const { width, height } = await sharp(source).metadata();

  if (!width || !height) {
    throw new Error('Unable to determine the image dimensions.');
  }

  const requestedHeight = options.height ?? 0.28;
  const bubbleHeight = Math.round(
    Math.min(height * 0.7, Math.max(1, requestedHeight <= 1 ? height * requestedHeight : requestedHeight)),
  );
  const tailPosition = Math.min(0.82, Math.max(0.18, options.tailPosition ?? 0.58));
  const fill = escapeSvgAttribute(options.fill ?? '#ffffff');
  const bodyY = bubbleHeight * 0.72;
  const edgeY = bubbleHeight * 0.9;
  const tailX = width * tailPosition;
  const tailHalfWidth = Math.max(width * 0.055, 8);
  const tailTipY = Math.min(height, bubbleHeight * 1.52);

  const bubble = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <path fill="${fill}" d="
        M 0 0 H ${width} V ${bodyY}
        C ${width * 0.87} ${edgeY}, ${width * 0.73} ${edgeY}, ${tailX + tailHalfWidth} ${bodyY}
        C ${tailX + tailHalfWidth * 0.78} ${bubbleHeight}, ${tailX + tailHalfWidth * 0.55} ${tailTipY * 0.92}, ${tailX + tailHalfWidth * 1.45} ${tailTipY}
        C ${tailX + tailHalfWidth * 0.15} ${tailTipY * 0.94}, ${tailX - tailHalfWidth * 0.65} ${bubbleHeight}, ${tailX - tailHalfWidth} ${bodyY}
        C ${width * 0.31} ${edgeY}, ${width * 0.14} ${edgeY}, 0 ${bodyY}
        Z
      "/>
    </svg>
  `);

  return sharp(source)
    .composite([{ input: bubble, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

export async function createPetpetGif(avatar: Buffer, options: PetpetOptions = {}): Promise<Buffer> {
  const resolution = clampInteger(options.resolution ?? DEFAULT_PETPET_RESOLUTION, 32, 1024, 'resolution');
  const delay = clampInteger(options.delay ?? DEFAULT_PETPET_DELAY, 20, 65_535, 'delay');
  const handFrames = options.handFrames ? [...options.handFrames] : await loadDefaultPetpetHandFrames();

  if (!handFrames.length) {
    throw new Error('At least one petpet hand frame is required.');
  }

  const avatarSource = await sharp(avatar, { animated: false }).rotate().png().toBuffer();
  const frameCount = handFrames.length;
  const overlays: OverlayOptions[] = [];

  for (let index = 0; index < frameCount; index++) {
    const progress = index < frameCount / 2 ? index : frameCount - index;
    const avatarWidth = Math.round(resolution * (0.8 + progress * 0.02));
    const avatarHeight = Math.round(resolution * (0.8 - progress * 0.05));
    const avatarLeft = Math.round(resolution * ((1 - avatarWidth / resolution) * 0.5 + 0.1));
    const avatarTop = Math.round(resolution * (1 - avatarHeight / resolution - 0.08));
    const pageTop = index * resolution;

    const [avatarFrame, handFrame] = await Promise.all([
      sharp(avatarSource).resize(avatarWidth, avatarHeight, { fit: 'fill' }).png().toBuffer(),
      sharp(handFrames[index]!).resize(resolution, resolution, { fit: 'fill' }).png().toBuffer(),
    ]);

    overlays.push(
      { input: avatarFrame, left: avatarLeft, top: pageTop + avatarTop },
      { input: handFrame, left: 0, top: pageTop },
    );
  }

  return sharp({
    create: {
      width: resolution,
      height: resolution * frameCount,
      pageHeight: resolution,
      channels: 4,
      background: options.background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(overlays)
    .gif({
      loop: 0,
      delay: Array(frameCount).fill(delay),
      colours: 256,
      effort: 10,
      dither: 1,
      keepDuplicateFrames: true,
    })
    .toBuffer();
}

function loadDefaultPetpetHandFrames(): Promise<Buffer[]> {
  defaultPetpetHandFrames ??= Promise.all(
    PETPET_HAND_FRAME_URLS.map((url) =>
      makeRequest(url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
        timeout: 10_000,
      }),
    ),
  ).catch((error) => {
    defaultPetpetHandFrames = undefined;
    throw error;
  });

  return defaultPetpetHandFrames;
}

function clampInteger(value: number, min: number, max: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function escapeSvgAttribute(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&apos;',
      '"': '&quot;',
    };

    return entities[character]!;
  });
}
