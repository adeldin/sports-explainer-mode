// Seasonal content windows (RND-30). Each seasonal FAQ or Did You Know entry has a
// `from` (first day shown) and `until` (first day NOT shown), both 'YYYY-MM-DD',
// compared against the phone's own local date. Once `until` passes, the entry
// drops out on its own with no app update.

// Today's local date as 'YYYY-MM-DD'.
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// True when `today` is inside [from, until). 'YYYY-MM-DD' strings sort as dates.
export function inWindow(w: { from: string; until: string }, today: string = localDateKey()): boolean {
  return today >= w.from && today < w.until;
}
