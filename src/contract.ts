export const ANNOTATION_SOURCE = 'annotations';
export const ANNOTATION_SERVICE_SYMBOL = Symbol.for('@songyanglin/dsh-annotations/service');
export const ANNOTATION_SERVICE_READY_EVENT = 'dsh-annotations:ready';
export const ANNOTATION_SERVICE_REQUEST_EVENT = 'dsh-annotations:request';

export interface AnnotationSource {
  readonly kind: string;
  readonly uri: string;
  readonly title: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface AnnotationAnchor {
  readonly quote: string;
  readonly start: number;
  readonly end: number;
  readonly prefix: string;
  readonly suffix: string;
  readonly contentHash: string;
}

export interface AnnotationDraft {
  readonly source: AnnotationSource;
  readonly anchor: AnnotationAnchor;
}

export interface Annotation extends AnnotationDraft {
  readonly id: string;
  comment: string;
}

export interface AnnotationSurfaceMatch {
  readonly root: HTMLElement;
  readonly source: AnnotationSource;
}

export interface AnnotationSurfaceAdapter {
  readonly id: string;
  match(target: Node): AnnotationSurfaceMatch | undefined;
}

export interface AnnotationService {
  registerSurface(adapter: AnnotationSurfaceAdapter): () => void;
  capture(draft: AnnotationDraft, anchor: DOMRect, bounds: DOMRect): void;
}

declare global {
  interface Window {
    [ANNOTATION_SERVICE_SYMBOL]?: AnnotationService;
  }
}

export function currentAnnotationService(): AnnotationService | undefined {
  return typeof window === 'undefined' ? undefined : window[ANNOTATION_SERVICE_SYMBOL];
}
