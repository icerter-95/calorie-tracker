import type { MealItem } from '../types'

export function sumItemMacros(items: MealItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (Number(item.calories) || 0),
      proteinG: acc.proteinG + (Number(item.proteinG) || 0),
      carbsG: acc.carbsG + (Number(item.carbsG) || 0),
      fatG: acc.fatG + (Number(item.fatG) || 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  )
}

export function roundMacro(value: number) {
  return Math.round(value * 10) / 10
}
