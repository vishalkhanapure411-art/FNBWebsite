export enum IngredientUnit {
  KG = 'KG',
  G = 'G',
  L = 'L',
  ML = 'ML',
  PCS = 'PCS',
  PACK = 'PACK',
}

export enum ClosingPeriodStatus {
  OPEN = 'OPEN',
  LOCKED = 'LOCKED',
}
/** Recipe lifecycle: site-created recipes start PENDING and must be
 * APPROVED by the central Controls team before they are active. */
export enum RecipeStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
