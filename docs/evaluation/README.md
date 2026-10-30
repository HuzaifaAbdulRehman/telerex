# Six fictional memories

These are real local Gemma runs from 30 October 2026, not UI fixtures. Each of six stories had five facts written before inference in [memories.ts](../../fixtures/memories.ts). The engine made 36 calls: three rounds on each of two paths. Every recorded case is included.

Gemma 3 1B, Q4_K_M, ran on CPU through Ollama 0.40.0 on a 16 GB laptop. The exact model digest, prompts, settings, outputs and token counts are in [runs/](runs/). The inference engine was commit `ffc6e2d`; later UI and documentation work did not change those prompts.

Both paths used temperature 0, seed 42, context 2,048, output budget 256 tokens and a target of 70 words. Chain reads its previous output; source reads the unchanged original. Calls alternate chain/source each round. This is a descriptive experiment with one recorded run per case, no statistical test, no model comparison and no claim about human memory.

## Measured results

Counts below mean **literal tracked phrases present in the final output, out of five**. They do not measure factual correctness.

| Story | Six-call time | Chain words / phrases | Source words / phrases |
| --- | ---: | ---: | ---: |
| [Blue tin](runs/blue-tin.json) | 48.2 s | 54 / 3 | 76 / 5 |
| [Cancelled train](runs/cancelled-train.json) | 54.6 s | 59 / 3 | 78 / 3 |
| [Recipe envelope](runs/recipe-envelope.json) | 61.9 s | 54 / 4 | 78 / 4 |
| [Two brothers](runs/two-brothers.json) | 50.4 s | 55 / 5 | 64 / 5 |
| [Lantern year](runs/lantern-year.json) | 49.3 s | 50 / 5 | 61 / 4 |
| [Quiet Saturday](runs/quiet-saturday.json) | 47.1 s | 56 / 3 | 62 / 3 |

Across the 36 calls, wall latency ranged from 5.418 to 14.777 seconds, with a median of 8.134 seconds. Outputs contained 50–79 whitespace-separated words. No call reached its token limit. The separate cold [feasibility call](feasibility.json), made before building the UI, took 15.919 seconds; it is excluded from this table.

Five of six cases produced different first outputs despite identical source text, prompts and explicit settings. Fixed seeds and temperature did not guarantee identical text in this runtime. The cause was not isolated. Later differences cannot be attributed solely to the two input paths; model/runtime variation and different output lengths also matter.

## Reading the final outputs against the facts

This is a qualitative review by the assistant that built the prototype, not an independent human review or a factual scoring model. Every prewritten fact is addressed below for both round-three outputs. “Omitted” means the output does not state the fact; it does not mean the opposite is true. Partial retention and contradictions are described separately. There is no aggregate truth score.

### The blue biscuit tin

| Prewritten fact | Chain, round 3 | Source, round 3 |
| --- | --- | --- |
| Initial memory: 1998 | Keeps 1998. | Keeps 1998. |
| Buttons, not biscuits | Contents omitted. | Keeps spare buttons; biscuit contrast omitted. |
| Crescent-shaped lid dent | Keeps lid dent; crescent shape omitted. | Keeps lid dent; crescent shape omitted. |
| Given to narrator's younger sister | Changes recipient to Mariam's “her sister”; younger relationship omitted. | Says “her younger sister”, also attaching the sister to Mariam rather than the narrator. |
| Morning or previous evening uncertain | Uncertainty omitted. | Says “recollection is unclear”; the two possible times are omitted. |

Both also change Haris wanting to discard the tin into having discarded it. Source retains all five tracked phrases while making this error. Chain calls the tin “undamaged” while retaining a dent.

### The train we never took

| Prewritten fact | Chain, round 3 | Source, round 3 |
| --- | --- | --- |
| 12 August 2004 | Keeps date as “August 12, 2004”. | Same preserved date, different format. |
| Cancelled, not delayed | “A train cancellation”; no claim of delay. | “A train cancellation”; no claim of delay. |
| No other train and no Lahore visit | Keeps no Lahore visit and says cancellation prevented travel; other-train detail is not explicit. | Explicitly keeps both. |
| Aunt Saira, green minibus, home | Keeps Saira/minibus and home journey. | Keeps Saira/minibus and home journey. |
| Bilal kept unused tickets in exercise book | Changes to an unused “school ticket”; exercise book omitted. | Keeps unused ticket in school exercise book, changing plural tickets to singular. |

Chain adds a missing-ticket recollection. Source claims the ticket remains in the book, although the original only confirmed it the following winter and says the book's present location is unknown. It also attributes Bilal's “best part” opinion to the narrator. Both miss the literal date phrase despite preserving the date's meaning.

### A recipe on an envelope

| Prewritten fact | Chain, round 3 | Source, round 3 |
| --- | --- | --- |
| Three teaspoons, not tablespoons | Keeps both amount and contrast. | Keeps both amount and contrast. |
| Oil rather than butter | Keeps both. | Keeps both. |
| Oven temperature missing/unknown | Says temperature not specified. | Says temperature absent and corner torn off. |
| 1987 tentative, not confirmed | Asserts recipe “from 1987”; uncertainty lost. | Asserts Safiya wrote it in 1987 despite noting unreadable date; tentative recollection becomes definite. |
| Father added twenty-minute rest, not Safiya | Keeps rest duration and a father as author, but changes narrator's father to Safiya's father. | Likewise changes the family relationship to “Her father”. |

Both say the recipe remains blank when copied, broadening the original's single blank temperature space. Literal matching misses “twenty minutes” when the model writes “twenty-minute”.

### Who held the camera

| Prewritten fact | Chain, round 3 | Source, round 3 |
| --- | --- | --- |
| Adil older brother, in photo | Keeps Adil in photo; older relationship omitted. | Same. |
| Sami younger brother, photographer | Puts Sami in photo; younger relationship and photographer role omitted. | Puts Sami in photo and gives him the camera case, which the narrator held. |
| Nadeem lent camera, absent | Changes “lent” to “gave”; absence omitted. | Keeps lending; does not clearly preserve Nadeem's absence. |
| June 2010, outside old Multan house | Keeps date, previous home and Multan. | Keeps date and Multan house; “old” omitted. |
| Yellow bicycle borrowed, not birthday gift | Keeps yellow and borrowed; birthday contrast omitted. | Keeps borrowed; colour and birthday contrast omitted. |

Both final outputs contain every tracked phrase. Neither clearly identifies Sami as the photographer. The original says Sami later reminded the narrator of the roles; chain instead says Sami does not know them. These observations are why a phrase tracker cannot stand in for factual review.

### The year of the lantern

| Prewritten fact | Chain, round 3 | Source, round 3 |
| --- | --- | --- |
| Year uncertain: 1986 or 1987 | Keeps alternatives and an unknown date. | Keeps alternatives and both recorded years. |
| Kitchen floor, away from curtains | Placement omitted. | Placement omitted. |
| Nobody injured, no house fire | Keeps no injuries and an undamaged house. | Same. |
| Neighbour bringing matches uncertain | Keeps uncertain neighbour involvement; matches omitted. | Keeps uncertain match involvement. |
| Album date deliberately left unknown | Keeps unknown date but omits deliberate album decision. | Omits the album decision and “unknown”; keeps both years recorded. |

Chain has more literal phrases here, five versus four. Source is not uniformly better even by this limited measurement.

### A quiet Saturday

| Prewritten fact | Chain, round 3 | Source, round 3 |
| --- | --- | --- |
| Noor and father, Saturdays | Keeps both people and weekly day. | Same. |
| Leave nine, return before lunch | Both times omitted. | Both times omitted. |
| Noor borrows animal book and storybook | Keeps two book types; “received” replaces borrowing and individual borrower is less clear. | Keeps two book types; “they” replaces Noor as borrower. |
| Father does not take newspaper home | Non-removal detail omitted; receiving a paper does not establish taking it home. | Non-removal detail omitted; borrowing a paper does not establish taking it home. |
| Four bread rolls, cash | Keeps four rolls; cash omitted. | Same. |

## Reproduce and inspect

Run `npm run evaluate` with local Ollama ready. Existing completed runs with matching story, model digest and settings are preserved. To record a fresh set without overwriting this evidence, move the six JSON files to a separate local folder first. Model or prompt changes need a new evaluation record; these results do not validate them.

Read each JSON's `prewrittenFacts`, `result.original` and round-three `stages` together. The raw records include every intermediate output, so readers can disagree with this review and trace where a change first appeared. No paid inference service was used; electricity and hardware costs were not measured.
