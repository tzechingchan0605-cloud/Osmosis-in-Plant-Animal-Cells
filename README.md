# Osmosis Lab / 滲透實驗室

A responsive English / Traditional Chinese osmosis simulator for Hong Kong F.4 biology. It is a static website: no backend, account, API key, external font or build step is needed.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

The development server listens on port 3000. Set `PORT` to use another port. The application also works with an ordinary static web server; serve this repository's root. Open it through HTTP rather than double-clicking `index.html`, because it uses JavaScript modules.

## Publish for students

The code can be served directly by GitHub Pages. In the repository's **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/ (root)**, and save. GitHub provides the public website address once deployment completes. No GitHub Actions workflow or compilation is required. This repository does not automatically enable or publish Pages.

All application asset paths are relative, so the simulator works under a repository subpath as well as at a domain root. The stylesheet and the complete JavaScript module graph use a shared release query in the HTML import map, preventing stale cached scripts from mixing an old notebook renderer with new table headings. Update every release query together when publishing further code changes.

## Classroom activities

### Core lab

1. Choose a plant cell or a nucleated animal cell.
2. Change either sucrose concentration or solution water potential. The linked field and schematic particle density update automatically.
3. Predict the net movement of water, then start, pause or resume the simulation. Starting or resuming scrolls to the observation diagram; reduced-motion preferences use an immediate scroll.
4. Compare the starting and final cells at the same drawing scale, and read the three-point conclusion.
5. Replace a shrunken plant cell's solution with distilled water to observe recovery. This retains the existing cell; Reset restores the original cell.
6. Use the notebook to compare up to 12 completed trials in the current browser session. It records the initial cell water potential between the cell and solution columns, alongside the initial solution potential. Hypotonic solution labels, solution potentials and inward movement are green; hypertonic labels, solution potentials and outward movement are red.

Playback is fixed at **0.5×** in the core lab and extension, with no speed selector. Pausing immediately displays **解釋你的觀察結果 / Explain your observations** for the current cell state; final conclusions and notebook records appear when a trial completes.

The top-right language control translates controls, diagrams, feedback and saved notebook entries while preserving the current experiment.

The starting plant membrane is flush with the cell wall. During plasmolysis, its four rounded corners retain contact with the wall while the sides bow inward. The vacuole becomes smaller and gradually shifts toward the right membrane, while the nucleus moves nearer the centre. Their boundaries remain separate throughout the transition. The wall has a slight illustrated inward bow; its movement is much smaller than the membrane's retraction. This is the attachment pattern chosen for the teaching diagram; real attachment patterns can vary.

The main animal-cell diagram has a nucleus and uses **burst / 爆裂**, with release of cytoplasm. **Haemolysis / 溶血** is specific to RBCs. The extension retains anucleate RBCs. Both main cell types have stationary pink cytoplasm dots, separate from the moving blue water and yellow sucrose particles. Exactly two green chloroplasts remain within the plant cytoplasm, outside its vacuole, and move inward as the cell plasmolyses. The chloroplast drawings have no internal line.

As the cell becomes turgid (硬脹), the wall bows slightly outward and the membrane stays against its inner surface. The vacuole enlarges visibly to fill most of the cell and pushes the nucleus into a pocket of cytoplasm at the side, with a visible gap between nucleus and vacuole. The nucleus remains within the membrane throughout the animation.

Water molecules keep their identities and move across the membrane from around the whole cell. Equal inward and outward exchanges continue in the starting view and at equilibrium; during osmosis, additional transfers change the amount of water inside. Starting, pausing and changing language preserve the particles. Resetting or changing the experiment prepares a fresh population. Leader lines have horizontal ends beside their labels.

Water-dot density is reduced by approximately 25% for clarity. At equilibrium all water dots use the same schematic speed, with at most two simultaneous matched inward/outward pairs. The matched molecules cross together without changing the total amount of water inside. The core diagram shows blue water and yellow sucrose particles; the small grey internal-solute dots are omitted.

Both diagrams show the cell and solution water potentials in single-line labels, with the cell label above the vacuole. The title and value use a colon, for example **細胞水勢：−750.0kPa**. Solution labels fit within a compact box. Cell labels automatically fit the upper cytoplasm, leaving clearance from the membrane, vacuole, nucleus and chloroplasts. A narrow upper band of cytoplasm remains visible as the vacuole expands. The higher displayed value is green, the lower is red, and equal values at equilibrium are black. The reference stays at its initial values; both live potentials change as water is exchanged with the finite bath, and meet at equilibrium. Water leaving the cell dilutes the solution and raises its water potential; water entering the cell concentrates the solution and lowers its potential. Extension labels use the actual kPa values of cells A and B. Water dots turn dark blue for **0.5 seconds of active real time** on membrane contact; pausing freezes this effect. During net osmosis, extra transfers make the net direction visible in both plant and animal cells. Inward paths reach the vacuole in turgid plant cells. During this intake, net incoming water dots keep the same size as all other water molecules and are fully coloured, and travel for longer so that multiple incoming molecules remain clearly visible before equilibrium; they retain their original identities and the half-second dark-blue membrane-contact effect. In fresh turgid plant diagrams, schematic water-dot occupancy increases as the vacuole enlarges, giving a clear group of incoming molecules as the vacuole enlarges. These dot counts are qualitative; the numerical water volumes and potentials continue to follow the conserved-water model. Incoming molecules cross the membrane earlier in their route, then continue visibly into the vacuole.

After the animal cell swells, its membrane opens at two sites, following the teacher's textbook reference. Pink cytoplasm fills both openings and connects continuously to the sprays, which grow gradually; the remaining cell body and nucleus stay visible. The existing water dots then redistribute continuously across the shared solution, with the same colour and similar density in the former cell region and outside. Released cell solutes mix with the surrounding solution. There is no separately enclosed cell potential after rupture, so its intracellular label disappears.

Result headings define hypotonic, isotonic and hypertonic solutions by comparing solute concentration with the cell interior. The science guide repeats these definitions and shows the sucrose concentration–water potential equation and its direction of change. Conclusion key terms appear in red in both languages, including net movement and its direction, equilibrium, and the observed cell state. The same highlighting style is used for the extension's A/B results.

### Extension study / 延伸學習

**Observe and hypothesise → Test → Explain.** Students examine the teacher-supplied blood photo. Straight black biological leader lines label the selected regular red blood cell A and shrunken red blood cell B, with no circles or arrowheads.

Stage 01 combines **Observe and hypothesise / 觀察及提出假說**: students propose the initial water potentials of cells A and B relative to the sodium chloride solution using **> / < / =** selectors beside the photo. Testing starts directly from this stage. Stage 02 simulates A and B using the students’ selected relationships: **>** assigns −700 kPa, **=** assigns −794 kPa, and **<** assigns −900 kPa. These are illustrative starting values, with an unchanged −794 kPa saline bath. Each result is compared with the photograph: regular A and shrunken B. Students can revise either hypothesis and retest; the separate movement-prediction panel has been removed. Stage 03 explains the observations. Symbol choices survive language changes and stage review, and Restart clears them. The photo alone does not establish the saline conditions, initial cell potentials, or cause of the shape differences.

The unchanged-A / shrinking-B example is obtained by choosing **A = solution** and **B > solution**. Other hypotheses produce their own outcomes and are marked as matching or differing from the photo. Both choices are required before starting.

All extension cells share **0.9% saline with a given water potential of −794 kPa**. This teacher-provided value is independent of the sucrose calculation in the core lab.

| Cell | Initial water potential | Initial net movement | Model outcome             |
| ---- | ----------------------- | -------------------- | ------------------------- |
| A    | −794 kPa                | None                 | Unchanged                 |
| B    | −700 kPa                | Out of the cell      | Shrinking, −11.84% volume |

The matching A/B test shows why a cell with a **higher** initial water potential loses water and shrinks in the same saline that is isotonic to A. A final checkpoint asks students to infer equal versus higher initial potential, with feedback that explains the direction of osmosis.

Stages **01–03 are clickable, keyboard-accessible review buttons**. Students can revisit the photo, hypothesis, simulation or explanation while retaining their answers and completed results. Leaving an unfinished test pauses it; returning offers Resume. Stage 02 can preview the initial cells before starting, and stage 03 explains when tests have not yet supplied observations.

Cell B is drawn at its actual relative size change. All completed cells reach equilibrium at −794 kPa while water continues moving in both directions. These timings and graphics are schematic rather than measurements of biological rates.

## Scientific assumptions

- Osmosis is the net movement of water molecules from higher to lower water potential across a **differentially permeable membrane / 差異透性膜**.
- Pure water is 0 kPa; adding sucrose lowers water potential. The concentration control is **% w/v**, grams of sucrose per 100 mL solution.
- At 25°C, the ideal-solution approximation is `Ψ = −CRT ≈ −72.416 × concentration(%) kPa`, using sucrose molar mass 342.3 g/mol. Accuracy decreases at higher concentrations; this is not a conversion table from the textbook.
- Fresh core-lab cells start at **−750 kPa（假設） / −750 kPa (Assumed)**, with a fixed amount of impermeant internal solute. This is an illustrative comparative model value, not the measured potential of every real cell. Their water potentials change during osmosis.
- The core bath initially has four units of water relative to a fresh cell's one unit. Total water and the amount of external sucrose are conserved during osmosis, so solution concentration and potential change with exchanged water. Equilibrium is solved against the changing solution potential. After rupture, cell contents mix into the whole water pool. Sucrose does not cross an intact cell membrane in this model. The cell wall is freely permeable to water and sucrose, so both can enter the space between wall and membrane during plasmolysis. The wall is not used as a particle barrier.
- Animal-cell solute potential changes inversely with relative water volume. The illustrative animal-cell rupture threshold is 1.6 times its starting volume; mild hypotonic solutions can produce swelling without bursting.
- Plant-cell potential combines the solute term with an illustrative rising pressure term above starting volume: `Ψcell = −750/V + max(0, V − 1) × 3000 kPa`. The pressure term resists expansion and permits equilibrium in pure water. The stiff wall contains changing cell contents, with a small illustrated inward flex during plasmolysis; the volume display refers to those contents, not wall-enclosed volume.
- Fresh plant cells start in a flaccid reference state. Water loss can cause flaccidity before marked plasmolysis; obvious plasmolysis is represented below relative contents volume 0.9.
- Water moves in both directions, including at equilibrium. Numerical core-lab values within 1 kPa are treated as equal to account for rounded inputs.
- Tonicity is recorded relative to each cell at the **start of that trial**, even after equilibrium. For a recovery trial the starting cell is the existing shrunken cell.
- The extension conserves each RBC's initial impermeant solute independently: `Ψcell = Ψinitial/V`, so equilibrium volume is `V = Ψinitial/Ψsaline`. Its separate saline reservoir maintains the given −794 kPa for the A/B comparison. Both activities use kPa; the saline value is given independently of the sucrose calculation.

## Textbook and image references

Terminology follows the teacher-provided English **Chapter 4: Movement of substances across the cell membrane** and Chinese **te_04_c.pdf**, §4.2B, pp. **4-14–4-21**, the summary on **4-32**, and explanation guidance on **4-37**. Examples include **turgid / 硬脹**, **flaccid / 軟縮**, **plasmolysis / 質壁分離**, and **haemolysis / 溶血**. The textbook PDFs are not included in this repository.

The core cell diagrams and particle animations are original canvas drawings. The extension uses the photograph supplied by the teacher, who requested the following attribution, also shown beneath the photo:

**圖片來源：[https://unsplash.com/@niaid](https://unsplash.com/@niaid)**

The unmarked original `assets/Red Blood Cell.jpg` uploaded by the teacher is used directly, without image editing. Translatable vector leader-line labels are a separate layer over the photo. The photograph is qualitative teaching material, not a quantitative measurement or evidence for the assumed saline experiment. No additional rights over the source photograph are claimed.

## Validation

```sh
npm test
npm run test:browser
```

The model and animation suites cover the concentration conversion, direction of osmosis, isotonic states, plant pressure equilibrium, animal-cell rupture, plasmolysis, recovery and all three initial-potential hypotheses for either extension cell. They also check initial membrane–wall contact, persistent corner attachments, conserved water identities, exchanges in all four quadrants, balanced equilibrium, half-second contact flashes independent of playback speed, water mixing after cell rupture, nucleus–vacuole separation, and wall permeability to water and sucrose while the membrane excludes sucrose. The browser suite exercises linked inputs, invalid values, animation controls, persistent particles across Start/pause/language changes, both languages, predictions, notebook persistence, mobile layout, photo leader lines and attribution, canvas label clearance, equal water-dot sizes, continuously filled cytoplasm leaks, automatic observation scrolling, and the three-stage extension with hypothesis-driven tests, photo comparisons, revision and final feedback.

Browser tests use `/usr/bin/chromium` when available. On another machine install Chromium with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing Chromium executable. Test reports and dependency directories are ignored by Git.

## Source layout

- `index.html`, `styles.css`: accessible page structure and responsive design.
- `js/model.js`: core sucrose/cell model.
- `js/renderer.js`, `js/geometry.js`, `js/particles.js`: cell diagrams, biological leader lines, shared membrane boundaries and persistent particles.
- `js/app.js`, `js/i18n.js`: application controls and bilingual terminology.
- `js/extension*.js`: separate saline model and guided extension activity.
- `scripts/serve.mjs`: dependency-free static development server.
- `tests/`: numerical model and Chromium browser checks.

No student responses are transmitted to a server. Language preference uses local browser storage; trial records use session storage; extension answers remain in memory until reset or reload.
