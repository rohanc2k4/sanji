import type { ChatTool } from '@sanji/shared';
import type { Tool, ToolContext } from './types.js';

export class Registry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  toChatTools(): ChatTool[] {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
  }

  filter(names: readonly string[]): ChatTool[] {
    return this.toChatTools().filter((t) => names.includes(t.name));
  }

  async run(name: string, input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) return `error: tool '${name}' not registered`;
    try {
      return await tool.run(input, ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return `error: ${message}`;
    }
  }
}
