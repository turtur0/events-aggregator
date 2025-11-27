/**
 * Parses the categories query parameter from a URL.
 * Returns undefined if no categories provided, or an array of category strings.
 * 
 * @example parseCategoriesParam('?categories=music,theatre') => ['music', 'theatre']
 * @example parseCategoriesParam('?other=param') => undefined
 */
export default function parseCategoriesParam(url: string): string[] | undefined {
    const { searchParams } = new URL(url);
    const categoriesParam = searchParams.get('categories');

    return categoriesParam
        ? categoriesParam.split(',').filter(Boolean)
        : undefined;
}