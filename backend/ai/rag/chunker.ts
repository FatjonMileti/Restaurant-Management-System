export interface ChunkOptions {
  chunkSize: number;
  overlap: number;
}

export const normalizeKnowledgeText = (text: string): string =>
  text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const splitLongUnit = (unit: string, chunkSize: number, overlap: number): string[] => {
  if (unit.length <= chunkSize) return [unit];
  const pieces: string[] = [];
  const step = Math.max(1, chunkSize - overlap);
  for (let start = 0; start < unit.length; start += step) {
    const piece = unit.slice(start, start + chunkSize).trim();
    if (piece) pieces.push(piece);
    if (start + chunkSize >= unit.length) break;
  }
  return pieces;
};

const buildUnits = (text: string, chunkSize: number, overlap: number): string[] => {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const units: string[] = [];
  for (const paragraph of paragraphs) {
    const sentences = paragraph
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const sentence of sentences.length ? sentences : [paragraph]) {
      units.push(...splitLongUnit(sentence, chunkSize, overlap));
    }
  }
  return units;
};

const takeOverlap = (text: string, overlap: number): string => {
  if (overlap <= 0) return '';
  const tail = text.slice(Math.max(0, text.length - overlap));
  const firstSpace = tail.search(/\s/);
  return (firstSpace >= 0 ? tail.slice(firstSpace + 1) : tail).trim();
};

/**
 * Sentence/paragraph-aware chunking with character overlap. Chunks stay within
 * `chunkSize` where possible; individual over-long sentences are hard-split.
 */
export const chunkText = (raw: string, options: ChunkOptions): string[] => {
  const text = normalizeKnowledgeText(raw);
  if (!text) return [];
  const chunkSize = Math.max(100, options.chunkSize);
  const overlap = Math.max(0, Math.min(options.overlap, chunkSize - 1));
  const units = buildUnits(text, chunkSize, overlap);
  if (units.length === 0) return [];

  const chunks: string[] = [];
  let index = 0;
  let prefix = '';

  while (index < units.length && chunks.length < 10000) {
    let current = prefix;
    while (index < units.length) {
      const next = current ? `${current} ${units[index]}` : units[index];
      if (current && next.length > chunkSize && current.length > prefix.length) break;
      current = next;
      index += 1;
      if (current.length >= chunkSize) break;
    }

    if (!current.trim()) {
      current = units[index] ?? '';
      index += 1;
    }
    if (current.trim()) chunks.push(current.trim().slice(0, chunkSize));
    if (index >= units.length) break;

    let nextPrefix = takeOverlap(current, overlap);
    const nextUnit = units[index] ?? '';
    if (nextPrefix.length + nextUnit.length + 1 > chunkSize) {
      const room = Math.max(0, chunkSize - nextUnit.length - 1);
      nextPrefix = takeOverlap(nextPrefix, room);
    }
    prefix = nextPrefix;
  }

  return chunks.filter((chunk, idx) => chunk && chunk !== chunks[idx - 1]);
};
