export type MixerId = 'autentico' | 'revo'

export interface MixerPhase {
  setting: string
  rpm: string
  what: string
}

export interface Mixer {
  id: MixerId
  name: string
  maker: string
  blurb: string
  hookRange: string
  bowlRange: string
  phases: {
    incorporate: MixerPhase
    water: MixerPhase
    knead: MixerPhase & { minutes: string }
  }
  notes: string[]
  limits: {
    minFlourG?: number
    maxFlourG?: number
    minDoughG?: number
    maxDoughG?: number
  }
  sourceUrl: string
}

export const MIXERS: Record<MixerId, Mixer> = {
  autentico: {
    id: 'autentico',
    name: 'Autentico 700',
    maker: 'Vito Iacopelli’s mixer',
    blurb: 'Stepless dial 1–10 · hook 42–190 rpm · bowl 8–36 rpm',
    hookRange: '42–190 rpm',
    bowlRange: '8–36 rpm',
    phases: {
      incorporate: {
        setting: 'Dial 1',
        rpm: '≈ 42 rpm',
        what: 'Work the poolish into the flour',
      },
      water: {
        setting: 'Dial 2–3',
        rpm: '≈ 58–75 rpm',
        what: 'Add the ice water in 100 g doses',
      },
      knead: {
        setting: 'Dial 4–5',
        rpm: '≈ 91–108 rpm',
        what: 'Knead until a smooth “pumpkin”',
        minutes: '12–15 min',
      },
    },
    notes: [
      'These are Vito’s own settings from the official recipe.',
      'Autentico’s guidance: 55–65 % hydration doughs stay at dial 1–5.',
      'Never mix past ~20–25 min total — the gluten starts to fail.',
      'The dial is stepless (inverter), so the exact rpm is approximate.',
    ],
    limits: { minDoughG: 700, maxDoughG: 4400 },
    sourceUrl:
      'https://autenti.co/blogs/recipes/autentico-s-classic-neapolitan-pizza-dough-recipe',
  },
  revo: {
    id: 'revo',
    name: 'Revo Bake Titan Tilt 7.5 PRO',
    maker: 'your mixer',
    blurb: 'Levels 1–11 · hook 45–420 rpm · bowl ratio 1:14',
    hookRange: '45–420 rpm',
    bowlRange: '≈ 3–30 rpm',
    phases: {
      incorporate: {
        setting: 'Level 1',
        rpm: '≈ 45 rpm',
        what: 'Work the poolish into the flour',
      },
      water: {
        setting: 'Level 2',
        rpm: '≈ 85 rpm',
        what: 'Add the ice water in 100 g doses',
      },
      knead: {
        setting: 'Level 3',
        rpm: '≈ 125 rpm',
        what: 'Knead until a smooth “pumpkin”',
        minutes: '12–15 min',
      },
    },
    notes: [
      'Official speed chart: levels 1–11 ≈ 45 / 85 / 125 / 164 / 202 / 240 / 278 / 316 / 355 / 392 / 420 rpm (±10 % under load).',
      'Matches Vito’s settings by rpm: dial 1 (≈42) → Level 1 · dial 2–3 (≈58–75) → Level 2 · dial 4–5 (≈91–108) → Level 3.',
      'For dough you only need levels 1–3; level 4 is the ceiling for very wet doughs. Levels 5–11 are faster than Vito’s mixer goes for dough — never use them here.',
      'Watch the on-screen dough temperature: target 23–26 °C when the dough is done.',
    ],
    limits: { minFlourG: 750, maxFlourG: 3000, maxDoughG: 4800 },
    sourceUrl: 'https://revobake.com/pages/revo-bake-titan-tilt-7-5-pro',
  },
}

export const MIXER_LIST: Array<Mixer> = [MIXERS.autentico, MIXERS.revo]
