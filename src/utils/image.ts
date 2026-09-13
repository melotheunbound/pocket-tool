import sharp, { type OverlayOptions } from 'sharp'
import { makeRequest } from './request'
import { RequestMethod, ResponseType } from '../types/types'

const DEFAULT_PETPET_RESOLUTION = 128
const DEFAULT_PETPET_DELAY = 20
const PETPET_FRAME_COUNT = 10
const PETPET_FRAME_REVISION = 'f591cdc5b809c4d52c2666519571484517ac5c8d'
const PETPET_HAND_FRAME_URLS = Array.from(
  { length: PETPET_FRAME_COUNT },
  (_, index) => `https://raw.githubusercontent.com/VenPlugs/petpet/${PETPET_FRAME_REVISION}/frames/pet${index}.gif`,
)

let defaultPetpetHandFrames: Promise<Buffer[]> | undefined

export type SpeechBubbleOptions = {
  height?: number
  fill?: string
  tailPosition?: number
}

export type PetpetOptions = {
  resolution?: number
  delay?: number
  background?: string | { r: number; g: number; b: number; alpha?: number }
  handFrames?: readonly Buffer[]
}

export async function convertToGif(input: Buffer): Promise<Buffer> {
  return sharp(input, { animated: true }).gif().toBuffer()
}

export async function applySpeechBubble(
  input: Buffer,
  options: SpeechBubbleOptions = {},
  gif = false,
): Promise<Buffer> {
  const image = sharp(input, { animated: gif })

  const { width, height } = await image.metadata()

  if (!width || !height) throw new Error('Unable to determine the image dimensions')

  const requestedHeight = options.height ?? 0.28
  const bubbleHeight = Math.round(
    Math.min(height * 0.7, Math.max(1, requestedHeight <= 1 ? height * requestedHeight : requestedHeight)),
  )

  const tailPosition = Math.min(0.82, Math.max(0.18, options.tailPosition ?? 0.58))

  const fill = escapeSvgAttribute(options.fill ?? '#ffffff')
  const bodyY = bubbleHeight * 0.72
  const edgeY = bubbleHeight * 0.9
  const tailX = width * tailPosition
  const tailHalfWidth = Math.max(width * 0.055, 8)
  const tailTipY = Math.min(height, bubbleHeight * 1.52)

  const bubble = Buffer.from(`
    <svg
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="${fill}" d="
        M 0 0 H ${width} V ${bodyY}
        C ${width * 0.87} ${edgeY}, ${width * 0.73} ${edgeY}, ${tailX + tailHalfWidth} ${bodyY}
        C ${tailX + tailHalfWidth * 0.78} ${bubbleHeight}, ${tailX + tailHalfWidth * 0.55} ${tailTipY * 0.92}, ${tailX + tailHalfWidth * 1.45} ${tailTipY}
        C ${tailX + tailHalfWidth * 0.15} ${tailTipY * 0.94}, ${tailX - tailHalfWidth * 0.65} ${bubbleHeight}, ${tailX - tailHalfWidth} ${bodyY}
        C ${width * 0.31} ${edgeY}, ${width * 0.14} ${edgeY}, 0 ${bodyY}
        Z
      "/>
    </svg>
  `)

  const result = image.composite([{ input: bubble, left: 0, top: 0 }])

  return gif ? result.gif().toBuffer() : result.png().toBuffer()
}

export async function createPetpetGif(input: Buffer, options: PetpetOptions = {}): Promise<Buffer> {
  const resolution = clampInteger(options.resolution ?? DEFAULT_PETPET_RESOLUTION, 32, 1024, 'resolution')
  const delay = clampInteger(options.delay ?? DEFAULT_PETPET_DELAY, 20, 65_535, 'delay')
  const handFrames = options.handFrames ? [...options.handFrames] : await loadDefaultPetpetHandFrames()

  if (!handFrames.length) throw new Error('At least one petpet hand frame is required')

  const avatar = await sharp(input).rotate().png().toBuffer()
  const frameCount = handFrames.length
  const overlays: OverlayOptions[] = []

  for (let index = 0; index < frameCount; index++) {
    const progress = index < frameCount / 2 ? index : frameCount - index
    const avatarWidth = Math.round(resolution * (0.8 + progress * 0.02))
    const avatarHeight = Math.round(resolution * (0.8 - progress * 0.05))
    const avatarLeft = Math.round(resolution * ((1 - avatarWidth / resolution) * 0.5 + 0.1))
    const avatarTop = Math.round(resolution * (1 - avatarHeight / resolution - 0.08))
    const pageTop = index * resolution

    const [avatarFrame, handFrame] = await Promise.all([
      sharp(avatar).resize(avatarWidth, avatarHeight, { fit: 'fill' }).png().toBuffer(),
      sharp(handFrames[index]!).resize(resolution, resolution, { fit: 'fill' }).png().toBuffer(),
    ])

    overlays.push(
      { input: avatarFrame, left: avatarLeft, top: pageTop + avatarTop },
      { input: handFrame, left: 0, top: pageTop },
    )
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
    .toBuffer()
}

function loadDefaultPetpetHandFrames(): Promise<Buffer[]> {
  defaultPetpetHandFrames ??= Promise.all(
    PETPET_HAND_FRAME_URLS.map(url =>
      makeRequest(url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
        timeout: 10 * 1000,
      }),
    ),
  ).catch(error => {
    defaultPetpetHandFrames = undefined
    throw error
  })

  return defaultPetpetHandFrames
}

function clampInteger(value: number, min: number, max: number, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`)

  return Math.min(max, Math.max(min, Math.round(value)))
}

function escapeSvgAttribute(value: string): string {
  return value.replace(/[&<>'"]/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&apos;',
      '"': '&quot;',
    }

    return entities[character]!
  })
}

export async function applyCaption(input: Buffer, caption: string, gif = false): Promise<Buffer> {
  const image = sharp(input, {
    animated: gif,
    limitInputPixels: false,
  })

  const metadata = await image.metadata()

  const width = metadata.width ?? 800
  const height = metadata.height ?? 0
  const pages = metadata.pages ?? 1
  const pageHeight = metadata.pageHeight ?? height

  if (!height) throw new Error('Unable to determine the image dimensions')

  const fontSize = Math.max(24, Math.round(width * 0.045))
  const horizontalPadding = Math.round(width * 0.04)
  const verticalPadding = Math.round(fontSize * 0.6)
  const lineHeight = Math.round(fontSize * 1.25)

  const maxTextWidth = width - horizontalPadding * 2

  const escapedCaption = caption
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  const charsPerLine = Math.max(1, Math.floor(maxTextWidth / (fontSize * 0.55)))

  const words = escapedCaption.split(/\s+/)
  const lines: string[] = []

  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word

    if (testLine.length <= charsPerLine) {
      currentLine = testLine
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine) lines.push(currentLine)

  const captionHeight = lines.length * lineHeight + verticalPadding * 2

  const textStartY = verticalPadding + fontSize

  const text = lines
    .map(
      (line, index) => `
        <text
          x="${width / 2}"
          y="${textStartY + index * lineHeight}"
          text-anchor="middle"
          fill="#000"
          font-family="Arial, sans-serif"
          font-size="${fontSize}px"
          font-weight="bold"
        >
          ${line}
        </text>
      `,
    )
    .join('')

  const svg = Buffer.from(`
    <svg
      width="${width}"
      height="${captionHeight}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="${width}"
        height="${captionHeight}"
        fill="#fff"
      />

      ${text}
    </svg>
  `)

  if (pages <= 1) {
    return sharp(input, {
      limitInputPixels: false,
    })
      .extend({
        top: captionHeight,
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
      })
      .composite([
        {
          input: svg,
          left: 0,
          top: 0,
        },
      ])
      .png({
        effort: 10,
      })
      .toBuffer()
  }

  if (!gif) {
    const firstFrame = await sharp(input, {
      pages: 1,
      limitInputPixels: false,
    })
      .png({
        effort: 10,
      })
      .toBuffer()

    return sharp(firstFrame, {
      limitInputPixels: false,
    })
      .extend({
        top: captionHeight,
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
      })
      .composite([
        {
          input: svg,
          left: 0,
          top: 0,
        },
      ])
      .png({
        effort: 10,
      })
      .toBuffer()
  }

  const frames = await Promise.all(
    Array.from({ length: pages }, async (_, page) => {
      const frame = await sharp(input, {
        animated: true,
        page,
        limitInputPixels: false,
      })
        .png({
          effort: 10,
        })
        .toBuffer()

      return sharp(frame, {
        limitInputPixels: false,
      })
        .extend({
          top: captionHeight,
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
        })
        .composite([
          {
            input: svg,
            left: 0,
            top: 0,
          },
        ])
        .png({
          effort: 10,
        })
        .toBuffer()
    }),
  )

  const frameHeight = pageHeight + captionHeight

  return sharp({
    create: {
      width,
      height: frameHeight * frames.length,
      pageHeight: frameHeight,
      channels: 4,
      background: '#fff',
    },
    limitInputPixels: false,
  })
    .composite(
      frames.map((frame: Buffer, index: number) => ({
        input: frame,
        left: 0,
        top: index * frameHeight,
      })),
    )
    .gif({
      effort: 10,
      loop: metadata.loop ?? 0,
      delay: metadata.delay ? Array.from(metadata.delay) : undefined,
    })
    .toBuffer()
}

export async function applyGrayscale(input: Buffer, gif = false): Promise<Buffer> {
  const image = sharp(input, { animated: gif }).grayscale()

  return gif ? image.gif().toBuffer() : image.png().toBuffer()
}

export async function applyBlur(input: Buffer, sigma = 5, gif = false): Promise<Buffer> {
  const image = sharp(input, { animated: gif }).blur(sigma)

  return gif ? image.gif().toBuffer() : image.png().toBuffer()
}

export async function applyFlip(input: Buffer, gif = false): Promise<Buffer> {
  const image = sharp(input, { animated: gif }).flip()

  return gif ? image.gif().toBuffer() : image.png().toBuffer()
}

export async function applyFlop(input: Buffer, gif = false): Promise<Buffer> {
  const image = sharp(input, { animated: gif }).flop()

  return gif ? image.gif().toBuffer() : image.png().toBuffer()
}

export async function applyPixelate(input: Buffer, scale = 16, gif = false): Promise<Buffer> {
  const image = sharp(input, {
    animated: gif,
    limitInputPixels: false,
  })

  const metadata = await image.metadata()

  const width = metadata.width
  const height = metadata.pageHeight ?? metadata.height

  if (!width || !height) throw new Error('Unable to determine the image dimensions')

  const pages = metadata.pages ?? 1

  if (scale < 1) scale = 1

  const pixelWidth = Math.max(1, Math.round(width / scale))
  const pixelHeight = Math.max(1, Math.round(height / scale))

  if (!gif || pages <= 1) {
    const small = await sharp(input, { limitInputPixels: false })
      .resize(pixelWidth, pixelHeight, { kernel: 'nearest', fit: 'fill' })
      .png()
      .toBuffer()

    return sharp(small).resize(width, height, { kernel: 'nearest', fit: 'fill' }).png().toBuffer()
  }

  const frames: Buffer[] = []

  for (let page = 0; page < pages; page++) {
    const small = await sharp(input, {
      page,
      limitInputPixels: false,
    })
      .resize(pixelWidth, pixelHeight, { kernel: 'nearest', fit: 'fill' })
      .png()
      .toBuffer()

    const frame = await sharp(small).resize(width, height, { kernel: 'nearest', fit: 'fill' }).png().toBuffer()

    frames.push(frame)
  }

  return sharp({
    create: {
      width,
      height: height * frames.length,
      pageHeight: height,
      channels: 4,
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0,
      },
    },
    limitInputPixels: false,
  })
    .composite(
      frames.map((frame, index) => ({
        input: frame,
        left: 0,
        top: index * height,
      })),
    )
    .gif({
      loop: metadata.loop ?? 0,
      delay: metadata.delay ? Array.from(metadata.delay) : undefined,
      effort: 10,
      colours: 256,
      dither: 1,
      keepDuplicateFrames: true,
    })
    .toBuffer()
}
