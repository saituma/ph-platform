const progressByUrl = new Map<string, number>();
export const readIntroProgress = (url: string) => progressByUrl.get(url) ?? 0;
export function writeIntroProgress(url: string, seconds: number) { if (Number.isFinite(seconds) && seconds >= 0) progressByUrl.set(url, seconds); }
export const clearIntroProgress = (url: string) => progressByUrl.delete(url);
