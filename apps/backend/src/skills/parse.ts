import matter from 'gray-matter';
import { z } from 'zod';

const FrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.string().regex(/^\/[A-Za-z0-9_-]+$/, 'trigger must start with / and be a slug'),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
});

export interface Skill {
  source: string;
  name: string;
  description: string;
  trigger: string;
  model?: string;
  tools?: string[];
  body: string;
}

export function parseSkill(source: string, raw: string): Skill {
  const parsed = matter(raw);
  const fm = FrontmatterSchema.parse(parsed.data);
  return {
    source,
    name: fm.name,
    description: fm.description ?? '',
    trigger: fm.trigger,
    model: fm.model,
    tools: fm.tools,
    body: parsed.content,
  };
}
