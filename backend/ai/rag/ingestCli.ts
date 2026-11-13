import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from '../../config/db.js';
import { initializeAi } from '../runtime.js';
import { loadKnowledgeFiles, resolveKnowledgeDirectory } from './seed.js';

dotenv.config();

const readArg = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const main = async () => {
  await connectDB();
  const runtime = await initializeAi();
  if (!runtime?.knowledge) {
    console.error(
      'Knowledge ingestion requires AI_ENABLED=true, a valid LLM config, AI_RAG_ENABLED=true, and an embedding model.',
    );
    process.exitCode = 1;
    return;
  }

  const requestedDir = readArg('--dir');
  const directory = requestedDir
    ? path.resolve(process.cwd(), requestedDir)
    : await resolveKnowledgeDirectory();
  if (!directory) {
    console.error('No knowledge directory found. Pass --dir <path>.');
    process.exitCode = 1;
    return;
  }

  const files = await loadKnowledgeFiles(directory);
  if (files.length === 0) {
    console.log(`No .md or .txt files found in ${directory}`);
    return;
  }

  let failed = 0;
  for (const file of files) {
    const result = await runtime.knowledge.ingest({
      id: file.id,
      title: file.title,
      content: file.content,
      sourceType: file.sourceType,
      metadata: { filename: file.filename },
    });
    const status = result.document.embeddingStatus;
    if (status !== 'ready') failed += 1;
    console.log(
      `${file.filename}: ${status} (${result.document.chunkCount} chunks)${
        result.warning ? ` - ${result.warning}` : ''
      }`,
    );
  }
  if (failed > 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error(
    `Knowledge ingestion failed: ${error instanceof Error ? error.message : 'unknown error'}`,
  );
  process.exitCode = 1;
});
