/** Normalize free-form AI / user ingredient tags into stable lowercase tags. */

const SYNONYMS: Record<string, string> = {
  // chicken
  'fried chicken': 'chicken',
  'grilled chicken': 'chicken',
  'chicken breast': 'chicken',
  'chicken thigh': 'chicken',
  'chicken thighs': 'chicken',
  'roast chicken': 'chicken',
  'rotisserie chicken': 'chicken',
  'chicken wing': 'chicken',
  'chicken wings': 'chicken',
  pollo: 'chicken',
  // beef
  steak: 'beef',
  'ground beef': 'beef',
  mince: 'beef',
  burger: 'beef',
  // pork
  bacon: 'pork',
  ham: 'pork',
  sausage: 'pork',
  // fish / seafood
  salmon: 'fish',
  tuna: 'fish',
  cod: 'fish',
  shrimp: 'shrimp',
  prawn: 'shrimp',
  prawns: 'shrimp',
  // egg
  eggs: 'egg',
  'scrambled eggs': 'egg',
  omelette: 'egg',
  omelet: 'egg',
  // dairy
  'greek yogurt': 'yogurt',
  yoghurt: 'yogurt',
  'greek yoghurt': 'yogurt',
  milk: 'milk',
  cheese: 'cheese',
  butter: 'butter',
  // carbs
  'white rice': 'rice',
  'brown rice': 'rice',
  basmati: 'rice',
  pasta: 'pasta',
  spaghetti: 'pasta',
  noodles: 'noodles',
  bread: 'bread',
  toast: 'bread',
  potato: 'potato',
  potatoes: 'potato',
  'mashed potatoes': 'potato',
  fries: 'potato',
  'sweet potato': 'sweet potato',
  oatmeal: 'oats',
  oats: 'oats',
  granola: 'granola',
  quinoa: 'quinoa',
  // produce
  tomato: 'tomato',
  tomatoes: 'tomato',
  lettuce: 'lettuce',
  salad: 'salad',
  'mixed salad': 'salad',
  avocado: 'avocado',
  banana: 'banana',
  apple: 'apple',
  blueberries: 'blueberry',
  blueberry: 'blueberry',
  berries: 'berry',
  broccoli: 'broccoli',
  spinach: 'spinach',
  vegetable: 'vegetables',
  vegetables: 'vegetables',
  'roasted vegetables': 'vegetables',
  // other
  'protein bar': 'protein bar',
  crisps: 'chips',
  chips: 'chips',
}

/** Cooking aids / seasonings / pantry staples — not useful as meal tags. */
const MINOR_INGREDIENTS = new Set([
  'oil',
  'olive oil',
  'vegetable oil',
  'canola oil',
  'sunflower oil',
  'coconut oil',
  'sesame oil',
  'cooking oil',
  'salt',
  'pepper',
  'black pepper',
  'white pepper',
  'flour',
  'wheat flour',
  'sugar',
  'brown sugar',
  'spice',
  'spices',
  'seasoning',
  'seasonings',
  'herb',
  'herbs',
  'vinegar',
  'soy sauce',
  'water',
  'stock',
  'broth',
  'bouillon',
  'garlic',
  'garlic powder',
  'onion powder',
  'paprika',
  'cumin',
  'oregano',
  'basil',
  'thyme',
  'cinnamon',
  'chili powder',
  'margarine',
  'shortening',
  'baking powder',
  'baking soda',
  'cornstarch',
])

function basicNormalize(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[_/]+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Map one raw tag to a canonical ingredient tag (or null if empty / minor). */
export function normalizeIngredientTag(raw: string): string | null {
  const base = basicNormalize(raw)
  if (!base) return null

  let tag: string | null = null
  if (SYNONYMS[base]) {
    tag = SYNONYMS[base]
  } else {
    // Phrase contains a known synonym key (longest match first)
    const keys = Object.keys(SYNONYMS).sort((a, b) => b.length - a.length)
    for (const key of keys) {
      if (base === key || base.includes(key)) {
        tag = SYNONYMS[key]
        break
      }
    }
    if (!tag) tag = base
  }

  // Drop ultra-generic noise and minor pantry / seasoning tags
  if (
    ['food', 'meal', 'plate', 'dish', 'sauce', 'gravy'].includes(tag) ||
    MINOR_INGREDIENTS.has(tag) ||
    MINOR_INGREDIENTS.has(base)
  ) {
    return null
  }

  return tag
}

/** Normalize a list; dedupe; cap length. */
export function normalizeIngredientTags(raw: string[], max = 6): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const tag = normalizeIngredientTag(item)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    out.push(tag)
    if (out.length >= max) break
  }
  return out
}

/** Build text used to suggest tags from an existing meal. */
export function mealTextForTagSuggestion(meal: {
  description?: string
  items: { name: string }[]
  note?: string
}): string {
  const parts: string[] = []
  if (meal.description?.trim()) parts.push(meal.description.trim())
  for (const item of meal.items) {
    if (item.name?.trim()) parts.push(item.name.trim())
  }
  if (meal.note?.trim()) parts.push(meal.note.trim())
  return parts.join(', ')
}
