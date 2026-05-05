import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StepProps } from './VaultStep';

export function TavilyStep({ state, dispatch }: StepProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="tavily-key" className="text-xs">
          Tavily API key
        </Label>
        <Input
          id="tavily-key"
          type="password"
          value={state.tavilyKey}
          onChange={(e) => dispatch({ type: 'set-tavily', key: e.target.value })}
          placeholder="tvly-…"
          className="font-mono text-xs"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Tavily powers <span className="font-mono text-foreground/80">/research</span> web grounding. Skip if you only
        want vault-grounded answers.
      </p>
    </div>
  );
}
