// R. Howell, 12.10.2026
// Key profiles shared by key_estimation.js and key_plots.js.

// Sapp (2005), Fig. 7: Krumhansl's probe-tone weightings for major key
// contexts, starting on the tonic and ascending by semitone.
const majorProfile = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88
]
// Krumhansl & Kessler's (1982) minor-key weightings (not shown in Sapp's
// Fig. 7, but used alongside the major profile in his key analysis).
const minorProfile = [
  6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17
]
const pitchClassNames = [
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"
]

// Rotate a profile so that its tonic lands on pitch class `tonic`. E.g., for
// G major (tonic = 7), the weight for scale degree 1 (6.35) moves to index 7.
function rotate(profile, tonic){
  return profile.map(function(_, pc){
    return profile[(pc - tonic + 12) % 12]
  })
}

// Build the list of { name, profile } objects for all 12 major keys and,
// optionally, all 12 minor keys.
function buildKeyProfiles(includeMinor){
  const keyProfiles = []
  for (let tonic = 0; tonic < 12; tonic++){
    keyProfiles.push({
      "name": pitchClassNames[tonic] + " major",
      "profile": rotate(majorProfile, tonic)
    })
  }
  if (includeMinor){
    for (let tonic = 0; tonic < 12; tonic++){
      keyProfiles.push({
        "name": pitchClassNames[tonic] + " minor",
        "profile": rotate(minorProfile, tonic)
      })
    }
  }
  return keyProfiles
}

module.exports = {
  majorProfile, minorProfile, pitchClassNames, rotate, buildKeyProfiles
}
