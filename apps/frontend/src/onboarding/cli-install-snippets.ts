import type { ClaudeCliOs } from '@sanji/shared';

export interface CliInstallSnippet {
  label: string;
  installCmd: string;
  postInstall: string;
  note?: string;
}

// Commands match what the Claude Code docs ship today; re-verify against
// https://docs.claude.com/en/docs/claude-code/setup before the PR lands.
export const CLI_INSTALL_SNIPPETS: Record<ClaudeCliOs, CliInstallSnippet> = {
  darwin: {
    label: 'macOS',
    installCmd: 'curl -fsSL https://claude.ai/install.sh | sh',
    postInstall: 'claude /login',
    note: 'Open a new terminal so PATH refreshes.',
  },
  linux: {
    label: 'Linux',
    installCmd: 'curl -fsSL https://claude.ai/install.sh | sh',
    postInstall: 'claude /login',
    note: 'Open a new terminal so PATH refreshes.',
  },
  win32: {
    label: 'Windows',
    installCmd: 'irm https://claude.ai/install.ps1 | iex',
    postInstall: 'claude /login',
    note: 'Run from PowerShell as your normal user.',
  },
};

export const CLI_DOCS_URL = 'https://docs.claude.com/en/docs/claude-code/setup';
