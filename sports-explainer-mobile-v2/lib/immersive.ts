import { useSyncExternalStore } from 'react';

/**
 * Whether a full-screen landscape piece is open, as authoritative app state.
 *
 * Why this exists instead of `navigation.setOptions({ tabBarStyle: { display: 'none' } })`:
 * the tab navigator's `screenOptions` is an inline function that re-declares `tabBarStyle`
 * every time the navigator re-renders. A per-screen setOptions override is not durable
 * against that — one unrelated re-render (theme, app state, a parent update) and the bar
 * comes back while the user is still inside a landscape module.
 *
 * That is not cosmetic. The bar is surface-coloured, so over a dark field it is effectively
 * invisible; the Coach's Corner tab sits bottom-left, and its "tap the active tab → go to
 * root" listener pops the user out of the piece, which unmounts GameHost and restores
 * PORTRAIT. From the outside that reads as "it rotated back to portrait on its own and
 * dumped me on the list" — reported twice, and the setOptions fix did not hold.
 *
 * A store the navigator READS makes the hidden state survive any number of re-renders,
 * because it is an input to screenOptions rather than an override applied after it.
 */
let immersive = false;
const listeners = new Set<() => void>();

export function setImmersive(next: boolean) {
  if (immersive === next) return;
  immersive = next;
  listeners.forEach(l => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

function getSnapshot() { return immersive; }

export function useImmersive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
