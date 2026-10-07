/**
 * Flour profiles for Vito Iacopelli's Neapolitan dough.
 *
 * "Tipo 00" only says how finely the flour is milled — the strength behind it
 * varies wildly (W ≈ 200–400). What actually changes the recipe:
 *
 *  - W (alveographic strength): how much kneading/fermentation the dough takes.
 *  - Protein & absorption: how much water the flour binds → hydration.
 *
 * Each profile below carries the exact flour it was calibrated for, the data
 * we actually have for it, and the adjustments to Vito's reference recipe.
 */

export type FlourId = 'neapolitan' | 'strong' | 'aldi' | 'weak'

export interface FlourSpec {
  label: string
  value: string
}

export interface FlourSource {
  label: string
  url: string
}

export interface FlourProfile {
  id: FlourId
  /** Select label — strength first, because that's what drives the adjustments. */
  name: string
  /** The concrete flour(s) this profile is calibrated for. */
  example: string
  blurb: string
  /** Total hydration of the final dough (% of total flour weight). */
  hydrationPct: number
  /** Kneading window for this flour, shown in the schedule and procedure. */
  kneadMinutes: string
  /** Chip text for the mix block in the schedule. */
  mixChip: string
  /** Cold ferment of the balls, hours. Vito's default is 24. */
  coldFermentH: number
  /** How far the cold ferment can be stretched, hours. */
  coldFermentMaxH: number
  /** Poolish window in the fridge, hours. */
  poolishMinH: number
  poolishIdealH: number
  poolishMaxH: number
  /** Label used for the flour rows in the ingredients list. */
  ingredientLabel: string
  /** What changed vs Vito's reference recipe, in plain language. */
  adjustments: string[]
  /** The specs we actually have for this flour. */
  specs: FlourSpec[]
  /** Where the specs come from. Empty = no published spec sheet. */
  sources: FlourSource[]
  /** Caution shown as a banner in the flour card. */
  warning?: string
}

export const FLOURS: Record<FlourId, FlourProfile> = {
  neapolitan: {
    id: 'neapolitan',
    name: 'Neapolitan 00 · W 260–280',
    example: 'Caputo Pizzeria “00” (blue bag)',
    blurb: 'Vito’s reference flour: balanced, extensible dough for classic Neapolitan pizza.',
    hydrationPct: 62.5,
    kneadMinutes: '12–15 min',
    mixChip: '≈ 15–20 min mixing',
    coldFermentH: 24,
    coldFermentMaxH: 48,
    poolishMinH: 16,
    poolishIdealH: 19,
    poolishMaxH: 24,
    ingredientLabel: 'Tipo 00 flour',
    adjustments: ['None — this is Vito’s original recipe (62.5 % hydration · 12–15 min knead).'],
    specs: [
      { label: 'Type', value: 'Farina 00 (soft wheat)' },
      { label: 'W (strength)', value: '260–280' },
      { label: 'Protein', value: '12.5 % (mill spec)' },
      { label: 'P/L (balance)', value: '0.50–0.60' },
      { label: 'Origin', value: 'Naples, Italy — Antimo Caputo mill' },
    ],
    sources: [
      {
        label: 'Mulino Caputo — Pizzeria 1 kg product page',
        url: 'https://www.mulinocaputo.it/en/prodotti/pizzeria/',
      },
    ],
  },

  strong: {
    id: 'strong',
    name: 'Strong 00 · W 290–330',
    example: 'METRO Chef Pizza Meel 00 290–320, 5 kg (Makro)',
    blurb: 'Extra-elastic high-W flour: needs longer kneading and a little less water.',
    hydrationPct: 59,
    kneadMinutes: '15–18 min',
    mixChip: '≈ 18–24 min mixing',
    coldFermentH: 24,
    coldFermentMaxH: 48,
    poolishMinH: 16,
    poolishIdealH: 19,
    poolishMaxH: 24,
    ingredientLabel: 'Tipo 00 flour',
    adjustments: [
      'Hydration trimmed 62.5 % → 59 %: its 11 g/100 g nutrition protein binds less water than Caputo’s 12.5 %.',
      'Knead 12–15 → 15–18 min: a W 290–320 dough takes longer to become smooth and elastic.',
      'Schedule unchanged — the extra strength easily handles the 16–24 h poolish + 24–48 h cold ferment.',
    ],
    specs: [
      { label: 'Type', value: 'Farina di grano tenero tipo 00' },
      {
        label: 'W (strength)',
        value:
          '290–320 (from the official label: “FARINA DI GRANO TENERO TIPO ‘00’ — MC per pizza 290/320 W”)',
      },
      {
        label: 'Protein',
        value:
          '11 g / 100 g (nutrition declaration — not directly comparable to Caputo’s 12.5 % mill spec)',
      },
      { label: 'P/L (balance)', value: 'Not published' },
      {
        label: 'Origin & maker',
        value: 'Italy — METRO Italia S.p.A. (private label; the mill isn’t disclosed)',
      },
      { label: 'Additives', value: 'None listed — ingredients: wheat flour only' },
      { label: 'EAN', value: '8026924054327' },
    ],
    sources: [
      {
        label: 'Makro product page',
        url: 'https://producten.makro.nl/shop/pv/BTY-X811226/0032/0021/METRO-Chef-Pizza-Meel-00-290-320-5-kg',
      },
      {
        label: 'METRO food-information sheet (PDF)',
        url: 'https://cdn.metro-group.com/nl/nl_fir_811184001001_nl.pdf',
      },
    ],
  },

  aldi: {
    id: 'aldi',
    name: 'Aldi CUCINA 00 · W unpublished',
    example: 'CUCINA Pizzabloem Tipo 00, 1 kg (Aldi NL)',
    blurb: 'Short-ferment supermarket flour: less water, less kneading, and a plan inside its 6–24 h rise window.',
    hydrationPct: 58,
    kneadMinutes: '10–13 min',
    mixChip: '≈ 13–18 min mixing',
    coldFermentH: 8,
    coldFermentMaxH: 12,
    poolishMinH: 8,
    poolishIdealH: 12,
    poolishMaxH: 16,
    ingredientLabel: 'Tipo 00 flour',
    adjustments: [
      'Hydration trimmed 62.5 % → 58 %: ~11.5 g/100 g protein binds less water; the published range is 55–62 %.',
      'Knead 12–15 → 10–13 min: weaker gluten needs less work and handles over-kneading worse.',
      'Plan shortened: poolish 16–24 h → 8–16 h and cold ferment 24 h → 8 h (max 12 h), because the published rise window for this flour is only 6–24 h.',
    ],
    specs: [
      { label: 'Type', value: 'Tipo 00' },
      { label: 'W (strength)', value: 'Not published by Aldi' },
      {
        label: 'Protein',
        value:
          '~11.5 g / 100 g — from the German sister product “Cucina Pizzamehl Tipo 00” (same brand and recipe family)',
      },
      { label: 'P/L (balance)', value: 'Not published' },
      { label: 'Recommended hydration', value: '55–62 % (sister product, via aldi-sued.de)' },
      { label: 'Rise window', value: '6–24 h (sister product, via aldi-sued.de)' },
      { label: 'Ingredients', value: 'Wheat flour; may contain traces of soy, lupine and sesame' },
      { label: 'Pack claims', value: 'Tipo 00 · “Italian inspired” · Nutri-Score A' },
      {
        label: 'Origin & mill',
        value: 'Not disclosed by Aldi — the sister product is milled by Frießinger Mühle (Germany)',
      },
      { label: 'Price', value: '€1.29 / kg at Aldi NL (offer 05.10–11.10; €0.99 in Germany)' },
    ],
    sources: [
      {
        label: 'Aldi NL product page',
        url: 'https://www.aldi.nl/product/pizzabloem-1229636-1229636.html',
      },
      {
        label: 'Aldi Nord (DE) product page',
        url: 'https://www.aldi-nord.de/produkt/pizzamehl-1035065.html',
      },
      {
        label: 'PizzaPlan flour catalogue (values sourced from aldi-sued.de)',
        url: 'https://pizzaplan.app/nl/pizzameel/',
      },
      {
        label: 'OpenFoodFacts scan of the sister product',
        url: 'https://world.openfoodfacts.org/product/4061464949645',
      },
    ],
    warning:
      'Aldi publishes no W or protein for this flour, so the profile leans on the German sister product. Treat it as a short-ferment flour: if the dough looks slack, drop hydration 1–2 % or cut the cold ferment shorter.',
  },

  weak: {
    id: 'weak',
    name: 'Weak 00 / all-purpose · W ≤ 240',
    example: 'Supermarket “pizza flour” with no W on the bag',
    blurb: 'Lower-strength flour: less water, shorter kneading, and watch the long ferment.',
    hydrationPct: 56,
    kneadMinutes: '10–12 min',
    mixChip: '≈ 12–16 min mixing',
    coldFermentH: 24,
    coldFermentMaxH: 48,
    poolishMinH: 16,
    poolishIdealH: 19,
    poolishMaxH: 24,
    ingredientLabel: 'Flour',
    adjustments: [
      'Hydration trimmed 62.5 % → 56 %: weaker gluten turns slack sooner, so the dough needs less water.',
      'Knead 12–15 → 10–12 min: less strength means less kneading is needed (and it damages faster).',
    ],
    specs: [
      { label: 'W (strength)', value: 'Typically ≲ 240 — rarely published on the bag' },
      { label: 'Protein', value: 'Roughly 9–11 g / 100 g (typical range, not exact)' },
      { label: 'P/L (balance)', value: 'Not published' },
    ],
    sources: [],
    warning:
      'Weak gluten may not survive the 16–24 h poolish + 24–48 h cold ferment — check the dough early and shorten the cold ferment (≤ 24 h) if it looks slack or sticky.',
  },
}

export const FLOUR_LIST: Array<FlourProfile> = [
  FLOURS.neapolitan,
  FLOURS.strong,
  FLOURS.aldi,
  FLOURS.weak,
]
