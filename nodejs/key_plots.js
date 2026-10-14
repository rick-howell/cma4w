// R. Howell, 12.10.2026
// Visualising the output of key_estimation.js:
//   1. A scatter plot of each file's best vs. second-best key correlation, to
//      show how clear-cut (or ambiguous) the key estimates are.
//   2. A pitch-class profile overlay: one file's pitch-class distribution as
//      bars, with the profiles of its top two candidate keys drawn on top.

// RUN WITH: node key_plots -u Rick
// (Run key_estimation.js first, so the results file exists.)
// Options:
//   -f <fid>       Draw the overlay for this file, e.g. -f 10146.00.gm.
//                  Without it, overlays are drawn for the most ambiguous and
//                  the most confident file.
//   --unweighted   Plot the results of `node key_estimation --unweighted`.

// 1. Requires
// Treat -f as text, so a file ID is never parsed as a number.
const argv = require("minimist")(process.argv.slice(2), { "string": ["f"] })
const fs = require("fs")
const path = require("path")
const os = require("os")
const plotlib = require("nodeplotlib")
const profiles = require("./key_profiles")

// 2. Individual user paths (should match key_estimation.js)
const mainPaths = {
  "Rick": {
    "outDir": "C:/Users/theri/OneDrive/Documents/MUE/web_audio/cma4w/out",
    "outFileName": "key_estimates"
  },
  "_download": {
    "outDir": path.join(os.homedir(), "midi_data", "out"),
    "outFileName": "key_estimates"
  }
}

// 3. Parameters
const param = {
  // Files whose top two correlations are closer than this count as close calls.
  "closeCallGap": 0.02,
  "weightByDuration": !argv.unweighted
}

// 4. Load the results.
const mainPath = mainPaths[argv.u] || mainPaths["_download"]
const suffix = param.weightByDuration ? "" : "_unweighted"
const resultsPath = path.join(
  mainPath["outDir"], mainPath["outFileName"] + suffix + "_obj.json"
)
const results = JSON.parse(fs.readFileSync(resultsPath, "utf-8"))
const fids = Object.keys(results)
console.log("Loaded", fids.length, "results from", resultsPath)

// Key profiles looked up by name, e.g. keyProfileByName["G major"]. Minor
// profiles are always included here; a --majorOnly run just won't use them.
const keyProfileByName = {}
profiles.buildKeyProfiles(true).forEach(function(kp){
  keyProfileByName[kp.name] = kp.profile
})

// Gap between the best and second-best correlation for a file.
function gap(fid){
  const top3 = results[fid].top3
  return top3[0].r - top3[1].r
}

// Scale an array so it sums to 1. Correlation ignores scale, so this doesn't
// change anything analytically; it just puts the bars and profiles on the
// same axis.
function normalise(arr){
  const total = arr.reduce(function(a, b){ return a + b }, 0)
  return arr.map(function(x){ return x/total })
}

// 5. Scatter plot: best r against second-best r.
const closeFids = fids.filter(function(fid){
  return gap(fid) < param.closeCallGap
})
const clearFids = fids.filter(function(fid){
  return gap(fid) >= param.closeCallGap
})
console.log(
  "Close calls (gap < " + param.closeCallGap + "):", closeFids.length,
  "of", fids.length
)

function scatterTrace(fidList, name, colour){
  return {
    "x": fidList.map(function(fid){ return results[fid].top3[0].r }),
    "y": fidList.map(function(fid){ return results[fid].top3[1].r }),
    "text": fidList.map(function(fid){
      const top3 = results[fid].top3
      return fid
        + "<br>1st: " + top3[0].key + " (r = " + top3[0].r.toFixed(3) + ")"
        + "<br>2nd: " + top3[1].key + " (r = " + top3[1].r.toFixed(3) + ")"
    }),
    "hoverinfo": "text",
    "mode": "markers",
    "type": "scatter",
    "name": name,
    "marker": { "color": colour, "size": 7, "opacity": 0.7 }
  }
}

// Points on the diagonal would be exact ties between the top two keys, so the
// further below it a file sits, the clearer its key.
const diagonal = {
  "x": [0.2, 1],
  "y": [0.2, 1],
  "mode": "lines",
  "type": "scatter",
  "name": "Tie (1st = 2nd)",
  "hoverinfo": "skip",
  "line": { "color": "grey", "dash": "dash" }
}

plotlib.plot(
  [
    scatterTrace(clearFids, "Clear (gap ≥ " + param.closeCallGap + ")", "#1f77b4"),
    scatterTrace(closeFids, "Close call (gap < " + param.closeCallGap + ")", "#d62728"),
    diagonal
  ],
  {
    "title": {
      "text": "How clear-cut is each key estimate? (hover for details)"
    },
    "xaxis": { "title": "r for best key", "range": [0.2, 1] },
    "yaxis": { "title": "r for second-best key", "range": [0.2, 1] }
  }
)

// 6. Pitch-class profile overlay for one file.
function plotOverlay(fid, label){
  const res = results[fid]
  if (!res.distribution){
    console.log(
      "No distribution saved for " + fid + ". Re-run key_estimation.js "
      + "to regenerate the results file."
    )
    return
  }
  const first = res.top3[0], second = res.top3[1]
  const data = [
    {
      "x": profiles.pitchClassNames,
      "y": normalise(res.distribution),
      "type": "bar",
      "name": "This file",
      "marker": { "color": "#b0b0b0" }
    },
    {
      "x": profiles.pitchClassNames,
      "y": normalise(keyProfileByName[first.key]),
      "type": "scatter",
      "mode": "lines+markers",
      "name": first.key + " (r = " + first.r.toFixed(3) + ")",
      "line": { "color": "#1f77b4", "width": 3 }
    },
    {
      "x": profiles.pitchClassNames,
      "y": normalise(keyProfileByName[second.key]),
      "type": "scatter",
      "mode": "lines+markers",
      "name": second.key + " (r = " + second.r.toFixed(3) + ")",
      "line": { "color": "#ff7f0e", "width": 2, "dash": "dot" }
    }
  ]
  plotlib.plot(data, {
    "title": { "text": label + fid },
    "xaxis": { "title": "Pitch class" },
    "yaxis": { "title": "Proportion (each series sums to 1)" }
  })
}

if (argv.f){
  const fid = argv.f.replace(/\.mid$/, "")
  if (results[fid]){
    plotOverlay(fid, "Pitch-class profile: ")
  }
  else {
    console.log("No results for", fid)
  }
}
else {
  const byGap = fids.slice().sort(function(a, b){ return gap(a) - gap(b) })
  plotOverlay(byGap[0], "Most ambiguous file: ")
  plotOverlay(byGap[byGap.length - 1], "Most confident file: ")
}
