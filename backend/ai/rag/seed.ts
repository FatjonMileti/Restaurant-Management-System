import fs from 'fs/promises';
import path from 'path';
import type { KnowledgeService, IngestResult } from './knowledgeService.js';

export interface SeedFile {
  id: string;
  title: string;
  sourceType: string;
  content: string;
  filename: string;
}

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'document';

const knowledgeDirCandidates = (): string[] => [
  path.join(process.cwd(), 'knowledge'),
  path.join(__dirname, '..', '..', '..', 'knowledge'),
  path.join(__dirname, '..', '..', 'knowledge'),
];

export const resolveKnowledgeDirectory = async (): Promise<string | null> => {
  for (const candidate of knowledgeDirCandidates()) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
};

export const parseKnowledgeFile = (filename: string, raw: string): SeedFile => {
  const content = raw.trim();
  const heading = content.match(/^#\s+(.+)$/m);
  const title = heading?.[1]?.trim() || path.basename(filename, path.extname(filename));
  return {
    id: `knowledge-${slug(path.basename(filename, path.extname(filename)))}`,
    title,
    sourceType: 'document',
    content,
    filename,
  };
};

export const loadKnowledgeFiles = async (directory: string): Promise<SeedFile[]> => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /\.(md|txt)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const result: SeedFile[] = [];
  for (const filename of files) {
    const raw = await fs.readFile(path.join(directory, filename), 'utf8');
    result.push(parseKnowledgeFile(filename, raw));
  }
  return result;
};

export const seedBuiltInKnowledge = async (
  service: KnowledgeService,
  directory?: string,
): Promise<IngestResult[]> => {
  const resolved = directory ?? (await resolveKnowledgeDirectory());
  if (!resolved) return [];
  const files = await loadKnowledgeFiles(resolved);
  const results: IngestResult[] = [];
  for (const file of files) {
    results.push(
      await service.ingest({
        id: file.id,
        title: file.title,
        content: file.content,
        sourceType: file.sourceType,
        metadata: { filename: file.filename },
      }),
    );
  }
  return results;
};
