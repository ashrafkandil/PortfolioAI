/**
 * Lets any part of the page (e.g. a project card's "Listen" button) ask the
 * avatar to narrate text without threading callbacks through every view.
 */

const NARRATE_EVENT = 'avatar:narrate';

export function requestNarration(text: string): void {
  window.dispatchEvent(new CustomEvent<string>(NARRATE_EVENT, { detail: text }));
}

export function onNarrationRequest(handler: (text: string) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<string>).detail);
  window.addEventListener(NARRATE_EVENT, listener);
  return () => window.removeEventListener(NARRATE_EVENT, listener);
}
