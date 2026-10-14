/**
 * Ingredient prices for the cost calculator.
 *
 * Real shelf prices, VAT included, checked 12 October 2026 at Dirk van den
 * Broek, Makro (Amsterdam), Aldi and Albert Heijn. Supermarket prices move all
 * the time, so these are defaults: every price is editable in the UI.
 *
 * Sauce and mozzarella are pickers; extra toppings are toggleable rows with
 * a grams-per-pizza default. To add a product: add its id to the union
 * (SauceId / MozzarellaId / ToppingId) and an entry to SAUCES / MOZZARELLAS /
 * TOPPINGS — it shows up in the UI in definition order. Use the pack price
 * from the shop and let `perKg` be derived from it, so the note and the maths
 * stay honest.
 */

import { formatG, type Ingredients } from './recipe'
import type { FlourId } from './flours'

export type Store = 'Dirk' | 'Makro' | 'Aldi' | 'AH'

export interface PriceSource {
  /** Product as sold. */
  product: string
  /** Pack as sold, e.g. '380 g jar'. */
  pack: string
  /** Where it was priced. */
  store: Store
  /** Price per kg in €, VAT included. */
  perKg: number
  /** Product page the price was read from. */
  url: string
  /** Pack price and any promo caveat. */
  note: string
}

/* ------------------------------------------------------------------ */
/* Flour — follows the selected flour profile                          */
/* ------------------------------------------------------------------ */

export const FLOUR_PRICES: Record<FlourId, PriceSource> = {
  neapolitan: {
    product: 'Caputo Pizzeria “00” (blue bag)',
    pack: '25 kg sack',
    store: 'Makro',
    perKg: 30.51 / 25,
    url: 'https://producten.makro.nl/shop/pv/BTY-X820645/0032/0021/CAPUTO-Farina-tipo-00-Pizzeria-25-kg',
    note: '€30.51 per 25 kg sack (limited stock)',
  },
  strong: {
    product: 'METRO Chef Pizza Meel 00 290–320',
    pack: '5 kg bag',
    store: 'Makro',
    perKg: 7.84 / 5,
    url: 'https://producten.makro.nl/shop/pv/BTY-X811226/0032/0021/METRO-Chef-Pizza-Meel-00-290-320-5-kg',
    note: 'Regular €7.84 per 5 kg — on offer at €6.66 right now',
  },
  aldi: {
    product: 'CUCINA Pizzabloem Tipo 00',
    pack: '1 kg',
    store: 'Aldi',
    perKg: 1.29,
    url: 'https://www.aldi.nl/product/pizzabloem-1229636-1229636.html',
    note: '€1.29 per 1 kg (while stocks last)',
  },
  weak: {
    product: '1 de Beste Patentbloem',
    pack: '1 kg',
    store: 'Dirk',
    perKg: 0.81,
    url: 'https://www.dirk.nl/boodschappen/voorraadkast/bakproducten-suiker/1-de-beste-patentbloem/99272',
    note: '€0.81 per 1 kg',
  },
}

/* ------------------------------------------------------------------ */
/* Pantry — fixed products                                             */
/* ------------------------------------------------------------------ */

export type PantryId = 'salt' | 'yeast' | 'honey'

export const PANTRY_PRICES: Record<PantryId, PriceSource> = {
  salt: {
    product: 'Jozo Zout fijn zonder jodium',
    pack: '1 kg',
    store: 'Dirk',
    perKg: 0.99,
    url: 'https://www.dirk.nl/boodschappen/voorraadkast/kruiden-specerijen/jozo%20zout%20fijn%20zonder%20jodium/78474',
    note: '€0.99 per 1 kg',
  },
  yeast: {
    product: 'Dr. Oetker Gist',
    pack: '21 g box',
    store: 'Dirk',
    perKg: 0.93 / 0.021,
    url: 'https://www.dirk.nl/boodschappen/voorraadkast/bakproducten-suiker/dr%20oetker%20gist/9020',
    note: '€0.93 per 21 g box (3 × 7 g)',
  },
  honey: {
    product: '1 de Beste Honing vloeibaar',
    pack: '350 g',
    store: 'Dirk',
    perKg: 1.55 / 0.35,
    url: 'https://www.dirk.nl/boodschappen/brood-beleg-koek/broodbeleg/1%20de%20beste%20honing%20vloeibaar/49807',
    note: '€1.55 per 350 g bottle',
  },
}

/* ------------------------------------------------------------------ */
/* Sauce — selectable                                                  */
/* ------------------------------------------------------------------ */

export type SauceId =
  | 'cirio'
  | 'mutti-aromatica-210'
  | 'mutti-aromatica-388'
  | 'mutti-classica-400'
  | 'mutti-makro-400'
  | 'mutti-classica-4-1kg'
  | 'mutti-aromatizzata-4-2kg'

export interface SauceOption extends PriceSource {
  id: SauceId
}

export const SAUCES: Record<SauceId, SauceOption> = {
  cirio: {
    id: 'cirio',
    product: 'Cirio Pizzasaus',
    pack: '380 g jar',
    store: 'Dirk',
    perKg: 1.89 / 0.38,
    url: 'https://www.dirk.nl/boodschappen/voorraadkast/pasta-pasta-sauzen/cirio-pizzasaus/90952',
    note: '€1.89 per 380 g jar',
  },
  'mutti-aromatica-210': {
    id: 'mutti-aromatica-210',
    product: 'Mutti Pizzasaus aromatica',
    pack: '210 g jar',
    store: 'AH',
    perKg: 1.99 / 0.21,
    url: 'https://www.ah.nl/producten/product/wi509883/mutti-pizzasaus-aromatica',
    note: '€1.99 per 210 g jar',
  },
  'mutti-aromatica-388': {
    id: 'mutti-aromatica-388',
    product: 'Mutti Pizzasaus aromatica',
    pack: '388 ml jar',
    store: 'AH',
    perKg: 2.49 / 0.388,
    url: 'https://www.ah.nl/producten/product/wi234871/mutti-pizzasaus-aromatica',
    note: '€2.49 per 388 ml jar',
  },
  'mutti-classica-400': {
    id: 'mutti-classica-400',
    product: 'Mutti Pizzasaus classica',
    pack: '400 g tin',
    store: 'AH',
    perKg: 2.49 / 0.4,
    url: 'https://www.ah.nl/producten/product/wi493118/mutti-pizzasaus-classica',
    note: '€2.49 per 400 g tin',
  },
  'mutti-makro-400': {
    id: 'mutti-makro-400',
    product: 'Mutti Pizzasaus aromatizzata',
    pack: '400 g tin',
    store: 'Makro',
    perKg: 2.61 / 0.4,
    url: 'https://producten.makro.nl/shop/pv/BTY-X681143/0032/0021/Mutti-Pizzasaus-400-g',
    note: '€2.61 incl. btw (offer; €2.21 per tin at 6+)',
  },
  'mutti-classica-4-1kg': {
    id: 'mutti-classica-4-1kg',
    product: 'Mutti Pizzasaus classica',
    pack: '4.1 kg tin',
    store: 'Makro',
    perKg: 14.38 / 4.1,
    url: 'https://producten.makro.nl/shop/pv/BTY-X661138/0032/0021/Mutti-Pizzasaus-classica-4-1-kg',
    note: '€14.38 incl. btw (offer; €12.22 per tin at 6+)',
  },
  'mutti-aromatizzata-4-2kg': {
    id: 'mutti-aromatizzata-4-2kg',
    product: 'Mutti Pizzasaus aromatizzata',
    pack: '4.2 kg tin',
    store: 'Makro',
    perKg: 14.27 / 4.2,
    url: 'https://producten.makro.nl/shop/pv/BTY-X661139/0032/0021/Mutti-Pizzasaus-aromatizzata-4-2-kg',
    note: '€14.27 incl. btw (offer; €12.13 per tin at 6+)',
  },
}

export const SAUCE_LIST: SauceOption[] = Object.values(SAUCES)

/* ------------------------------------------------------------------ */
/* Mozzarella — selectable                                             */
/* ------------------------------------------------------------------ */

export type MozzarellaId =
  | 'aro-stick'
  | 'metro-stick'
  | 'aldi-cucina-nobile'
  | 'ah-mozzarella'
  | 'ah-italiaanse'

export interface MozzarellaOption extends PriceSource {
  id: MozzarellaId
}

export const MOZZARELLAS: Record<MozzarellaId, MozzarellaOption> = {
  'aro-stick': {
    id: 'aro-stick',
    product: 'aro Mozzarella Bread (stick)',
    pack: '1 kg',
    store: 'Makro',
    perKg: 9.54,
    url: 'https://producten.makro.nl/shop/pv/BTY-X710758/0032/0021/aro-Mozzarella-Bread-1-kg-*',
    note: '€9.54 per 1 kg stick',
  },
  'metro-stick': {
    id: 'metro-stick',
    product: 'METRO Chef Mozzarella Bread (stick)',
    pack: '1 kg',
    store: 'Makro',
    perKg: 9.8,
    url: 'https://producten.makro.nl/shop/pv/BTY-X817049/0032/0021/METRO-Chef-Mozzarella-Bread-1-kg',
    note: '€9.80 per 1 kg stick',
  },
  'aldi-cucina-nobile': {
    id: 'aldi-cucina-nobile',
    product: 'Cucina Nobile Mozzarella',
    pack: '125 g',
    store: 'Aldi',
    perKg: 0.87 / 0.125,
    url: 'https://www.aldi.nl/product/mozzarella-1221380.html',
    note: '€0.87 per 125 g pack',
  },
  'ah-mozzarella': {
    id: 'ah-mozzarella',
    product: 'AH Mozzarella',
    pack: '200 g',
    store: 'AH',
    perKg: 0.87 / 0.2,
    url: 'https://www.ah.nl/producten/product/wi506235/ah-mozzarella',
    note: '€0.87 per 200 g pack',
  },
  'ah-italiaanse': {
    id: 'ah-italiaanse',
    product: 'AH Italiaanse mozzarella',
    pack: '228 g',
    store: 'AH',
    perKg: 1.69 / 0.228,
    url: 'https://www.ah.nl/producten/product/wi195370/ah-italiaanse-mozzarella',
    note: '€1.69 per 228 g pack',
  },
}

export const MOZZARELLA_LIST: MozzarellaOption[] = Object.values(MOZZARELLAS)

/* ------------------------------------------------------------------ */
/* Extra toppings — toggleable, priced per pizza                       */
/* ------------------------------------------------------------------ */

export type ToppingId = 'parmigiano' | 'salsiccia' | 'pesto-genovese' | 'pesto-rosso'

export interface ToppingOption extends PriceSource {
  id: ToppingId
  /** Compact name for the topping rows and price inputs. */
  short: string
  /** Default grams per pizza when enabled. */
  defaultG: number
  /** Counted by default — the everyday grating. */
  defaultOn: boolean
}

export const TOPPINGS: Record<ToppingId, ToppingOption> = {
  parmigiano: {
    id: 'parmigiano',
    product: 'Parmigiano Reggiano',
    short: 'Parmigiano',
    pack: '200 g',
    store: 'Aldi',
    perKg: 4.99 / 0.2,
    url: 'https://www.aldi.nl/product/parmigiano-reggiano-1226167.html',
    note: '€4.99 per 200 g block (CUCINA, D.O.P., 24 months)',
    defaultG: 5,
    defaultOn: true,
  },
  salsiccia: {
    id: 'salsiccia',
    product: 'Salsiccia piccante stagionata',
    short: 'Salsiccia',
    pack: '250 g (2 stuks)',
    store: 'Aldi',
    perKg: 3.49 / 0.25,
    url: 'https://www.aldi.nl/product/salsiccia-piccante-stagionata-1233901-1233901.html',
    note: '€3.49 per 250 g (CUCINA, while stocks last)',
    defaultG: 50,
    defaultOn: false,
  },
  'pesto-genovese': {
    id: 'pesto-genovese',
    product: 'Pesto alla genovese',
    short: 'Pesto genovese',
    pack: '190 g jar',
    store: 'Aldi',
    perKg: 1.13 / 0.19,
    url: 'https://www.aldi.nl/product/pesto-alla-genovese-1234733.html',
    note: '€1.13 per 190 g jar (CUCINA)',
    defaultG: 20,
    defaultOn: false,
  },
  'pesto-rosso': {
    id: 'pesto-rosso',
    product: 'Pesto rosso',
    short: 'Pesto rosso',
    pack: '190 g jar',
    store: 'Aldi',
    perKg: 1.13 / 0.19,
    url: 'https://www.aldi.nl/product/pesto-rosso-1234732.html',
    note: '€1.13 per 190 g jar (CUCINA)',
    defaultG: 20,
    defaultOn: false,
  },
}

export const TOPPING_LIST: ToppingOption[] = Object.values(TOPPINGS)

/* ------------------------------------------------------------------ */
/* Per-pizza defaults & gas                                            */
/* ------------------------------------------------------------------ */

/** Topping defaults for one ~30 cm Neapolitan pizza. */
export const SAUCE_PER_PIZZA_G = 80
export const MOZZARELLA_PER_PIZZA_G = 80

/** Oven-gas defaults: average Dutch m³ price and a typical home bake. */
export const GAS_DEFAULTS = { perM3: 1.68, perBakeM3: 0.3 }

/* ------------------------------------------------------------------ */
/* Breakdown                                                           */
/* ------------------------------------------------------------------ */

export interface CostLine {
  label: string
  amountText: string
  unitPriceText: string
  cost: number
}

export interface CostBreakdown {
  lines: CostLine[]
  doughTotal: number
  toppingTotal: number
  extrasTotal: number
  gasTotal: number
  total: number
  perPizza: number
}

const sum = (lines: CostLine[]) => lines.reduce((acc, l) => acc + l.cost, 0)

function line(kind: string, src: PriceSource, amountG: number, perKg: number): CostLine {
  return {
    label: `${kind} — ${src.product} · ${src.pack}, ${src.store}`,
    amountText: `${formatG(amountG)} g`,
    unitPriceText: `${formatEuro(perKg)}/kg`,
    cost: (amountG / 1000) * perKg,
  }
}

export function buildCosts(input: {
  ing: Ingredients
  flourId: FlourId
  sauceId: SauceId
  mozzarellaId: MozzarellaId
  saucePerPizzaG: number
  mozzarellaPerPizzaG: number
  flourPerKg: number
  pantryPerKg: Record<PantryId, number>
  saucePerKg: number
  mozzarellaPerKg: number
  /** Enabled extra toppings, in display order. */
  toppings: Array<{ id: ToppingId; gramsPerPizza: number }>
  toppingPerKg: Record<ToppingId, number>
  /** Omitted when gas is not counted. */
  gas?: { perM3: number; perBakeM3: number }
}): CostBreakdown {
  const { ing } = input
  const doughLines = [
    line('Flour', FLOUR_PRICES[input.flourId], ing.totalFlourG, input.flourPerKg),
    line('Salt', PANTRY_PRICES.salt, ing.saltG, input.pantryPerKg.salt),
    line('Dry yeast', PANTRY_PRICES.yeast, ing.yeastG, input.pantryPerKg.yeast),
    line('Honey', PANTRY_PRICES.honey, ing.honeyG, input.pantryPerKg.honey),
  ]
  const toppingLines = [
    line(
      'Sauce',
      SAUCES[input.sauceId],
      input.saucePerPizzaG * ing.balls,
      input.saucePerKg,
    ),
    line(
      'Mozzarella',
      MOZZARELLAS[input.mozzarellaId],
      input.mozzarellaPerPizzaG * ing.balls,
      input.mozzarellaPerKg,
    ),
  ]
  const extraLines = input.toppings.map(({ id, gramsPerPizza }) =>
    line('Extra', TOPPINGS[id], gramsPerPizza * ing.balls, input.toppingPerKg[id]),
  )

  const lines = [...doughLines, ...toppingLines, ...extraLines]
  let gasTotal = 0
  if (input.gas) {
    gasTotal = input.gas.perM3 * input.gas.perBakeM3
    lines.push({
      label: 'Oven gas',
      amountText: `${input.gas.perBakeM3.toFixed(2)} m³ per bake`,
      unitPriceText: `${formatEuro(input.gas.perM3)}/m³`,
      cost: gasTotal,
    })
  }

  const doughTotal = sum(doughLines)
  const toppingTotal = sum(toppingLines)
  const extrasTotal = sum(extraLines)
  const total = doughTotal + toppingTotal + extrasTotal + gasTotal
  return {
    lines,
    doughTotal,
    toppingTotal,
    extrasTotal,
    gasTotal,
    total,
    perPizza: total / ing.balls,
  }
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function formatEuro(v: number): string {
  return `€${v.toFixed(2)}`
}
