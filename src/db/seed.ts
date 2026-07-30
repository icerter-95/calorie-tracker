import { subDays } from 'date-fns'
import { db } from './index'
import type { MealEntry, WeightEntry } from '../types'
import { toDateKey } from '../lib/dates'

function meal(
  daysAgo: number,
  mealType: MealEntry['mealType'],
  items: MealEntry['items'],
  note?: string,
): Omit<MealEntry, 'id'> {
  const date = toDateKey(subDays(new Date(), daysAgo))
  const totalCalories = items.reduce((sum, i) => sum + i.calories, 0)
  return {
    date,
    mealType,
    items,
    totalCalories,
    note,
    createdAt: subDays(new Date(), daysAgo).getTime(),
  }
}

function weight(daysAgo: number, weightKg: number): Omit<WeightEntry, 'id'> {
  const date = toDateKey(subDays(new Date(), daysAgo))
  return { date, weightKg, createdAt: subDays(new Date(), daysAgo).getTime() }
}

const SAMPLE_MEALS: Omit<MealEntry, 'id'>[] = [
  // Today
  meal(0, 'breakfast', [
    { name: 'Greek yogurt', calories: 120 },
    { name: 'Granola', calories: 180 },
    { name: 'Blueberries', calories: 60 },
  ]),
  meal(0, 'lunch', [
    { name: 'Chicken rice bowl', calories: 520 },
    { name: 'Side salad', calories: 80 },
  ], 'Meal prep'),
  meal(0, 'snack', [{ name: 'Apple', calories: 95 }]),

  // Yesterday
  meal(1, 'breakfast', [
    { name: 'Scrambled eggs (2)', calories: 180 },
    { name: 'Toast with butter', calories: 150 },
  ]),
  meal(1, 'lunch', [
    { name: 'Tuna sandwich', calories: 420 },
    { name: 'Crisps', calories: 130 },
  ]),
  meal(1, 'dinner', [
    { name: 'Salmon fillet', calories: 350 },
    { name: 'Roasted vegetables', calories: 120 },
    { name: 'Quinoa', calories: 180 },
  ]),
  meal(1, 'snack', [{ name: 'Protein bar', calories: 200 }]),

  // 2 days ago
  meal(2, 'breakfast', [{ name: 'Oatmeal with banana', calories: 310 }]),
  meal(2, 'lunch', [{ name: 'Caesar salad with chicken', calories: 480 }]),
  meal(2, 'dinner', [
    { name: 'Pasta bolognese', calories: 620 },
    { name: 'Garlic bread', calories: 180 },
  ]),

  // Rest of the week
  meal(3, 'breakfast', [{ name: 'Smoothie bowl', calories: 340 }]),
  meal(3, 'lunch', [{ name: 'Sushi set (12 pcs)', calories: 510 }]),
  meal(3, 'dinner', [{ name: 'Vegetable stir-fry with tofu', calories: 440 }]),

  meal(4, 'breakfast', [{ name: 'Croissant + coffee', calories: 290 }]),
  meal(4, 'lunch', [{ name: 'Burrito bowl', calories: 680 }]),
  meal(4, 'dinner', [{ name: 'Homemade soup + bread', calories: 390 }]),
  meal(4, 'snack', [{ name: 'Dark chocolate', calories: 120 }]),

  meal(5, 'breakfast', [{ name: 'Avocado toast', calories: 320 }]),
  meal(5, 'lunch', [{ name: 'Leftover pasta', calories: 550 }]),
  meal(5, 'dinner', [
    { name: 'Pizza (2 slices)', calories: 520 },
    { name: 'Side salad', calories: 70 },
  ], 'Friday night'),

  meal(6, 'breakfast', [{ name: 'Pancakes with maple syrup', calories: 450 }]),
  meal(6, 'lunch', [{ name: 'BBQ chicken wrap', calories: 490 }]),
  meal(6, 'dinner', [{ name: 'Steak with potatoes', calories: 720 }]),

  // Earlier in the month (sparse days)
  meal(8, 'breakfast', [{ name: 'Cereal with milk', calories: 250 }]),
  meal(8, 'lunch', [{ name: 'Club sandwich', calories: 560 }]),
  meal(8, 'dinner', [{ name: 'Thai green curry', calories: 580 }]),

  meal(10, 'breakfast', [{ name: 'Boiled eggs + toast', calories: 280 }]),
  meal(10, 'lunch', [{ name: 'Quinoa salad', calories: 410 }]),
  meal(10, 'dinner', [{ name: 'Fish and chips', calories: 890 }], 'Takeaway'),

  meal(12, 'breakfast', [{ name: 'Overnight oats', calories: 300 }]),
  meal(12, 'lunch', [{ name: 'Hummus wrap', calories: 380 }]),
  meal(12, 'dinner', [{ name: 'Roast chicken dinner', calories: 650 }]),

  meal(14, 'breakfast', [{ name: 'Bagel with cream cheese', calories: 340 }]),
  meal(14, 'lunch', [{ name: 'Pho soup', calories: 450 }]),
  meal(14, 'dinner', [{ name: 'Veggie burger + fries', calories: 780 }]),

  meal(18, 'breakfast', [{ name: 'Fruit salad', calories: 150 }]),
  meal(18, 'lunch', [{ name: 'Poke bowl', calories: 520 }]),
  meal(18, 'dinner', [{ name: 'Risotto', calories: 540 }]),

  meal(22, 'breakfast', [{ name: 'English breakfast (small)', calories: 480 }]),
  meal(22, 'lunch', [{ name: 'Soup + sandwich combo', calories: 620 }]),
  meal(22, 'dinner', [{ name: 'Lamb kebab plate', calories: 710 }]),

  meal(25, 'breakfast', [{ name: 'Protein shake', calories: 220 }]),
  meal(25, 'lunch', [{ name: 'Noodle box', calories: 590 }]),
  meal(25, 'dinner', [{ name: 'Grilled sea bass', calories: 400 }]),
]

const SAMPLE_WEIGHTS: Omit<WeightEntry, 'id'>[] = [
  weight(42, 78.4),
  weight(35, 78.1),
  weight(28, 77.8),
  weight(21, 77.5),
  weight(14, 77.2),
  weight(7, 76.9),
  weight(3, 76.7),
  weight(0, 76.5),
]

export async function seedSampleData() {
  await db.transaction('rw', db.meals, db.weights, async () => {
    await db.meals.clear()
    await db.weights.clear()
    await db.meals.bulkAdd(SAMPLE_MEALS)
    await db.weights.bulkAdd(SAMPLE_WEIGHTS)
  })
}

export async function seedIfEmpty() {
  const [mealCount, weightCount] = await Promise.all([
    db.meals.count(),
    db.weights.count(),
  ])
  if (mealCount === 0 && weightCount === 0) {
    await seedSampleData()
  }
}
