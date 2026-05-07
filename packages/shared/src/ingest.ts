export type FileFormat = 'pdf' | 'docx' | 'txt' | 'paste';

export type ContentType =
  | 'paper'
  | 'slides'
  | 'transcript'
  | 'article'
  | 'assignment'
  | 'code'
  | 'other';

export interface NoteFrontmatter {
  title: string;
  source: string; // .sanji/originals/<basename> or "paste"
  ingested_on: string; // YYYY-MM-DD
  content_type: ContentType;
  summary: string;
  tags?: string[];
  original_format?: FileFormat;
  pages?: number;
}

export type IngestEventPhase = 'extract' | 'rewrite' | 'review' | 'write';

export type IngestEvent =
  | { kind: 'queued'; fileId: string; sourceName: string }
  | { kind: 'extracting'; fileId: string; sourceName: string }
  | { kind: 'rewriting'; fileId: string; sourceName: string; tokensInput?: number }
  | { kind: 'reviewing'; fileId: string; sourceName: string }
  | { kind: 'writing'; fileId: string; sourceName: string }
  | {
      kind: 'done';
      fileId: string;
      sourceName: string;
      outputPath: string;
      tokensInput: number;
      tokensOutput: number;
    }
  | {
      kind: 'skipped';
      fileId: string;
      sourceName: string;
      existingPath: string;
    }
  | {
      kind: 'error';
      fileId: string;
      sourceName: string;
      phase: IngestEventPhase;
      message: string;
    };

export interface IngestTextRequest {
  title: string;
  content: string;
  format_hint?: ContentType | 'paste';
}
