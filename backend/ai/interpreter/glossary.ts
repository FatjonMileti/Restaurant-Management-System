import { getDB } from '../../config/rxdb.js';
import { getOrCreateRestaurantSettings } from '../../graphql/helpers/formatters.js';
import type { GlossaryEntry, RestaurantGlossary } from './types.js';

const MAX_DESCRIPTION_CHARS = 180;

const safeText = (value: unknown, maxChars: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars - 1)}…` : trimmed;
};

/**
 * Load official restaurant terminology for the translation prompt.
 *
 * Only stored terminology fields are included: restaurant name, item name,
 * category and a truncated description. Prices, availability, dietary and
 * allergen facts are deliberately excluded so the model cannot state or infer
 * them; a database failure degrades to an empty glossary rather than blocking
 * translation.
 */
export const loadRestaurantGlossary = async (maxItems: number): Promise<RestaurantGlossary> => {
  let restaurantName = '';
  let unavailable = false;

  try {
    const settings = await getOrCreateRestaurantSettings();
    restaurantName = safeText(settings?.name, 120) ?? '';
  } catch {
    unavailable = true;
    console.warn('Waiter interpreter glossary: restaurant settings could not be read.');
  }

  const entries: GlossaryEntry[] = [];
  if (maxItems > 0) {
    try {
      const db = await getDB();
      const docs = await db.menuItems.find().exec();
      for (const doc of docs) {
        const item = typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
        const term = safeText(item?.name, 120);
        if (!term) continue;
        entries.push({
          term,
          category: safeText(item.category, 60),
          description: safeText(item.description, MAX_DESCRIPTION_CHARS),
        });
        if (entries.length >= maxItems) break;
      }
    } catch {
      unavailable = true;
      console.warn('Waiter interpreter glossary: menu data could not be read.');
    }
  }

  return { restaurantName, entries, ...(unavailable ? { unavailable: true } : {}) };
};
