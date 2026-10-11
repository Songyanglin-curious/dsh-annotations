import type { AnnotationDraft } from '../contract.js';

let active: HTMLElement | undefined;

function positionNearSelection(element: HTMLElement, anchor: DOMRect) {
  const gap = 8, width = element.offsetWidth, height = element.offsetHeight;
  const preferredLeft = anchor.left + anchor.width / 2 - width / 2;
  const left = Math.max(gap, Math.min(preferredLeft, window.innerWidth - width - gap));
  const above = anchor.top - height - gap;
  const top = above >= gap ? above : Math.min(anchor.bottom + gap, window.innerHeight - height - gap);
  element.style.left = `${left}px`;
  element.style.top = `${Math.max(gap, top)}px`;
}

export function closePopover() { active?.remove(); active = undefined; }

export function openAnnotationPopover(anchor: DOMRect, bounds: DOMRect, draft: AnnotationDraft, add: (comment: string) => boolean) {
  closePopover();
  const menu = document.createElement('div'); menu.dataset.annotationsMenu = ''; menu.setAttribute('role', 'toolbar'); menu.setAttribute('aria-label', '选区操作');
  const quick = document.createElement('button'); quick.type = 'button'; quick.dataset.annotationsQuick = ''; quick.setAttribute('aria-label', '为选中文字添加批注');
  quick.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 2.5h11v8h-6l-3.5 3v-3H2.5z"/></svg><span>批注</span>';
  menu.appendChild(quick); document.body.appendChild(menu); active = menu;
  positionNearSelection(menu, anchor);
  quick.addEventListener('mousedown', event => event.preventDefault());
  quick.addEventListener('click', event => {
    event.stopPropagation();
    const form = document.createElement('form'); form.dataset.annotationsEditor = '';
    const quote = document.createElement('small'); quote.textContent = `“${draft.anchor.quote.replace(/\s+/g, ' ')}”`;
    const input = document.createElement('textarea'); input.placeholder = '写下你的批注…'; input.setAttribute('aria-label', '批注内容');
    const footer = document.createElement('footer');
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '取消';
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = '加入本轮'; submit.disabled = true;
    input.addEventListener('input', () => { submit.disabled = input.value.trim() === ''; });
    input.addEventListener('keydown', key => { if (key.key === 'Escape') { key.preventDefault(); closePopover(); } if (key.key === 'Enter' && !key.shiftKey && !key.isComposing) { key.preventDefault(); form.requestSubmit(); } });
    cancel.addEventListener('click', closePopover);
    form.addEventListener('submit', event2 => { event2.preventDefault(); if (input.value.trim() && add(input.value)) closePopover(); });
    footer.append(cancel, submit); form.append(quote, input, footer); menu.replaceWith(form); active = form;
    form.style.width = `${Math.max(220, Math.min(340, bounds.width - 16))}px`; positionNearSelection(form, anchor); input.focus();
  });
}
