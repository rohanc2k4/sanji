import { z } from 'zod';

export const NoteSchema = z.object({
  path: z.string(),
  mtimeMs: z.number(),
  body: z.string(),
  frontmatter: z.record(z.unknown()).nullable(),
  title: z.string().nullable(),
});
export type Note = z.infer<typeof NoteSchema>;

export const ChunkSchema = z.object({
  notePath: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  text: z.string(),
  startChar: z.number().int().nonnegative(),
  endChar: z.number().int().nonnegative(),
});
export type Chunk = z.infer<typeof ChunkSchema>;

export const WikilinkSchema = z.object({
  sourcePath: z.string(),
  targetSlug: z.string(),
  occurrenceCount: z.number().int().positive(),
});
export type Wikilink = z.infer<typeof WikilinkSchema>;
