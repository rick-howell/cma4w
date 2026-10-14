// T. Collins, 21.1.2024
// Pre-processing MIDI files, calculating their mean MIDI note number, and writing them to file.

// RUN WITH: node io_midi_example -u Rick

// 1. Requires
const argv = require("minimist")(process.argv.slice(2))
const fs = require("fs")
const path = require("path")
const os = require("os")
const execSync = require("child_process").execSync
const plotlib = require("nodeplotlib")
const mm = require("maia-markov")
const mu = require("maia-util")

// 2. Individual user paths
const mainPaths = {
  "Rick": {
    // "inDir": path.join(
    //   "/Users", "tomthecollins", "Shizz", "repos", "cma4w", "io", "in",
    //   "hip_hop_midi", "mid"
    // ),
    "inDir": "C:/Users/theri/OneDrive/Documents/MUE/web_audio/hip_hop_midi/mid",
    // "outDir": path.join(
    //   "/Users", "tomthecollins", "Shizz", "repos", "cma4w", "io", "out"
    // ),
    "outDir": "C:/Users/theri/OneDrive/Documents/MUE/web_audio/cma4w/out",
    "outFileName": "mean_mnns"
  },
  "anotherUser": {
    // ...
  },
  // Default version downloads the zip from a URL and extracts to midi_data -> in folder within user's home folder.
  "_download": {
    "inDirRoot": path.join(os.homedir(), "midi_data", "in"),
    "inDir": path.join(os.homedir(), "midi_data", "in", "hip_hop_midi", "mid"),
    "outDir": path.join(os.homedir(), "midi_data", "out"),
    "outFileName": "mean_mnns"
  }
}

// 3. Parameters
const param = {
  "mnnIndex": 1
}

// 4. Declare/initialise the variables that will contain the results of the analysis.
const myArr = []
const myObj = {}

// 5. Iterate to import the MIDI file names.
let mainPath
if (argv.u && argv.u !== "_download"){
  mainPath = mainPaths[argv.u]
}
else {
  // Bit of extra work here if user has not downloaded the files.
  mainPath = mainPaths["_download"]
  fs.mkdirSync(mainPath["inDirRoot"], { "recursive": true })
  fs.mkdirSync(mainPath["outDir"], { "recursive": true })

  let myStr = "cd " + mainPath["inDirRoot"] + "\n"
    + "curl -L -o hip_hop_midi.zip https://cma4w.org/assets/midi/hip_hop_midi.zip" + "\n"
    + "unzip hip_hop_midi.zip" + "\n"
    + "cd -\n"
  let res = execSync(myStr, { encoding: "utf-8" })
  console.log("res:", res)
}

console.log("Iterate over the in directory.")
let files = fs.readdirSync(mainPath["inDir"])
files = files.filter(function(file){
  return path.extname(file) === ".mid"
})
console.log("files.length:", files.length)

// Iterate to import each MIDI file.
files
// .slice(0, 3) // Useful for checking the first few work.
.forEach(function(file, ithFile){
  console.log("\nithFile:", ithFile)
  const fid = file.split(".mid")[0]
  console.log("fid:", fid)
  try {
    const mi = new mm.MidiImport(path.join(mainPath["inDir"], file))
    // 6. Extract features (here, calculate the mean MNN).
    const meanMnn = mu.mean(
      mi.points.map(function(pt){ return pt[param.mnnIndex] })
    )
    if (ithFile < 5){
      // Have a look at the first five points.
      console.log("mi.points.slice(0, 5):", mi.points.slice(0, 5))
      // And the calculated mean MNN.
      console.log("meanMnn:", meanMnn)
    }
    // 7. Append results to one or more to-be-output variables.
    myArr.push(meanMnn)
    myObj[fid] = meanMnn
  }
  catch (error){
    console.log(error)
  }
})

// 8. Plot/visualise.
let data = [{
  "x": myArr,
  "type": "histogram",
}]
const layout = {
  "xaxis": { "title": "Mean MIDI note number" },
  "yaxis": { "title": "Frequency of observation" }, //, "range": [0, 1] },
  "title": { "text": "Histogram of mean MIDI note numbers" }
}
plotlib.plot(data, layout)

// 9. Write output(s) to file.
// Array containing the means
fs.writeFileSync(
  path.join(mainPath["outDir"], mainPath["outFileName"] + "_arr.json"),
  JSON.stringify(myArr)//, null, 2)
)
// Object containing the means
fs.writeFileSync(
  path.join(mainPath["outDir"], mainPath["outFileName"] + "_obj.json"),
  JSON.stringify(myObj, null, 2)
)
