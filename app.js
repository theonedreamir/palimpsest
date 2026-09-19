const engineSource = "// PALIMPSEST - deterministic civilization causality engine.\n// Pure TypeScript, no imports. Runs in a Web Worker (stringified) and in Node (compiled) for tests.\nconst LAW_DEFS = [\n    { key: 'land', name: 'LAND', question: 'Who owns the earth?', options: [\n            { id: 'commons', name: 'THE COMMONS', desc: 'Land held in common. Slow to enrich, slow to divide.' },\n            { id: 'homestead', name: 'HOMESTEADS', desc: 'Every family its own field. Ambition with a floor under it.' },\n            { id: 'feudal', name: 'THE GREAT ESTATES', desc: 'Land belongs to lords. Fast growth, deep hierarchy.' }\n        ] },\n    { key: 'succession', name: 'SUCCESSION', question: 'How does power pass on?', options: [\n            { id: 'elective', name: 'THE COUNCIL ELECTS', desc: 'Rulers are chosen. Legitimacy renews itself.' },\n            { id: 'hereditary', name: 'BLOOD INHERITS', desc: 'The crown passes by blood. Stable, until the heir fails.' },\n            { id: 'lottery', name: 'THE LOT', desc: 'Rule by drawn lot. No dynasties, no predictability.' }\n        ] },\n    { key: 'grain', name: 'GRAIN', question: 'Who guards the harvest?', options: [\n            { id: 'market', name: 'THE FREE MARKET', desc: 'Grain finds its price. Efficient, and merciless in lean years.' },\n            { id: 'granary', name: 'THE STATE GRANARY', desc: 'The state stores surplus against the bad years.' },\n            { id: 'rationing', name: 'THE RATION', desc: 'Every mouth is counted. Nobody starves; nobody is free.' }\n        ] },\n    { key: 'military', name: 'THE SWORD', question: 'Who holds the sword?', options: [\n            { id: 'militia', name: 'THE MILITIA', desc: 'Citizens arm when threatened, and farm otherwise.' },\n            { id: 'standing', name: 'THE STANDING ARMY', desc: 'Professional soldiers. Power projects outward, and inward.' },\n            { id: 'pacifist', name: 'THE OPEN GATES', desc: 'No army at all. Wealth flows to the mind, not the wall.' }\n        ] },\n    { key: 'knowledge', name: 'KNOWLEDGE', question: 'Who may know things?', options: [\n            { id: 'schools', name: 'THE OPEN SCHOOLS', desc: 'Every child taught. Ideas compound across generations.' },\n            { id: 'guilds', name: 'THE GUILDS', desc: 'Craft secrets guarded. Quality without spread.' },\n            { id: 'scribes', name: 'THE SCRIBE CLASS', desc: 'Literacy is a caste. Memory serves the throne.' }\n        ] },\n];\nconst SEEDS = [\n    { id: 'river', name: 'THE RIVER VALLEY', seed: 1123581, tagline: 'Rich silt, easy years, crowded cities.' },\n    { id: 'steppe', name: 'THE HIGH STEPPE', seed: 2718281, tagline: 'Hard wind, hard people, thin harvests.' },\n    { id: 'coast', name: 'THE BROKEN COAST', seed: 3141592, tagline: 'Harbors, strangers, and storms.' },\n];\nfunction mulberry32(a) {\n    return function () {\n        a |= 0;\n        a = (a + 0x6D2B79F5) | 0;\n        let t = Math.imul(a ^ (a >>> 15), 1 | a);\n        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;\n        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;\n    };\n}\nconst clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));\nfunction lawParams(laws) {\n    const p = {\n        growthBase: 0.012, inequalityDrift: 0.0, legitDrift: 0.0, techRate: 0.0006,\n        famineResist: 0.0, warPropensity: 0.06, centralDrift: 0.0, successionCrisis: false,\n        invasionRisk: 0.0, popCap: 1.0,\n    };\n    if (laws.land === 0) {\n        p.inequalityDrift += -0.004;\n        p.growthBase += -0.001;\n    }\n    if (laws.land === 1) {\n        p.inequalityDrift += 0.002;\n    }\n    if (laws.land === 2) {\n        p.inequalityDrift += 0.007;\n        p.growthBase += 0.003;\n        p.centralDrift += 0.002;\n    }\n    if (laws.succession === 0) {\n        p.legitDrift += 0.004;\n    }\n    if (laws.succession === 1) {\n        p.successionCrisis = true;\n        p.centralDrift += 0.003;\n    }\n    if (laws.succession === 2) {\n        p.legitDrift += -0.002;\n        p.centralDrift += -0.004;\n        p.inequalityDrift += -0.003;\n    }\n    if (laws.grain === 0) {\n        p.famineResist += -0.25;\n        p.growthBase += 0.002;\n    }\n    if (laws.grain === 1) {\n        p.famineResist += 0.35;\n        p.centralDrift += 0.001;\n    }\n    if (laws.grain === 2) {\n        p.famineResist += 0.5;\n        p.legitDrift += -0.003;\n        p.growthBase += -0.002;\n    }\n    if (laws.military === 0) {\n        p.warPropensity += -0.02;\n    }\n    if (laws.military === 1) {\n        p.warPropensity += 0.08;\n        p.centralDrift += 0.004;\n        p.legitDrift += -0.001;\n    }\n    if (laws.military === 2) {\n        p.warPropensity += -0.05;\n        p.techRate += 0.0005;\n        p.invasionRisk += 0.05;\n        p.legitDrift += 0.002;\n    }\n    if (laws.knowledge === 0) {\n        p.techRate += 0.0022;\n        p.legitDrift += 0.001;\n    }\n    if (laws.knowledge === 1) {\n        p.techRate += 0.0006;\n    }\n    if (laws.knowledge === 2) {\n        p.techRate += -0.0008;\n        p.inequalityDrift += 0.003;\n        p.centralDrift += 0.002;\n    }\n    return p;\n}\nfunction classify(s, extinct, collapses, events) {\n    if (extinct)\n        return { name: 'ASHES', epitaph: 'The cities are empty. Grass grows in the granaries. Only the archive remembers.' };\n    if (collapses >= 3)\n        return { name: 'THE BROKEN EMPIRE', epitaph: 'It fell and rose and fell again. Each new dynasty builds on unmarked graves.' };\n    const warCount = events.filter(e => e.kind === 'war' || e.kind === 'civilwar').length;\n    if (s.legitimacy > 65 && s.inequality < 0.36 && s.tech > 0.5)\n        return { name: 'THE LUMINOUS COMMONS', epitaph: 'No kings, no beggars. The schools stayed open for a thousand years.' };\n    if (s.centralization > 0.65 && s.legitimacy < 45)\n        return { name: 'THE GILDED AUTOCRACY', epitaph: 'One family owns the river, the law, and the truth. The people own the silence.' };\n    if (s.inequality > 0.6 && s.tech > 0.4 && s.legitimacy >= 30)\n        return { name: 'THE MERCHANT KINGDOMS', epitaph: 'Everything is for sale, including the future. Especially the future.' };\n    if (s.centralization < 0.3 && s.legitimacy > 50)\n        return { name: 'THE FREE CITIES', epitaph: 'A thousand councils, no throne. It should not work. It works.' };\n    if (warCount > 10)\n        return { name: 'THE SWORD LANDS', epitaph: 'Generation after generation was spent on the border. The border never moved.' };\n    if (s.tech < 0.4)\n        return { name: 'THE QUIET CENTURIES', epitaph: 'Nothing was invented and little was lost. The archive calls it peace. The archive is generous.' };\n    return { name: 'THE MIDDLE KINGDOM', epitaph: 'Neither glory nor ruin. A civilization that chose to continue.' };\n}\nfunction applyEventEffect(s, kind, p, strength) {\n    switch (kind) {\n        case 'plague':\n            s.population = Math.max(200, s.population * (1 - 0.16 * strength));\n            s.legitimacy -= 7 * strength;\n            break;\n        case 'famine':\n            s.population = Math.max(200, s.population * (1 - 0.09 * strength));\n            s.legitimacy -= 10 * strength;\n            s.inequality += 0.04 * strength;\n            break;\n        case 'war':\n            s.population = Math.max(200, s.population * (1 - 0.08 * strength));\n            s.legitimacy -= 6 * strength;\n            s.army = clamp(s.army + 0.08, 0, 1);\n            s.centralization = clamp(s.centralization + 0.04, 0, 1);\n            break;\n        case 'civilwar':\n            s.population = Math.max(200, s.population * (1 - 0.10 * strength));\n            s.legitimacy -= 16 * strength;\n            s.centralization = clamp(s.centralization - 0.10, 0, 1);\n            s.inequality -= 0.06;\n            break;\n        case 'succession':\n            s.legitimacy -= 14 * strength;\n            s.centralization = clamp(s.centralization - 0.06, 0, 1);\n            break;\n        case 'invasion':\n            s.population = Math.max(200, s.population * (1 - 0.15 * strength));\n            s.legitimacy -= 10 * strength;\n            s.tech = clamp(s.tech - 0.05, 0, 1);\n            break;\n        case 'goldenage':\n            s.tech = clamp(s.tech + 0.08, 0, 1);\n            s.legitimacy += 10;\n            s.population *= 1.04;\n            break;\n        case 'reform':\n            s.inequality -= 0.10;\n            s.legitimacy += 12;\n            break;\n        case 'discovery':\n            s.tech = clamp(s.tech + 0.05, 0, 1);\n            break;\n        case 'corruption':\n            s.legitimacy -= 9;\n            s.inequality += 0.06;\n            break;\n        case 'collapse':\n            s.population = Math.max(200, s.population * 0.72);\n            s.tech = clamp(s.tech - 0.08, 0, 1);\n            s.centralization = 0.25;\n            s.legitimacy = 55;\n            s.inequality *= 0.6;\n            s.army = 0.15;\n            break;\n    }\n    s.legitimacy = clamp(s.legitimacy, 0, 100);\n    s.inequality = clamp(s.inequality, 0.05, 0.95);\n}\nconst EVENT_SPECS = {\n    plague: (s) => ({ kind: 'plague', title: 'THE GREAT PLAGUE', detail: 'A fever crosses the borders. A fifth of the cities die in one winter.', branches: [\n            { id: 'contained', label: 'The plague is contained at the gates' }, { id: 'never', label: 'The plague never crosses the border' }\n        ] }),\n    famine: (s) => ({ kind: 'famine', title: 'THE HUNGRY YEARS', detail: 'Three harvests fail in succession. Bread becomes a rumor.', branches: [\n            { id: 'relief', label: 'The granaries open in time' }, { id: 'never', label: 'The third harvest holds' }\n        ] }),\n    war: (s) => ({ kind: 'war', title: 'THE BORDER WAR', detail: 'The army marches. The villages behind it empty.', branches: [\n            { id: 'won', label: 'The war is won quickly' }, { id: 'refused', label: 'The war is refused' }\n        ] }),\n    civilwar: (s) => ({ kind: 'civilwar', title: 'THE REVOLUTION', detail: 'The squares fill. The palace burns, or the people do.', branches: [\n            { id: 'reform', label: 'The reform passes without blood' }, { id: 'crushed', label: 'The revolt is crushed, and forgiven' }\n        ] }),\n    succession: (s) => ({ kind: 'succession', title: 'THE SUCCESSION CRISIS', detail: 'The ruler dies with no clear heir. Three claimants, one throne.', branches: [\n            { id: 'heir', label: 'A legitimate heir is found' }, { id: 'council', label: 'A council governs until the line clears' }\n        ] }),\n    invasion: (s) => ({ kind: 'invasion', title: 'THE INVASION', detail: 'Riders from beyond the map find the gates open.', branches: [\n            { id: 'repelled', label: 'The invasion is repelled at the river' }, { id: 'tribute', label: 'Tribute buys peace' }\n        ] }),\n    goldenage: (s) => ({ kind: 'goldenage', title: 'THE GOLDEN AGE', detail: 'A generation of surplus and open schools. The archives overflow.', branches: [\n            { id: 'hoarded', label: 'The surplus is hoarded by the few' }, { id: 'never', label: 'The surplus never comes' }\n        ] }),\n    reform: (s) => ({ kind: 'reform', title: 'THE GREAT REFORM', detail: 'Land is broken up, debts forgiven. The elites remember.', branches: [\n            { id: 'blocked', label: 'The reform is blocked in council' }, { id: 'never', label: 'No one dares propose it' }\n        ] }),\n    discovery: (s) => ({ kind: 'discovery', title: 'THE DISCOVERY', detail: 'A new method spreads: better steel, better sails, better numbers.', branches: [\n            { id: 'suppressed', label: 'The discovery is suppressed as heresy' }, { id: 'never', label: 'The discovery is never made' }\n        ] }),\n    corruption: (s) => ({ kind: 'corruption', title: 'THE GREAT EMBEZZLEMENT', detail: 'The granary accounts do not add up. Someone very rich got richer.', branches: [\n            { id: 'punished', label: 'The thieves are tried and punished' }, { id: 'never', label: 'The books were honest after all' }\n        ] }),\n    collapse: (s) => ({ kind: 'collapse', title: 'THE COLLAPSE', detail: 'The center cannot hold. The provinces stop answering letters.', branches: [\n            { id: 'held', label: 'The center holds one more generation' }\n        ] }),\n};\nfunction simulate(laws, seed, numYears, intervention) {\n    const p = lawParams(laws);\n    const rand = mulberry32(seed);\n    const s = {\n        year: 0, population: 42000, foodSecurity: 0.8, inequality: 0.3, legitimacy: 60,\n        tech: 0.12, centralization: 0.4, army: laws.military === 1 ? 0.5 : 0.2, harvest: 1,\n    };\n    const years = [];\n    const events = [];\n    let collapses = 0;\n    let lowLegitYears = 0;\n    let badHarvests = 0;\n    let extinct = false;\n    let nextSuccession = 30 + Math.floor(rand() * 40);\n    let seq = 0;\n    const lastFired = {};\n    let peakPop = s.population;\n    const density = seed === 1123581 ? 1.15 : seed === 2718281 ? 0.85 : 1.0;\n    for (let y = 0; y < numYears && !extinct; y++) {\n        s.year = y;\n        // climate: long cycles plus seeded noise (one draw per year keeps branch streams aligned)\n        const climate = 0.74 + 0.16 * Math.sin(y / 37) + 0.08 * Math.sin(y / 11 + 2) + (rand() - 0.5) * 0.22;\n        s.harvest = clamp(climate + p.famineResist * 0.3, 0.05, 1.2);\n        badHarvests = s.harvest < 0.55 ? badHarvests + 1 : 0;\n        // food and population\n        s.foodSecurity = clamp(s.harvest * (0.75 + 0.25 * p.famineResist + 0.15) + (1 - Math.min(1, s.population / (520000 * density))) * 0.28, 0, 1.15);\n        const growth = p.growthBase + (s.foodSecurity - 0.7) * 0.07 - s.inequality * 0.006;\n        const carryCap = 5200000 * density;\n        s.population = Math.max(0, s.population * (1 + growth * Math.max(0, 1 - s.population / carryCap)));\n        // drift terms\n        s.inequality = clamp(s.inequality + p.inequalityDrift + s.tech * 0.003 + (rand() - 0.5) * 0.01, 0.05, 0.95);\n        s.tech = clamp(s.tech + p.techRate * (0.5 + s.foodSecurity) * (s.tech < 0.9 ? 1 : 0.2), 0.02, 1);\n        s.centralization = clamp(s.centralization + p.centralDrift + (rand() - 0.5) * 0.01, 0.1, 0.95);\n        s.army = clamp(s.army + (laws.military === 1 ? 0.002 : -0.003), 0.05, 0.9);\n        // legitimacy: mean reversion plus pressures\n        const legitPull = (60 - s.legitimacy) * 0.06;\n        s.legitimacy = clamp(s.legitimacy + legitPull + p.legitDrift * 4 + (s.foodSecurity - 0.75) * 7 - (s.inequality - 0.3) * 4.5 + (rand() - 0.5) * 2.5, 0, 100);\n        if (s.centralization > 0.7 && s.legitimacy < 18)\n            s.legitimacy = 18;\n        lowLegitYears = (s.legitimacy < 12 && s.centralization <= 0.7) ? lowLegitYears + 1 : 0;\n        // events (probabilities from state; every year draws the same number of times)\n        const roll = rand();\n        const cool = (kind, gap) => lastFired[kind] === undefined || y - lastFired[kind] >= gap;\n        let fired = null;\n        if (lowLegitYears >= 15)\n            fired = 'collapse';\n        else if (badHarvests >= 3 && roll < 0.4 && cool('famine', 18))\n            fired = 'famine';\n        else if (s.population > 400000 * density && roll < 0.02 && cool('plague', 45))\n            fired = 'plague';\n        else if (s.legitimacy < 30 && s.inequality > 0.55 && roll < 0.05 && cool('civilwar', 25))\n            fired = 'civilwar';\n        else if (p.successionCrisis && y >= nextSuccession) {\n            fired = 'succession';\n            nextSuccession = y + 25 + Math.floor(rand() * 35);\n        }\n        else if (p.invasionRisk > 0 && roll < p.invasionRisk / 12 && cool('invasion', 30))\n            fired = 'invasion';\n        else if (roll > 1 - (p.warPropensity * (0.5 + s.army)) / 8 && cool('war', 12))\n            fired = 'war';\n        else if (s.legitimacy > 70 && s.foodSecurity > 0.85 && roll < 0.012 && cool('goldenage', 40))\n            fired = 'goldenage';\n        else if (s.inequality > 0.6 && s.legitimacy > 40 && roll < 0.008 && cool('reform', 50))\n            fired = 'reform';\n        else if (laws.knowledge === 0 && roll < 0.006 && cool('discovery', 20))\n            fired = 'discovery';\n        else if (s.centralization > 0.6 && roll < 0.007 && cool('corruption', 18))\n            fired = 'corruption';\n        if (fired) {\n            lastFired[fired] = y;\n            if (fired === 'famine')\n                badHarvests = 0;\n        }\n        if (fired) {\n            const spec = EVENT_SPECS[fired](s);\n            const id = 'e' + (seq++);\n            let title = spec.title, detail = spec.detail, kind = spec.kind, branchNote = '';\n            if (intervention && intervention.year === y && spec.branches.some(b => b.id === intervention.branchId)) {\n                branchNote = ' [BRANCH: ' + intervention.branchId + ']';\n                switch (intervention.branchId) {\n                    case 'contained':\n                        applyEventEffect(s, kind, p, 0.3);\n                        detail = 'The gates close in time. The fever dies outside them.';\n                        break;\n                    case 'never':\n                        detail = 'The archive records a quiet winter instead.';\n                        break;\n                    case 'relief':\n                        s.legitimacy += 6;\n                        detail = 'The granaries open. The people remember who fed them.';\n                        break;\n                    case 'won':\n                        s.army = clamp(s.army + 0.1, 0, 1);\n                        s.legitimacy += 5;\n                        s.centralization = clamp(s.centralization + 0.05, 0, 1);\n                        detail = 'A short war, a won war. The generals come home famous.';\n                        break;\n                    case 'refused':\n                        s.legitimacy += 4;\n                        s.army = clamp(s.army - 0.05, 0, 1);\n                        detail = 'The border dispute is settled with ink. The soldiers stay farmers.';\n                        break;\n                    case 'reform':\n                        applyEventEffect(s, 'reform', p, 1);\n                        detail = 'The reform passes. The squares empty peacefully.';\n                        break;\n                    case 'crushed':\n                        s.legitimacy -= 6;\n                        s.inequality -= 0.03;\n                        detail = 'The revolt is crushed, then its demands quietly met.';\n                        break;\n                    case 'heir':\n                        s.legitimacy += 4;\n                        detail = 'A cousin is found with the right blood. The line continues.';\n                        break;\n                    case 'council':\n                        s.centralization = clamp(s.centralization - 0.03, 0, 1);\n                        s.legitimacy += 2;\n                        detail = 'A council governs. It turns out to govern well.';\n                        break;\n                    case 'repelled':\n                        s.legitimacy += 6;\n                        s.army = clamp(s.army + 0.08, 0, 1);\n                        detail = 'The river runs red, but the gates hold.';\n                        break;\n                    case 'tribute':\n                        s.legitimacy -= 4;\n                        s.population *= 0.98;\n                        detail = 'Gold rides north. Peace rides back.';\n                        break;\n                    case 'hoarded':\n                        s.inequality = clamp(s.inequality + 0.09, 0, 0.95);\n                        s.tech = clamp(s.tech + 0.02, 0, 1);\n                        detail = 'The surplus gathers in few hands. The schools wait.';\n                        break;\n                    case 'suppressed':\n                        s.tech = clamp(s.tech - 0.02, 0, 1);\n                        s.legitimacy += 1;\n                        detail = 'The method is burned as heresy. The scribes sleep easier.';\n                        break;\n                    case 'punished':\n                        s.legitimacy += 5;\n                        s.inequality -= 0.04;\n                        detail = 'The thieves are tried in public. Trust recovers a little.';\n                        break;\n                    case 'held':\n                        s.legitimacy = 46;\n                        lowLegitYears = 0;\n                        detail = 'By bribes and marriages, the center holds one more generation.';\n                        break;\n                    default: applyEventEffect(s, kind, p, 1);\n                }\n                title = title + branchNote;\n            }\n            else {\n                applyEventEffect(s, kind, p, 1);\n                if (kind === 'collapse') {\n                    collapses++;\n                    lowLegitYears = 0;\n                }\n            }\n            const causes = [];\n            if (s.inequality > 0.55)\n                causes.push('inequality at ' + Math.round(s.inequality * 100) + '%');\n            if (s.legitimacy < 35)\n                causes.push('legitimacy collapsed to ' + Math.round(s.legitimacy));\n            if (badHarvests >= 2)\n                causes.push(badHarvests + ' failed harvests in a row');\n            if (s.population > 400000 * density)\n                causes.push('overcrowded cities');\n            if (s.army > 0.5)\n                causes.push('an army with nothing to do');\n            if (s.legitimacy > 70 && (kind === 'goldenage' || kind === 'reform'))\n                causes.push('a generation of trust');\n            if (laws.knowledge === 0 && kind === 'discovery')\n                causes.push('the open schools');\n            if (p.successionCrisis && kind === 'succession')\n                causes.push('the law of blood inheritance');\n            if (p.invasionRisk > 0 && kind === 'invasion')\n                causes.push('the open gates');\n            if (causes.length === 0)\n                causes.push('chance, and the climate');\n            events.push({ id, year: y, kind, title, detail, causes, severity: kind === 'collapse' ? 3 : (kind === 'plague' || kind === 'civilwar' || kind === 'famine' || kind === 'invasion' ? 2 : 1), branches: spec.branches });\n        }\n        peakPop = Math.max(peakPop, s.population);\n        if (s.population < 900 || (fired === 'collapse' && s.population < peakPop * 0.2))\n            extinct = true;\n        years.push({ ...s });\n    }\n    const cls = classify(s, extinct, collapses, events);\n    let h = 2166136261 >>> 0;\n    for (const ys of years) {\n        const sig = [ys.population | 0, Math.round(ys.inequality * 1000), Math.round(ys.legitimacy * 10), Math.round(ys.tech * 1000), events.length];\n        for (const n of sig) {\n            h ^= n & 0xffff;\n            h = Math.imul(h, 16777619) >>> 0;\n            h ^= (n >>> 16) & 0xffff;\n            h = Math.imul(h, 16777619) >>> 0;\n        }\n    }\n    return { years, events, classification: cls.name, epitaph: cls.epitaph, hash: h.toString(16).padStart(8, '0').toUpperCase(), laws, seed, endYear: years.length - 1, extinct, collapses, branchFrom: intervention?.year, branchChoice: intervention?.branchId };\n}\n";
const workerBootstrap = "\nself.onmessage = function (e) {\n  var d = e.data;\n  try { self.postMessage({ id: d.id, ok: true, result: simulate(d.laws, d.seed, d.numYears, d.intervention) }); }\n  catch (err) { self.postMessage({ id: d.id, ok: false, error: String(err) }); }\n};";
const engine = new Function(engineSource + '\nreturn { simulate: simulate, LAW_DEFS: LAW_DEFS, SEEDS: SEEDS };')();
const { simulate, LAW_DEFS, SEEDS } = engine;

const worker = new Worker(URL.createObjectURL(new Blob([engineSource + workerBootstrap], { type: 'text/javascript' })));
let seq = 0; const pending = new Map();
worker.onmessage = e => { const p = pending.get(e.data.id); if (p && e.data.ok) { p(e.data.result); pending.delete(e.data.id); } };
function runSim(laws, seed, numYears, intervention) {
  return new Promise(resolve => { const id = ++seq; pending.set(id, resolve); worker.postMessage({ id, laws, seed, numYears, intervention }); });
}

const DISASTER = new Set(['plague', 'famine', 'war', 'civilwar', 'invasion', 'collapse']);
const BOON = new Set(['goldenage', 'reform', 'discovery']);
const fmtPop = p => p >= 1e6 ? (p / 1e6).toFixed(2) + 'M' : p >= 1e3 ? Math.round(p / 1e3) + 'K' : Math.round(p) + '';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = {
  phase: 'title',
  laws: { land: 1, succession: 0, grain: 1, military: 0, knowledge: 0 },
  seedIdx: 0, prime: null, branch: null, branchEvent: null,
  scrub: 0, archived: 0, idbDenied: false, branching: false,
};
const root = document.getElementById('root');

function saveChronicle(r, seedName) {
  try {
    const req = indexedDB.open('palimpsest', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('chronicles', { keyPath: 'id' });
    req.onsuccess = () => {
      const tx = req.result.transaction('chronicles', 'readwrite');
      tx.objectStore('chronicles').put({ id: r.hash + '-' + Date.now(), ts: Date.now(), seedName, classification: r.classification, hash: r.hash, endYear: r.endYear, events: r.events.length, collapses: r.collapses, extinct: r.extinct });
      tx.oncomplete = () => req.result.close();
    };
    req.onerror = () => { state.idbDenied = true; };
  } catch { state.idbDenied = true; }
}
function countChronicles() {
  try {
    const req = indexedDB.open('palimpsest', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('chronicles', { keyPath: 'id' });
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction('chronicles', 'readonly');
        const q = tx.objectStore('chronicles').count();
        q.onsuccess = () => { state.archived = Math.max(state.archived, q.result); if (state.phase === 'title') render(); };
        q.onerror = () => { state.idbDenied = true; };
        tx.oncomplete = () => req.result.close();
      } catch { state.idbDenied = true; }
    };
    req.onerror = () => { state.idbDenied = true; };
  } catch { state.idbDenied = true; }
}

/* ---- strata background ---- */
let strataRAF = 0;
function startStrata(cv) {
  const ctx = cv.getContext('2d'); if (!ctx) return;
  let t = 0;
  const fit = () => { const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  fit();
  const LINES = 26;
  const draw = () => {
    if (!document.body.contains(cv)) return;
    const W = cv.clientWidth, H = cv.clientHeight;
    ctx.clearRect(0, 0, W, H); t += 0.0035;
    for (let i = 0; i < LINES; i++) {
      const yBase = (H / (LINES + 2)) * (i + 1.5);
      const drift = Math.sin(t * (0.5 + i * 0.045) + i * 1.7) * 8;
      const age = i / LINES;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const y = yBase + drift + Math.sin(x * 0.004 + i * 2.1 + t * 1.4) * (3 + age * 9) + Math.sin(x * 0.013 + i * 0.7 - t) * 2.2;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(236,229,216,' + (0.028 + age * 0.075) + ')';
      ctx.lineWidth = 1; ctx.stroke();
    }
    strataRAF = requestAnimationFrame(draw);
  };
  draw();
}

/* ---- chronicle chart ---- */
function drawChart(cv, result, branch, scrub) {
  const ctx = cv.getContext('2d'); if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientWidth < 700 ? 330 : 430;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const padL = 8, padR = 8, laneH = 54, bandH = (H - laneH - 18) / 4, gap = 8;
  const years = result.years, n = years.length;
  const x = i => padL + (i / (n - 1)) * (W - padL - padR);
  const ink = 'rgba(236,229,216,';
  const bronze = '#b3924f';
  ctx.font = '8px ui-monospace, monospace'; ctx.textAlign = 'left';
  for (let c = 0; c <= 1000; c += 200) {
    const gx = x(Math.min(n - 1, c));
    ctx.strokeStyle = ink + '0.07)'; ctx.beginPath(); ctx.moveTo(gx, laneH - 26); ctx.lineTo(gx, H); ctx.stroke();
    ctx.fillStyle = ink + '0.35)'; ctx.fillText('YR ' + c, gx + 4, laneH - 32);
  }
  for (const ev of result.events) {
    const ex = x(ev.year);
    const h = 6 + ev.severity * 7;
    ctx.strokeStyle = DISASTER.has(ev.kind) ? 'rgba(179,90,72,0.85)' : BOON.has(ev.kind) ? 'rgba(127,160,138,0.85)' : 'rgba(179,146,79,0.85)';
    ctx.lineWidth = ev.severity >= 3 ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(ex, laneH - 10); ctx.lineTo(ex, laneH - 10 - h); ctx.stroke();
  }
  if (branch) {
    const bx = x(branch.branchFrom || 0);
    ctx.strokeStyle = bronze; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = bronze; ctx.font = '600 8px ui-monospace, monospace';
    ctx.fillText('THE DIVERGENCE', Math.min(bx + 6, W - 90), 12);
  }
  let maxPop = 0;
  for (const y of years) maxPop = Math.max(maxPop, y.population);
  if (branch) for (const y of branch.years) maxPop = Math.max(maxPop, y.population);
  const bands = [
    { label: 'POPULATION', val: y => y.population, max: maxPop, area: true },
    { label: 'LEGITIMACY', val: y => y.legitimacy, max: 100 },
    { label: 'INEQUALITY', val: y => y.inequality, max: 1 },
    { label: 'KNOWLEDGE', val: y => y.tech, max: 1 },
  ];
  bands.forEach((b, bi) => {
    const top = laneH + bi * (bandH + gap);
    ctx.strokeStyle = ink + '0.12)';
    ctx.beginPath(); ctx.moveTo(padL, top + bandH); ctx.lineTo(W - padR, top + bandH); ctx.stroke();
    ctx.fillStyle = ink + '0.4)'; ctx.font = '600 8px ui-monospace, monospace';
    ctx.fillText(b.label, padL, top + 10);
    const yPos = v => top + bandH - (Math.max(0, v) / b.max) * (bandH - 6);
    ctx.beginPath();
    years.forEach((y, i) => { const px = x(i), py = yPos(b.val(y)); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    if (b.area) {
      ctx.save();
      ctx.lineTo(x(n - 1), top + bandH); ctx.lineTo(x(0), top + bandH); ctx.closePath();
      ctx.fillStyle = ink + '0.07)'; ctx.fill(); ctx.restore();
      ctx.beginPath();
      years.forEach((y, i) => { const px = x(i), py = yPos(b.val(y)); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    }
    ctx.strokeStyle = ink + '0.85)'; ctx.lineWidth = 1; ctx.stroke();
    if (branch) {
      const from = branch.branchFrom || 0;
      ctx.beginPath();
      let started = false;
      branch.years.forEach((y, i) => {
        if (i < from) return;
        const px = x(i), py = yPos(b.val(y));
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = bronze; ctx.setLineDash([4, 3]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    }
  });
  const sx = x(Math.min(scrub, n - 1));
  ctx.strokeStyle = 'rgba(236,229,216,0.55)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx, laneH - 26); ctx.lineTo(sx, H); ctx.stroke();
  const lx = Math.max(34, Math.min(W - 34, sx));
  ctx.fillStyle = '#0d0c0a'; ctx.fillRect(lx - 32, H - 16, 64, 13);
  ctx.strokeStyle = 'rgba(236,229,216,0.4)'; ctx.strokeRect(lx - 32, H - 16, 64, 13);
  ctx.fillStyle = 'rgba(236,229,216,0.9)'; ctx.font = '600 8px ui-monospace, monospace'; ctx.textAlign = 'center';
  ctx.fillText('YEAR ' + Math.min(scrub, n - 1), lx, H - 6);
  ctx.textAlign = 'left';
}

/* ---- screens ---- */
function archiveLine() {
  return state.archived > 0
    ? state.archived + (state.archived === 1 ? ' CHRONICLE' : ' CHRONICLES') + (state.idbDenied ? ' THIS SESSION' : ' IN THE ARCHIVE')
    : 'THE ARCHIVE IS EMPTY';
}

function renderTitle() {
  root.innerHTML = `<main class="pl-root title-screen">
    <canvas class="strata" aria-hidden="true"></canvas>
    <header class="pl-brand"><span>ARCHIVE OF WORLDS</span><span>ENGINE V1 · DETERMINISTIC</span></header>
    <section class="pl-hero">
      <p class="pl-eyebrow">A CIVILIZATION CAUSALITY ENGINE</p>
      <h1>PALIM<br><em>PSEST</em></h1>
      <p class="pl-lede">Write the founding laws of a civilization. Watch a thousand years obey them. Then change one event, and watch history change its mind.</p>
      <button class="pl-primary" data-action="enter">BEGIN THE FOUNDING <span>→</span></button>
    </section>
    <footer class="pl-foot"><span>1000 YEARS / RUN</span><span>EVERY CAUSE TRACEABLE</span><span>${archiveLine()}</span></footer>
  </main>`;
  startStrata(root.querySelector('.strata'));
}

function renderFounding() {
  root.innerHTML = `<main class="pl-root founding">
    <header class="pl-topbar">
      <button class="pl-word" data-action="home">PALIMPSEST</button>
      <span class="pl-crumb">I · THE FOUNDING</span>
    </header>
    <div class="found-grid">
      <section class="found-laws">
        <p class="pl-eyebrow">FIVE LAWS, CHOSEN ONCE, OBEYED FOR A MILLENNIUM</p>
        ${LAW_DEFS.map(def => `<div class="law">
          <div class="law-head"><span class="law-name">${def.name}</span><h3>${def.question}</h3></div>
          <div class="law-opts">${def.options.map((o, i) => `
            <button class="opt ${state.laws[def.key] === i ? 'selected' : ''}" data-law="${def.key}" data-opt="${i}">
              <b>${o.name}</b><span>${o.desc}</span>
            </button>`).join('')}</div>
        </div>`).join('')}
      </section>
      <aside class="found-side">
        <div class="side-block">
          <p class="pl-eyebrow">THE WORLD</p>
          ${SEEDS.map((s, i) => `<button class="seed ${i === state.seedIdx ? 'selected' : ''}" data-seed="${i}"><b>${s.name}</b><span>${s.tagline}</span></button>`).join('')}
        </div>
        <div class="side-block doctrine">
          <p class="pl-eyebrow">THE DOCTRINE</p>
          <ul>
            ${LAW_DEFS.map(d => `<li><span>${d.name}</span><b>${d.options[state.laws[d.key]].name}</b></li>`).join('')}
            <li><span>WORLD</span><b>${SEEDS[state.seedIdx].name}</b></li>
          </ul>
        </div>
        <button class="pl-primary found-btn" data-action="found">FOUND THE CIVILIZATION <span>→</span></button>
        <p class="side-note">The engine will obey these laws for 1,000 years. Nothing is random twice: the same doctrine always writes the same history.</p>
      </aside>
    </div>
  </main>`;
}

function renderForging(year) {
  root.innerHTML = `<main class="pl-root forging">
    <canvas class="strata" aria-hidden="true"></canvas>
    <div class="forge-center">
      <p class="pl-eyebrow">THE THOUSAND YEARS</p>
      <div class="forge-year">${year}</div>
      <p class="forge-sub">generations live and die under your laws</p>
    </div>
  </main>`;
  startStrata(root.querySelector('.strata'));
}

function divergenceFacts() {
  const { prime, branch } = state;
  if (!prime || !branch) return null;
  let first = -1;
  for (let i = branch.branchFrom || 0; i < Math.min(prime.years.length, branch.years.length); i++) {
    if (Math.abs(prime.years[i].population - branch.years[i].population) > 0.5) { first = i; break; }
  }
  return {
    first,
    primeOnly: prime.events.filter(e => e.year > (branch.branchFrom || 0)).length,
    branchOnly: branch.events.filter(e => e.year > (branch.branchFrom || 0)).length,
  };
}

function renderChronicle() {
  const { prime, branch } = state;
  if (!prime) { root.innerHTML = '<main class="pl-root"></main>'; return; }
  const seed = SEEDS.find(s => s.seed === prime.seed);
  const shown = branch || prime;
  const div = divergenceFacts();
  const scrubState = prime.years[Math.min(state.scrub, prime.years.length - 1)];
  const scrubBranch = branch && state.scrub >= (branch.branchFrom || 0) ? branch.years[Math.min(state.scrub, branch.years.length - 1)] : null;
  const scrubEvents = prime.events.filter(e => e.year === state.scrub);
  const branchEventsHere = branch ? branch.events.filter(e => e.year === state.scrub && !scrubEvents.some(se => se.id === e.id)) : [];
  const pct = v => Math.round(v * 100) + '%';
  root.innerHTML = `<main class="pl-root chronicle">
    <header class="pl-topbar">
      <button class="pl-word" data-action="refound">PALIMPSEST</button>
      <span class="pl-crumb">II · THE CHRONICLE</span>
      <span class="pl-hash">REPLAY ${prime.hash}</span>
    </header>
    <section class="verdict">
      <div>
        <p class="pl-eyebrow">${seed.name} · ${prime.endYear + 1} YEARS · ${prime.events.length} RECORDED EVENTS</p>
        <h2>${shown.classification}</h2>
        <p class="epitaph">${shown.epitaph}</p>
      </div>
      <div class="verdict-meta">
        <span><small>STATUS</small><b>${shown.extinct ? 'EXTINCT' : 'ENDURING'}</b></span>
        <span><small>COLLAPSES</small><b>${shown.collapses}</b></span>
        <span><small>${branch ? 'BRANCH HASH' : 'HASH'}</small><b>${shown.hash}</b></span>
      </div>
    </section>
    ${branch && div ? `<section class="branch-verdict">
      <div class="bv-row">
        <span class="bv-tag">THE BRANCH</span>
        <p>${branch.classification === prime.classification
          ? `History converges: the branch also becomes ${branch.classification}. Some outcomes are written deeper than one event.`
          : `The branch becomes ${branch.classification}. The prime became ${prime.classification}.`}</p>
      </div>
      <div class="bv-facts">
        <span><small>DIVERGENCE</small><b>YEAR ${branch.branchFrom}</b></span>
        <span><small>HISTORIES SEPARATE</small><b>${div.first >= 0 ? 'YEAR ' + div.first : 'NEVER'}</b></span>
        <span><small>PRIME EVENTS AFTER</small><b>${div.primeOnly}</b></span>
        <span><small>BRANCH EVENTS AFTER</small><b>${div.branchOnly}</b></span>
      </div>
      <button class="pl-ghost" data-action="unbranch">RETURN TO THE PRIME HISTORY</button>
    </section>` : ''}
    <section class="chron-chart">
      <div class="chart-head">
        <p class="pl-eyebrow">${branch ? 'TWO HISTORIES, ONE AXIS — SOLID PRIME, DASHED BRANCH' : 'THE THOUSAND YEARS, MEASURED'}</p>
        <span class="chart-hint">DRAG TO SCRUB</span>
      </div>
      <div class="chart-wrap"><canvas id="chron-canvas"></canvas></div>
      <div class="inspector">
        <div class="insp-year"><small>YEAR</small><b>${scrubState.year}</b></div>
        <div class="insp-stats">
          <span><small>POPULATION</small><b>${fmtPop(scrubState.population)}${scrubBranch ? `<em> / ${fmtPop(scrubBranch.population)}</em>` : ''}</b></span>
          <span><small>LEGITIMACY</small><b>${Math.round(scrubState.legitimacy)}${scrubBranch ? `<em> / ${Math.round(scrubBranch.legitimacy)}</em>` : ''}</b></span>
          <span><small>INEQUALITY</small><b>${pct(scrubState.inequality)}${scrubBranch ? `<em> / ${pct(scrubBranch.inequality)}</em>` : ''}</b></span>
          <span><small>KNOWLEDGE</small><b>${pct(scrubState.tech)}${scrubBranch ? `<em> / ${pct(scrubBranch.tech)}</em>` : ''}</b></span>
          <span><small>HARVEST</small><b>${pct(scrubState.harvest)}</b></span>
        </div>
        ${(scrubEvents.length || branchEventsHere.length) ? `<div class="insp-events">
          ${scrubEvents.map(e => `<p><b>${esc(e.title)}</b> — ${esc(e.detail)}</p>`).join('')}
          ${branchEventsHere.map(e => `<p class="br"><b>[BRANCH] ${esc(e.title)}</b> — ${esc(e.detail)}</p>`).join('')}
        </div>` : ''}
      </div>
    </section>
    <section class="event-index">
      <div class="chart-head">
        <p class="pl-eyebrow">THE EVENT INDEX — EVERY TURNING POINT, EVERY CAUSE</p>
        <span class="chart-hint">${shown.events.length} EVENTS</span>
      </div>
      <div class="events">
        ${shown.events.map(ev => `<article class="event sev${ev.severity} ${DISASTER.has(ev.kind) ? 'disaster' : BOON.has(ev.kind) ? 'boon' : ''}">
          <header><span class="ev-year">YEAR ${ev.year}</span><h4>${esc(ev.title)}</h4></header>
          <p>${esc(ev.detail)}</p>
          <div class="causes">${ev.causes.map(c => `<span>${esc(c)}</span>`).join('')}</div>
          <div class="ev-actions">
            <button class="pl-ghost" data-inspect="${ev.year}">INSPECT YEAR</button>
            ${!branch ? `<button class="branch-btn" data-branch="${ev.id}">BRANCH HISTORY ↗</button>` : ''}
          </div>
        </article>`).join('')}
      </div>
    </section>
    <footer class="pl-foot chron-foot">
      <span>DOCTRINE: ${LAW_DEFS.map(d => d.options[prime.laws[d.key]].name).join(' · ')}</span>
      <button class="pl-ghost" data-action="refound">FOUND ANOTHER CIVILIZATION</button>
    </footer>
    ${state.branchEvent ? `<div class="modal-back" data-action="closemodal">
      <div class="modal">
        <p class="pl-eyebrow">YEAR ${state.branchEvent.year} · THE MOMENT OF CHOICE</p>
        <h3>${esc(state.branchEvent.title)}</h3>
        <p class="modal-detail">${esc(state.branchEvent.detail)}</p>
        <p class="modal-note">The archive can replay history from this year with one difference. Everything before stays exactly as it happened. Everything after is a new history.</p>
        <div class="branch-opts">
          ${state.branchEvent.branches.map(b => `<button data-branch-id="${b.id}" ${state.branching ? 'disabled' : ''}>
            <b>${esc(b.label)}</b><span>${state.branching ? 'REWRITING HISTORY…' : 'REWRITE FROM YEAR ' + state.branchEvent.year}</span>
          </button>`).join('')}
        </div>
        <button class="pl-ghost modal-close" data-action="closemodal">LEAVE HISTORY AS IT WAS</button>
      </div>
    </div>` : ''}
  </main>`;
  const cv = document.getElementById('chron-canvas');
  if (cv) {
    drawChart(cv, prime, branch, state.scrub);
    const pick = e => {
      const r = cv.getBoundingClientRect();
      const n = prime.years.length;
      const frac = (e.clientX - r.left - 8) / (r.width - 16);
      state.scrub = Math.round(Math.min(1, Math.max(0, frac)) * (n - 1));
      render();
    };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pick(e); });
    cv.addEventListener('pointermove', e => { if (e.buttons > 0) pick(e); });
  }
}

function render() {
  cancelAnimationFrame(strataRAF);
  if (state.phase === 'title') renderTitle();
  else if (state.phase === 'founding') renderFounding();
  else if (state.phase === 'chronicle') renderChronicle();
  window.scrollTo(0, 0);
}

async function found() {
  state.phase = 'forging'; state.branch = null; state.branchEvent = null;
  renderForging(0);
  const result = await runSim(state.laws, SEEDS[state.seedIdx].seed, 1000);
  const t0 = performance.now();
  const tick = () => {
    const k = Math.min(1, (performance.now() - t0) / 2200);
    const el = root.querySelector('.forge-year');
    if (el) el.textContent = Math.round(k * (result.endYear + 1));
    if (k < 1) requestAnimationFrame(tick);
    else {
      state.prime = result; state.scrub = result.endYear; state.phase = 'chronicle';
      saveChronicle(result, SEEDS[state.seedIdx].name);
      state.archived += 1;
      render();
    }
  };
  requestAnimationFrame(tick);
}

root.addEventListener('click', async e => {
  if (e.target.classList && e.target.classList.contains('modal-back')) { state.branchEvent = null; render(); return; }
  const b = e.target.closest('button'); if (!b) return;
  const a = b.dataset.action;
  if (a === 'enter') { state.phase = 'founding'; }
  else if (a === 'home') { state.phase = 'title'; }
  else if (a === 'found') { found(); return; }
  else if (a === 'refound') { state.phase = 'founding'; state.branch = null; }
  else if (a === 'unbranch') { state.branch = null; }
  else if (a === 'closemodal') { state.branchEvent = null; }
  else if (b.dataset.law) { state.laws[b.dataset.law] = +b.dataset.opt; }
  else if (b.dataset.seed) { state.seedIdx = +b.dataset.seed; }
  else if (b.dataset.inspect) { state.scrub = +b.dataset.inspect; }
  else if (b.dataset.branch) {
    state.branchEvent = state.prime.events.find(ev => ev.id === b.dataset.branch) || null;
  }
  else if (b.dataset.branchId && state.branchEvent && !state.branching) {
    state.branching = true; render();
    const br = await runSim(state.prime.laws, state.prime.seed, 1000, { year: state.branchEvent.year, branchId: b.dataset.branchId });
    state.branch = br; state.branching = false;
    state.scrub = state.branchEvent.year;
    state.branchEvent = null;
  }
  else return;
  render();
});

window.addEventListener('resize', () => { if (state.phase === 'chronicle') render(); });

countChronicles();
render();
