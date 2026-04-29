// Shared slug helper — used at signup to derive a calculator URL from the
// business name. The same rules run client-side (preview) and server-side
// (when the Installer + CalculatorLink rows are created).

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
