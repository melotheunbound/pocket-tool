import { OggOpusDecoder, type OggOpusDecodedAudio } from 'ogg-opus-decoder';

export async function decodeOpusBytes(opusBytes: Uint8Array): Promise<OggOpusDecodedAudio> {
  const isOggContainer =
    opusBytes.length > 4 &&
    opusBytes[0] === 0x4f &&
    opusBytes[1] === 0x67 &&
    opusBytes[2] === 0x67 &&
    opusBytes[3] === 0x53;

  if (!isOggContainer) {
    throw new Error('Invalid Ogg Opus container');
  }

  const decoder = new OggOpusDecoder();
  await decoder.ready;

  try {
    const result = await decoder.decodeFile(opusBytes);

    return result;
  } finally {
    decoder.free();
  }
}

export function getWaveform({ channelData, samplesDecoded, sampleRate }: OggOpusDecodedAudio): string {
  if (!channelData.length) {
    throw new Error('No audio channels found');
  }

  let mono = channelData[0]!;

  if (channelData.length > 1) {
    mono = new Float32Array(channelData[0]!.length);

    for (let i = 0; i < mono.length; i++) {
      let sum = 0;

      for (const channel of channelData) {
        sum += channel[i] ?? 0;
      }

      mono[i] = sum / channelData.length;
    }
  }

  const durationSecs = samplesDecoded / sampleRate;
  const points = Math.max(1, Math.min(256, Math.round(durationSecs * 10)));
  const blockSize = Math.max(1, Math.floor(mono.length / points));
  const FLOOR_DBFS = -60;
  const bytes = new Uint8Array(points);

  for (let i = 0; i < points; i++) {
    const start = i * blockSize;
    const end = i === points - 1 ? mono.length : Math.min(start + blockSize, mono.length);

    let sumOfSquares = 0;
    let count = 0;

    for (let j = start; j < end; j++) {
      const sample = mono[j] ?? 0;

      sumOfSquares += sample * sample;
      count++;
    }

    const rms = count > 0 ? Math.sqrt(sumOfSquares / count) : 0;
    const dbfs = rms > 0 ? 20 * Math.log10(rms) : FLOOR_DBFS;
    const normalized = Math.max(0, Math.min(1, (dbfs - FLOOR_DBFS) / -FLOOR_DBFS));

    bytes[i] = Math.round(normalized * 255);
  }

  return Buffer.from(bytes).toString('base64');
}
