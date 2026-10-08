# Dough Calculator

A tiny single-page calculator for **Vito Iacopelli’s classic Neapolitan pizza dough**, scaled to your batch and scheduled around the moment you want pizza.

- **Flour-aware:** pick a flour profile — Vito's reference Neapolitan 00 (W 260–280), a strong 00 (W 290–330, e.g. METRO Chef 290–320) or weak all-purpose — and the calculator adjusts hydration and knead time, showing the exact specs and sources behind the profile.
- **Scale:** choose how many dough balls you want — everything is rescaled from Vito’s official recipe (25 % poolish, 24 h cold ferment, 62.5 % hydration on the reference flour).
- **Mixer-aware:** pick the **Autentico 700** (Vito’s mixer) or the **Revo Bake Titan Tilt 7.5 PRO** and get the exact speed settings for the mixing phase, matched by RPM. Batch-size warnings for the mixer’s minimum/maximum load are included.
- **Scheduled:** give a “pizza ready at” time and the page back-plans the whole process — when to make the poolish, when to mix (with speeds), when to ball, when to take the balls out of the fridge, when to preheat and when to bake. The plan is never clamped to “now”, so a poolish that is already fermenting keeps its place; past steps are dimmed and the next step is highlighted with “Next up”.

The default is Vito’s recipe for **4 balls**, ready in **2 days at 18:00** local time.

**Live:** https://dough-calculator.codeover.nl · preview: https://preview-dough-calculator.codeover.workers.dev

## How the schedule works

The recipe is a double-fermentation dough — 2–3 days on the reference flour, less on short-ferment flours (the windows follow the selected flour profile). The calculator works backwards from the “pizza ready at” moment:

| Offset before bake | Step |
| --- | --- |
| −3 h | Balls come out of the fridge (2–4 h warm-up window) |
| −24 h | Ball the dough into the cold ferment (stretchable to 48 h; profile-dependent) |
| −45 min | Mix block: mixing (15–20 min) + rest (5 min) + balling |
| −19 h | Make the poolish (window: 16–24 h in the fridge; profile-dependent) |

The plan is always back-planned from the exact finish time you pick — it is never clamped to the current time. So if the poolish is already fermenting from yesterday, it keeps its place in the timeline and you can read the exact times of the remaining steps. Past steps are dimmed and the next upcoming step gets a “Next up · in …” tag. A heads-up note appears when the schedule starts before now, in case you have not started yet and want to pick a later finish time.

## Flour profiles

“Tipo 00” is only a grind grade — strength (W) can range from ~200 to 400+, and the flour drives how much water the dough binds, how long it needs to knead, and how long it can ferment. The calculator therefore asks which flour you’re using:

| Profile | Calibrated for | Hydration | Knead | Poolish (fridge) | Cold ferment |
| --- | --- | --- | --- | --- | --- |
| Neapolitan 00 · W 260–280 | [Caputo Pizzeria “00”](https://www.mulinocaputo.it/en/prodotti/pizzeria/) (blue bag) — Vito’s reference | 62.5 % | 12–15 min | 16–24 h | 24 h (max 48) |
| Strong 00 · W 290–330 | [METRO Chef Pizza Meel 00 290–320 (5 kg)](https://producten.makro.nl/shop/pv/BTY-X811226/0032/0021/METRO-Chef-Pizza-Meel-00-290-320-5-kg) | 59 % | 15–18 min | 16–24 h | 24 h (max 48) |
| Aldi CUCINA 00 · W unpublished | [CUCINA Pizzabloem Tipo 00, 1 kg](https://www.aldi.nl/product/pizzabloem-1229636-1229636.html) | 58 % | 10–13 min | 8–16 h | 8 h (max 12) |
| Weak 00 / all-purpose · W ≤ 240 | supermarket “pizza flour” with no published W | 56 % | 10–12 min | 16–24 h | 24 h (max 48) |

The poolish always stays at 100 % hydration (its classic 1:1 ratio); the dough water absorbs the hydration adjustment. The **Flour card** in the app shows exactly which flour each profile is calibrated for, the specs we have for it, and links the sources:

- **Caputo Pizzeria:** W 260–280, protein 12.5 %, P/L 0.50–0.60 — [mulinocaputo.it](https://www.mulinocaputo.it/en/prodotti/pizzeria/).
- **METRO Chef 290–320:** W 290–320 (from the label’s legal name “MC per pizza 290/320 W”), protein 11 g/100 g (nutrition declaration — not directly comparable to Caputo’s mill spec), Italy, no additives listed, EAN 8026924054327 — [Makro product page](https://producten.makro.nl/shop/pv/BTY-X811226/0032/0021/METRO-Chef-Pizza-Meel-00-290-320-5-kg) and [METRO food-information sheet (PDF)](https://cdn.metro-group.com/nl/nl_fir_811184001001_nl.pdf).
- **Aldi CUCINA Pizzabloem:** Aldi publishes no specs. The profile leans on the German sister product “Cucina Pizzamehl Tipo 00” (same brand family, milled by Frießinger Mühle): ~11.5 g/100 g protein, no W published, 55–62 % recommended hydration and a 6–24 h rise window — hence the shortened poolish + cold ferment. Sources: [Aldi NL](https://www.aldi.nl/product/pizzabloem-1229636-1229636.html), [Aldi Nord (DE)](https://www.aldi-nord.de/produkt/pizzamehl-1035065.html), [PizzaPlan flour catalogue](https://pizzaplan.app/nl/pizzameel/) (values sourced from aldi-sued.de), [OpenFoodFacts scan](https://world.openfoodfacts.org/product/4061464949645).
- **Weak 00 / all-purpose:** no spec sheet — the app says so and shows typical ranges instead.

## Mixer speed mapping

The two machines are matched by actual spiral RPM, not by dial numbers:

| Phase | Autentico 700 (dial ≈ rpm) | Revo Bake Titan Tilt 7.5 PRO (level ≈ rpm) |
| --- | --- | --- |
| Incorporate poolish + flour | Dial 1 (≈ 42 rpm) | Level 1 (≈ 45 rpm) |
| Add water in doses | Dial 2–3 (≈ 58–75 rpm) | Level 2 (≈ 85 rpm) |
| Knead 12–15 min | Dial 4–5 (≈ 91–108 rpm) | Level 3 (≈ 125 rpm) |

Sources: the Autentico instruction manual (spiral 42–190 rpm, bowl 8–36 rpm) and the official Revo speed chart (levels 1–11 = 45/85/125/164/202/240/278/316/355/392/420 rpm ± 10 % under load).

> On the Revo, pizza dough only ever needs levels 1–3; level 4 is the ceiling for very wet doughs. Levels 5–11 are faster than Vito’s mixer goes for dough — never use them for this recipe.

## Tech

- **[TanStack Start](https://tanstack.com/start)** with **SolidJS** (`@tanstack/solid-start`, file-based routing).
- Static **prerendering** enabled — pages are generated at build time; a Cloudflare Worker serves them (SSR still available).
- Deployed to **Cloudflare Workers** with `wrangler`, fully declarative in [`wrangler.jsonc`](./wrangler.jsonc): TanStack Start server entry, custom domain (`dough-calculator.codeover.nl` — DNS record and certificate are provisioned automatically on deploy), `workers.dev` URL and version preview URLs.

```jsonc
{
  "name": "dough-calculator",
  "main": "@tanstack/solid-start/server-entry",
  "workers_dev": true,
  "preview_urls": true,
  "routes": [{ "pattern": "dough-calculator.codeover.nl", "custom_domain": true }]
}
```

## Commands

```bash
pnpm dev             # local dev server on :3000
pnpm build           # prerendered build (client assets + Worker bundle)
pnpm deploy:prod     # build + deploy to production (applies routes/custom domain)
pnpm deploy:preview  # build + upload a version with the `preview` alias
```

> (`pnpm deploy` is reserved by pnpm itself — use `pnpm deploy:prod`.)
>
> Production: https://dough-calculator.codeover.nl · Workers URL: https://dough-calculator.codeover.workers.dev · Preview: https://preview-dough-calculator.codeover.workers.dev

## Recipe & data sources

- Recipe: [Autentico — “Autentico’s Classic Neapolitan Pizza Dough Recipe”](https://autenti.co/blogs/recipes/autentico-s-classic-neapolitan-pizza-dough-recipe) (Vito Iacopelli’s official machine recipe).
- Mixer specs: [Autentico 700 product page](https://autenti.co/products/autentico-700-spiral-dough-mixer) and its instruction manual (model 10 MO VV: spiral 42 ÷ 190 rpm, tank 8 ÷ 36 rpm).
- Your machine: [Revo Bake Titan Tilt 7.5 PRO support page](https://revobake.com/pages/revo-bake-titan-tilt-7-5-pro) — official speed chart and user manual.

Nothing you enter leaves the browser — all calculations are client-side.
