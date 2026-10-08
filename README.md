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

All application asset paths are relative, so the simulator works under a repository subpath as well as at a domain root.

## Classroom activities

### Core lab

1. Choose a plant cell or an animal cell (a red blood cell).
2. Change either sucrose concentration or solution water potential. The linked field and schematic particle density update automatically.
3. Predict the net movement of water, then start, pause or resume the simulation.
4. Compare the starting and final cells at the same drawing scale, and read the three-point conclusion.
5. Replace a shrunken plant cell's solution with distilled water to observe recovery. This retains the existing cell; Reset restores the original cell.
6. Use the notebook to compare up to 12 completed trials in the current browser session.

The top-right language control translates controls, diagrams, feedback and saved notebook entries while preserving the current experiment.

### Extension study / 延伸學習

**Observe → Hypothesise → Test → Explain.** Students examine the teacher-supplied blood photo. Straight black biological leader lines label the selected regular red blood cell A and shrunken red blood cell B, with no circles or arrowheads.

The activity distinguishes a proposed hypothesis (individual RBCs may have different initial water potentials), predictions, simulation observations and conditional inferences. It assumes the cells began with comparable regular shapes, A remained unchanged, and B shrank by osmosis. The photo alone does not establish the saline conditions, initial cell potentials, or cause of the shape differences.

All extension cells share **0.9% saline with a given water potential of −0.794 MPa**. This teacher-provided value is independent of the sucrose calculation in the core lab.

| Cell                  | Initial water potential | Initial net movement | Model outcome                   |
| --------------------- | ----------------------- | -------------------- | ------------------------------- |
| X                     | −0.794 MPa              | None                 | Unchanged                       |
| Y                     | −0.810 MPa              | Into the cell        | Slight swelling, +2.02% volume  |
| Z, additional control | −0.780 MPa              | Out of the cell      | Slight shrinking, −1.76% volume |

The specified X/Y test demonstrates why a **lower** initial cell water potential does not explain shrinking in this solution. The higher-potential Z control supplies a testable comparison. A final checkpoint asks students to infer equal versus higher initial potential, with feedback that explains the direction of osmosis.

The extension enlarges small shape changes sixfold for visibility. Its numerical volume changes are not enlarged. All completed cells reach equilibrium at −0.794 MPa while water continues moving in both directions. These timings and graphics are schematic rather than measurements of biological rates.

## Scientific assumptions

- Osmosis is the net movement of water molecules from higher to lower water potential across a **differentially permeable membrane / 差異透性膜**.
- Pure water is 0 kPa; adding sucrose lowers water potential. The concentration control is **% w/v**, grams of sucrose per 100 mL solution.
- At 25°C, the ideal-solution approximation is `Ψ = −CRT ≈ −72.416 × concentration(%) kPa`, using sucrose molar mass 342.3 g/mol. Accuracy decreases at higher concentrations; this is not a conversion table from the textbook.
- Fresh core-lab cells start at **−500 kPa**, with a fixed amount of impermeant internal solute. This is an illustrative comparative model value, not the measured potential of every real cell. Their water potentials change during osmosis.
- The bath is a large reservoir whose concentration stays constant. Sucrose does not cross the cell membrane in this model. The cell wall is permeable.
- Animal-cell solute potential changes inversely with relative water volume. The illustrative red-blood-cell rupture threshold is 1.6 times its starting volume; mild hypotonic solutions can produce swelling without haemolysis.
- Plant-cell potential combines the solute term with an illustrative rising pressure term above starting volume: `Ψcell = −500/V + max(0, V − 1) × 3000 kPa`. The pressure term resists expansion and permits equilibrium in pure water. The fixed wall outline contains changing cell contents; the volume display refers to those contents, not wall-enclosed volume.
- Fresh plant cells start in a flaccid reference state. Water loss can cause flaccidity before marked plasmolysis; obvious plasmolysis is represented below relative contents volume 0.9.
- Water moves in both directions, including at equilibrium. Numerical core-lab values within 1 kPa are treated as equal to account for rounded inputs.
- Tonicity is recorded relative to each cell at the **start of that trial**, even after equilibrium. For a recovery trial the starting cell is the existing shrunken cell.
- The extension conserves each RBC's initial impermeant solute independently: `Ψcell = Ψinitial/V`, so equilibrium volume is `V = Ψinitial/Ψsaline`. It uses MPa, not the core lab's kPa.

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

The model suite covers the concentration conversion, direction of osmosis, isotonic states, plant pressure equilibrium, red-blood-cell rupture, plasmolysis, recovery and the extension's X/Y/Z outcomes. The browser suite exercises linked inputs, invalid values, animation controls, both languages, predictions, notebook persistence, mobile layout, photo leader lines and attribution, and the complete extension with final feedback.

Browser tests use `/usr/bin/chromium` when available. On another machine install Chromium with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing Chromium executable. Test reports and dependency directories are ignored by Git.

## Source layout

- `index.html`, `styles.css`: accessible page structure and responsive design.
- `js/model.js`: core sucrose/cell model.
- `js/renderer.js`: cell diagrams, labels and schematic transport.
- `js/app.js`, `js/i18n.js`: application controls and bilingual terminology.
- `js/extension*.js`: separate saline model and guided extension activity.
- `scripts/serve.mjs`: dependency-free static development server.
- `tests/`: numerical model and Chromium browser checks.

No student responses are transmitted to a server. Language preference uses local browser storage; trial records use session storage; extension reasoning remains in memory until reset or reload.
