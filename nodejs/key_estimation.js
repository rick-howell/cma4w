// R. Howell, 12.10.2026 (adapted from T. Collins' io_midi_example.js)
// Key estimation over a folder of MIDI files, following Sapp (2005), "Visual
// hierarchical key analysis". Each file's pitch-class distribution is
// correlated with Krumhansl's probe-tone key profiles, and the most positive
// correlation is taken as the estimate of key.

// RUN WITH: node key_estimation -u Rick
// Options:
//   --unweighted   Count each note once rather than weighting by duration.
//   --majorOnly    Only consider the 12 major keys.

// 1. Requires
const argv = require("minimist")(process.argv.slice(2))
const fs = require("fs")
const path = require("path")
const os = require("os")
const plotlib = require("nodeplotlib")
const mm = require("maia-markov")
const mu = require("maia-util")
const profiles = require("./key_profiles")

// 2. Individual user paths
const mainPaths = {
  "Rick": {
    "inDir": "C:/Users/theri/OneDrive/Documents/MUE/web_audio/hip_hop_midi/mid",
    "outDir": "C:/Users/theri/OneDrive/Documents/MUE/web_audio/cma4w/out",
    "outFileName": "key_estimates"
  },
  "_download": {
    "inDir": path.join(os.homedir(), "midi_data", "in", "hip_hop_midi", "mid"),
    "outDir": path.join(os.homedir(), "midi_data", "out"),
    "outFileName": "key_estimates"
  }
}

// 3. Parameters
const param = {
  "ontimeIndex": 0,
  "mnnIndex": 1,
  "durationIndex": 2,
  "channelIndex": 3,
  // General MIDI percussion is on channel 10 (index 9). Its MIDI note numbers
  // denote drum sounds rather than pitches, so we leave them out.
  "drumChannel": 9,
  "weightByDuration": !argv.unweighted,
  "includeMinor": !argv.majorOnly
}

// 4. Key profiles
// The Sapp/Krumhansl profiles, rotated to every tonic (see key_profiles.js).
const keyProfiles = profiles.buildKeyProfiles(param.includeMinor)

// 5. Analysis functions
// Pearson product-moment correlation coefficient between arrays x and y.
function pearson(x, y){
  const n = x.length
  const xBar = x.reduce(function(a, b){ return a + b }, 0)/n
  const yBar = y.reduce(function(a, b){ return a + b }, 0)/n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++){
    const dx = x[i] - xBar
    const dy = y[i] - yBar
    sxy += dx*dy
    sxx += dx*dx
    syy += dy*dy
  }
  if (sxx === 0 || syy === 0){
    // Correlation is undefined when either input is constant.
    return NaN
  }
  return sxy/Math.sqrt(sxx*syy)
}

// Tally MIDI note numbers mod 12 into a 12-element pitch-class distribution.
function pitchClassDistribution(points){
  const counts = new Array(12).fill(0)
  points.forEach(function(pt){
    const pc = pt[param.mnnIndex] % 12
    counts[pc] += param.weightByDuration ? pt[param.durationIndex] : 1
  })
  return counts
}

// Correlate a distribution with every key profile and return the best match,
// plus all correlations so we can inspect runners-up.
function estimateKey(distribution){
  const correlations = keyProfiles.map(function(kp){
    return { "key": kp.name, "r": pearson(distribution, kp.profile) }
  })
  let best = correlations[0]
  correlations.forEach(function(c){
    if (c.r > best.r){ best = c }
  })
  return { "key": best.key, "r": best.r, "correlations": correlations }
}

// Quick sanity check of our Pearson function against maia-util's.
const checkX = [1, 4, 2, 8, 5, 7], checkY = [2, 3, 3, 9, 4, 8]
console.log(
  "pearson check (ours vs. mu.corr):",
  pearson(checkX, checkY), mu.corr(checkX, checkY)
)

// 6. Iterate over the MIDI files.
const mainPath = mainPaths[argv.u] || mainPaths["_download"]
fs.mkdirSync(mainPath["outDir"], { "recursive": true })
let files = fs.readdirSync(mainPath["inDir"])
files = files.filter(function(file){
  return path.extname(file) === ".mid"
})
console.log("files.length:", files.length)
console.log("weightByDuration:", param.weightByDuration)
console.log("includeMinor:", param.includeMinor)

const myObj = {}
const keyCounts = {}
keyProfiles.forEach(function(kp){ keyCounts[kp.name] = 0 })

files
// .slice(0, 3) // Useful for checking the first few work.
.forEach(function(file, ithFile){
  const fid = file.split(".mid")[0]
  try {
    const mi = new mm.MidiImport(path.join(mainPath["inDir"], file))
    const pitched = mi.points.filter(function(pt){
      return pt[param.channelIndex] !== param.drumChannel
    })
    if (pitched.length === 0){
      console.log("No pitched notes in", fid, "- skipping.")
      return
    }
    const distribution = pitchClassDistribution(pitched)
    const est = estimateKey(distribution)
    if (isNaN(est.r)){
      console.log("Correlation undefined for", fid, "- skipping.")
      return
    }
    if (ithFile < 5){
      console.log("\nfid:", fid)
      console.log("distribution:", distribution.map(function(d){
        return Math.round(d*100)/100
      }))
      console.log("estimate:", est.key, "r =", est.r.toFixed(3))
    }
    // Keep the top three to make close calls easy to spot.
    const top3 = est.correlations.slice().sort(function(a, b){
      return b.r - a.r
    }).slice(0, 3)
    // Also keep the distribution so key_plots.js can draw it without
    // re-reading the MIDI file.
    myObj[fid] = {
      "key": est.key, "r": est.r, "top3": top3, "distribution": distribution
    }
    keyCounts[est.key]++
  }
  catch (error){
    console.log("Error with", fid, error)
  }
})

console.log("\nFiles with a key estimate:", Object.keys(myObj).length)
console.log("keyCounts:", keyCounts)

// 7. Plot a bar chart of how often each key was estimated.
const keyNames = keyProfiles.map(function(kp){ return kp.name })
const data = [{
  "x": keyNames,
  "y": keyNames.map(function(k){ return keyCounts[k] }),
  "type": "bar"
}]
const layout = {
  "xaxis": { "title": "Estimated key" },
  "yaxis": { "title": "Number of MIDI files" },
  "title": {
    "text": "Key estimates (Krumhansl profiles, "
      + (param.weightByDuration ? "duration-weighted" : "note counts") + ")"
  }
}
plotlib.plot(data, layout)

// 8. Write outputs to file.
const suffix = param.weightByDuration ? "" : "_unweighted"
fs.writeFileSync(
  path.join(mainPath["outDir"], mainPath["outFileName"] + suffix + "_obj.json"),
  JSON.stringify(myObj, null, 2)
)
fs.writeFileSync(
  path.join(mainPath["outDir"], mainPath["outFileName"] + suffix + "_counts.json"),
  JSON.stringify(keyCounts, null, 2)
)
