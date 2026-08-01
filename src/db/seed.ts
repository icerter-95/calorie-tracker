import { subDays } from 'date-fns'
import { toDateKey } from '../lib/dates'
import type { MealInput, MealItem, WeightInput } from '../types'
import { clearAllUserData, addMeal, addWeight } from './index'

function meal(
  daysAgo: number,
  mealType: MealInput['mealType'],
  items: MealItem[],
  extras?: { description?: string; note?: string },
): MealInput {
  const date = toDateKey(subDays(new Date(), daysAgo))
  const totalCalories = items.reduce((sum, i) => sum + i.calories, 0)
  const proteinG = items.reduce((sum, i) => sum + (i.proteinG ?? 0), 0)
  const carbsG = items.reduce((sum, i) => sum + (i.carbsG ?? 0), 0)
  const fatG = items.reduce((sum, i) => sum + (i.fatG ?? 0), 0)
  return {
    date,
    mealType,
    description: extras?.description,
    items,
    totalCalories,
    proteinG,
    carbsG,
    fatG,
    note: extras?.note,
  }
}

function plate(
  daysAgo: number,
  mealType: MealInput['mealType'],
  description: string,
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number },
  note?: string,
): MealInput {
  return {
    date: toDateKey(subDays(new Date(), daysAgo)),
    mealType,
    description,
    items: [],
    totalCalories: totals.calories,
    proteinG: totals.proteinG,
    carbsG: totals.carbsG,
    fatG: totals.fatG,
    note,
  }
}

function weight(daysAgo: number, weightKg: number): WeightInput {
  return { date: toDateKey(subDays(new Date(), daysAgo)), weightKg }
}

const SAMPLE_MEALS: MealInput[] = [
  meal(0, 'breakfast', [
    { name: 'Greek yogurt', calories: 120, proteinG: 15, carbsG: 8, fatG: 4 },
    { name: 'Granola', calories: 180, proteinG: 5, carbsG: 28, fatG: 6 },
    { name: 'Blueberries', calories: 60, proteinG: 1, carbsG: 14, fatG: 0 },
  ]),
  plate(0, 'lunch', 'Chicken rice bowl', { calories: 600, proteinG: 42, carbsG: 65, fatG: 16 }, 'Meal prep'),
  meal(0, 'snack', [{ name: 'Apple', calories: 95, proteinG: 0, carbsG: 25, fatG: 0 }]),

  meal(1, 'breakfast', [
    { name: 'Scrambled eggs (2)', calories: 180, proteinG: 12, carbsG: 2, fatG: 14 },
    { name: 'Toast with butter', calories: 150, proteinG: 4, carbsG: 18, fatG: 7 },
  ]),
  meal(1, 'lunch', [
    { name: 'Tuna sandwich', calories: 420, proteinG: 28, carbsG: 38, fatG: 16 },
    { name: 'Crisps', calories: 130, proteinG: 2, carbsG: 14, fatG: 8 },
  ]),
  meal(1, 'dinner', [
    { name: 'Salmon fillet', calories: 350, proteinG: 34, carbsG: 0, fatG: 22 },
    { name: 'Roasted vegetables', calories: 120, proteinG: 3, carbsG: 18, fatG: 4 },
    { name: 'Quinoa', calories: 180, proteinG: 6, carbsG: 32, fatG: 3 },
  ]),
  meal(1, 'snack', [{ name: 'Protein bar', calories: 200, proteinG: 20, carbsG: 18, fatG: 7 }]),

  plate(2, 'breakfast', 'Oatmeal with banana', { calories: 310, proteinG: 10, carbsG: 52, fatG: 7 }),
  plate(2, 'lunch', 'Caesar salad with chicken', { calories: 480, proteinG: 35, carbsG: 18, fatG: 28 }),
  meal(2, 'dinner', [
    { name: 'Pasta bolognese', calories: 620, proteinG: 28, carbsG: 72, fatG: 22 },
    { name: 'Garlic bread', calories: 180, proteinG: 5, carbsG: 24, fatG: 7 },
  ]),

  plate(3, 'breakfast', 'Smoothie bowl', { calories: 340, proteinG: 12, carbsG: 55, fatG: 8 }),
  plate(3, 'lunch', 'Sushi set (12 pcs)', { calories: 510, proteinG: 28, carbsG: 68, fatG: 10 }),
  plate(3, 'dinner', 'Vegetable stir-fry with tofu', { calories: 440, proteinG: 22, carbsG: 40, fatG: 20 }),

  plate(4, 'breakfast', 'Croissant + coffee', { calories: 290, proteinG: 6, carbsG: 32, fatG: 15 }),
  plate(4, 'lunch', 'Burrito bowl', { calories: 680, proteinG: 36, carbsG: 70, fatG: 26 }),
  plate(4, 'dinner', 'Homemade soup + bread', { calories: 390, proteinG: 14, carbsG: 48, fatG: 14 }),
  meal(4, 'snack', [{ name: 'Dark chocolate', calories: 120, proteinG: 2, carbsG: 10, fatG: 8 }]),

  plate(5, 'breakfast', 'Avocado toast', { calories: 320, proteinG: 8, carbsG: 30, fatG: 18 }),
  plate(5, 'lunch', 'Leftover pasta', { calories: 550, proteinG: 20, carbsG: 68, fatG: 18 }),
  meal(
    5,
    'dinner',
    [
      { name: 'Pizza (2 slices)', calories: 520, proteinG: 22, carbsG: 56, fatG: 22 },
      { name: 'Side salad', calories: 70, proteinG: 2, carbsG: 8, fatG: 3 },
    ],
    { note: 'Friday night' },
  ),

  plate(6, 'breakfast', 'Pancakes with maple syrup', { calories: 450, proteinG: 10, carbsG: 70, fatG: 14 }),
  plate(6, 'lunch', 'BBQ chicken wrap', { calories: 490, proteinG: 32, carbsG: 45, fatG: 18 }),
  plate(6, 'dinner', 'Steak with potatoes', { calories: 720, proteinG: 48, carbsG: 40, fatG: 35 }),
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
  for (const entry of SAMPLE_MEALS) {
    await addMeal(entry)
  }
  for (const entry of SAMPLE_WEIGHTS) {
    await addWeight(entry)
  }
}
