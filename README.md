# cma4w
Repo to support the book "Coding music and audio for the web: Empowerment through programming".

## Key estimation (Node.js)

Estimates the key of each MIDI file in a folder using Krumhansl's probe-tone profiles, following Sapp (2005), "Visual hierarchical key analysis". Each file's pitch classes (MIDI note number mod 12, drums excluded) are tallied, correlated with all 24 major/minor key profiles, and the most positive Pearson correlation is taken as the key.

### Files (in `nodejs/`)

| File | What it does |
| --- | --- |
| `key_profiles.js` | Shared module: Sapp's Fig. 7 major profile, the Krumhansl & Kessler minor profile, and `buildKeyProfiles()` to rotate them to all 12 tonics. Not run directly. |
| `key_estimation.js` | Analyses every MIDI file, writes the results to `out/`, and opens a bar chart of how often each key was estimated. |
| `key_plots.js` | Reads the saved results and plots (1) best vs. second-best correlation for every file, highlighting close calls, and (2) a file's pitch-class distribution overlaid on its top two key profiles. |

### Commands

Run from the `nodejs/` folder. Set your input/output folders under your name in `mainPaths` near the top of `key_estimation.js` and `key_plots.js` (e.g. `"Rick"`), then pass that name with `-u`.

```sh
cd nodejs

# 1. Estimate keys (run this first; takes about a minute for 500 files)
node key_estimation -u Rick                # notes weighted by duration
node key_estimation -u Rick --unweighted   # each note counts once
node key_estimation -u Rick --majorOnly    # only the 12 major keys

# 2. Plot the results
node key_plots -u Rick                     # scatter + most ambiguous / most confident files
node key_plots -u Rick -f 10146.00.gm      # overlay for one file
node key_plots -u Rick --unweighted        # plot the unweighted results
```

Charts open in your browser on a local server started by `nodeplotlib`. The script keeps running while the chart is open, so close the tab or press Ctrl+C to stop it. To use a fixed port, set `NODEPLOTLIB_PORT` first (e.g. `$env:NODEPLOTLIB_PORT = 8080` in PowerShell) and open `http://localhost:8080` yourself.

### Output (in `out/`)

- `key_estimates_obj.json` – for each file: estimated key, its correlation `r`, the top three candidate keys, and the pitch-class distribution.
- `key_estimates_counts.json` – number of files estimated in each key.
- `--unweighted` runs write `key_estimates_unweighted_obj.json` and `key_estimates_unweighted_counts.json` instead, so both versions can be kept side by side.
