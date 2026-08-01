import { subDays } from 'date-fns'
import { toDateKey } from '../lib/dates'
import { normalizeIngredientTags } from '../lib/ingredients'
import type { MealInput, MealItem, WeightInput } from '../types'
import { clearAllUserData, addMeal, addWeight } from './index'

type Totals = { calories: number; proteinG: number; carbsG: number; fatG: number }

/**
 * Preferred logging shape: description + whole-meal totals + ingredient tags.
 * No food-item calorie breakdown.
 */
function entry(
  daysAgo: number,
  mealType: MealInput['mealType'],
  description: string,
  totals: Totals,
  extras?: { note?: string; ingredients?: string[] },
): MealInput {
  return {
    date: toDateKey(subDays(new Date(), daysAgo)),
    mealType,
    description,
    items: [],
    ingredients: normalizeIngredientTags(extras?.ingredients ?? [description]),
    totalCalories: totals.calories,
    proteinG: totals.proteinG,
    carbsG: totals.carbsG,
    fatG: totals.fatG,
    note: extras?.note,
  }
}

/** Optional power-user path: itemized foods (kept as 1–2 demo rows only). */
function withItems(
  daysAgo: number,
  mealType: MealInput['mealType'],
  description: string,
  items: MealItem[],
  extras?: { note?: string; ingredients?: string[] },
): MealInput {
  const totalCalories = items.reduce((sum, i) => sum + i.calories, 0)
  const proteinG = items.reduce((sum, i) => sum + (i.proteinG ?? 0), 0)
  const carbsG = items.reduce((sum, i) => sum + (i.carbsG ?? 0), 0)
  const fatG = items.reduce((sum, i) => sum + (i.fatG ?? 0), 0)
  return {
    date: toDateKey(subDays(new Date(), daysAgo)),
    mealType,
    description,
    items,
    ingredients: normalizeIngredientTags(
      extras?.ingredients ?? [
        description,
        ...items.map((i) => i.name),
      ],
    ),
    totalCalories,
    proteinG,
    carbsG,
    fatG,
    note: extras?.note,
  }
}

function weight(daysAgo: number, weightKg: number): WeightInput {
  return { date: toDateKey(subDays(new Date(), daysAgo)), weightKg }
}

/**
 * Demo week shaped like the preferred UX:
 * - Most logs = description + plate totals + tags
 * - Some skipped breakfasts (for Insights)
 * - Multiple snacks / two lunch photos on one day
 * - One itemized snack as the optional breakdown example
 */
const SAMPLE_MEALS: MealInput[] = [
  // Today — skipped breakfast; two lunch photos; snacks
  entry(0, 'lunch', 'Chicken rice bowl', { calories: 580, proteinG: 40, carbsG: 62, fatG: 15 }, {
    note: 'Meal prep photo 1',
    ingredients: ['chicken', 'rice', 'vegetables'],
  }),
  entry(0, 'lunch', 'Side salad with olive oil', { calories: 120, proteinG: 3, carbsG: 8, fatG: 9 }, {
    note: 'Second photo',
    ingredients: ['salad', 'olive oil'],
  }),
  entry(0, 'dinner', 'Salmon with roasted vegetables', {
    calories: 620,
    proteinG: 42,
    carbsG: 28,
    fatG: 32,
  }, {
    ingredients: ['fish', 'vegetables', 'potato'],
  }),
  entry(0, 'snack', 'Greek yogurt', { calories: 140, proteinG: 15, carbsG: 10, fatG: 4 }, {
    ingredients: ['yogurt'],
  }),
  entry(0, 'snack', 'Apple', { calories: 95, proteinG: 0, carbsG: 25, fatG: 0 }, {
    ingredients: ['apple'],
  }),

  // Yesterday — full day
  entry(1, 'breakfast', 'Eggs on toast', { calories: 340, proteinG: 18, carbsG: 22, fatG: 20 }, {
    ingredients: ['egg', 'bread', 'butter'],
  }),
  entry(1, 'lunch', 'Tuna sandwich and crisps', {
    calories: 550,
    proteinG: 30,
    carbsG: 52,
    fatG: 24,
  }, {
    ingredients: ['fish', 'bread', 'chips'],
  }),
  entry(1, 'dinner', 'Chicken quinoa bowl', { calories: 640, proteinG: 45, carbsG: 55, fatG: 22 }, {
    ingredients: ['chicken', 'quinoa', 'vegetables'],
  }),
  entry(1, 'snack', 'Protein bar', { calories: 200, proteinG: 20, carbsG: 18, fatG: 7 }, {
    ingredients: ['protein bar'],
  }),

  // 2 days ago — skipped breakfast
  entry(2, 'lunch', 'Caesar salad with chicken', {
    calories: 480,
    proteinG: 35,
    carbsG: 18,
    fatG: 28,
  }, {
    ingredients: ['chicken', 'salad', 'cheese'],
  }),
  entry(2, 'dinner', 'Pasta bolognese', { calories: 720, proteinG: 32, carbsG: 78, fatG: 26 }, {
    ingredients: ['pasta', 'beef', 'tomato'],
  }),
  entry(2, 'snack', 'Banana', { calories: 105, proteinG: 1, carbsG: 27, fatG: 0 }, {
    ingredients: ['banana'],
  }),

  // 3 days ago
  entry(3, 'breakfast', 'Oatmeal with banana', { calories: 310, proteinG: 10, carbsG: 52, fatG: 7 }, {
    ingredients: ['oats', 'banana', 'milk'],
  }),
  entry(3, 'lunch', 'Sushi set', { calories: 510, proteinG: 28, carbsG: 68, fatG: 10 }, {
    ingredients: ['fish', 'rice'],
  }),
  entry(3, 'dinner', 'Vegetable stir-fry with tofu', {
    calories: 440,
    proteinG: 22,
    carbsG: 40,
    fatG: 20,
  }, {
    ingredients: ['vegetables', 'tofu', 'rice'],
  }),

  // 4 days ago — skipped dinner; itemized snack (optional path demo)
  entry(4, 'breakfast', 'Avocado toast', { calories: 320, proteinG: 8, carbsG: 30, fatG: 18 }, {
    ingredients: ['avocado', 'bread'],
  }),
  entry(4, 'lunch', 'Burrito bowl', { calories: 680, proteinG: 36, carbsG: 70, fatG: 26 }, {
    ingredients: ['chicken', 'rice', 'beans', 'avocado'],
  }),
  withItems(
    4,
    'snack',
    'Yogurt bowl',
    [
      { name: 'Greek yogurt', calories: 120, proteinG: 15, carbsG: 8, fatG: 4 },
      { name: 'Granola', calories: 160, proteinG: 4, carbsG: 24, fatG: 5 },
      { name: 'Blueberries', calories: 40, proteinG: 0, carbsG: 10, fatG: 0 },
    ],
    { note: 'Optional item breakdown example', ingredients: ['yogurt', 'granola', 'blueberry'] },
  ),

  // 5 days ago — chicken again (for “days with chicken”)
  entry(5, 'breakfast', 'Smoothie bowl', { calories: 340, proteinG: 12, carbsG: 55, fatG: 8 }, {
    ingredients: ['banana', 'berry', 'yogurt'],
  }),
  entry(5, 'lunch', 'Leftover chicken rice', { calories: 520, proteinG: 34, carbsG: 58, fatG: 14 }, {
    ingredients: ['chicken', 'rice'],
  }),
  entry(5, 'dinner', 'Pizza and side salad', { calories: 590, proteinG: 24, carbsG: 64, fatG: 25 }, {
    note: 'Friday night',
    ingredients: ['pizza', 'salad', 'cheese'],
  }),

  // 6 days ago — high-calorie day
  entry(6, 'breakfast', 'Pancakes with maple syrup', {
    calories: 450,
    proteinG: 10,
    carbsG: 70,
    fatG: 14,
  }, {
    ingredients: ['egg', 'milk'],
  }),
  entry(6, 'lunch', 'BBQ chicken wrap', { calories: 490, proteinG: 32, carbsG: 45, fatG: 18 }, {
    ingredients: ['chicken', 'bread'],
  }),
  entry(6, 'dinner', 'Steak with potatoes', { calories: 720, proteinG: 48, carbsG: 40, fatG: 35 }, {
    ingredients: ['beef', 'potato'],
  }),
  entry(6, 'snack', 'Dark chocolate', { calories: 150, proteinG: 2, carbsG: 14, fatG: 10 }, {
    ingredients: ['chocolate'],
  }),
]

const SAMPLE_WEIGHTS: WeightInput[] = [
  weight(42, 78.4),
  weight(35, 78.1),
  weight(28, 77.8),
  weight(21, 77.5),
  weight(14, 77.2),
  weight(7, 76.9),
  weight(3, 76.7),
  weight(0, 76.5),
]

/** Replace the signed-in user's meals/weights with demo data (cloud). */
export async function seedSampleData() {
  await clearAllUserData()
  for (const row of SAMPLE_MEALS) {
    await addMeal(row)
  }
  for (const row of SAMPLE_WEIGHTS) {
    await addWeight(row)
  }
}
