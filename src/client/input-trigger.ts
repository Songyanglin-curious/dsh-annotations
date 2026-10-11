export interface InputOccurrence { readonly source: string; readonly ref: string; readonly offset: number; readonly length: number }
export interface InputSnapshot { readonly draft: string; readonly draftRev: number; readonly phase: string; readonly occurrences: readonly InputOccurrence[] }
export interface ScopedContext { bail(...args: unknown[]): unknown }

export interface InputTriggerSource {
  readonly trigger: '@'; readonly name: string; readonly order?: number; readonly showGroupTitle?: boolean;
  candidates(...args: unknown[]): Promise<readonly unknown[]>;
  onPick(...args: unknown[]): unknown;
  readonly codec?: { clipboardText(ref: string): string; serialize(ref: string, signal: AbortSignal): Promise<string> };
}

export interface TokenSpan { readonly start: number; readonly end: number; readonly draftRev: number }

export function detectEnd(draft: string, occurrences: readonly Pick<InputOccurrence, 'length'>[]): number {
  return draft.length - occurrences.reduce((hidden, occurrence) => hidden + occurrence.length - 1, 0);
}

export function detectOffset(occurrence: Pick<InputOccurrence, 'offset'>, occurrences: readonly Pick<InputOccurrence, 'offset' | 'length'>[]): number {
  return occurrence.offset - occurrences.filter(candidate => candidate.offset < occurrence.offset).reduce((hidden, candidate) => hidden + candidate.length - 1, 0);
}
