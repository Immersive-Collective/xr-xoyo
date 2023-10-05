// Audio Utils

import * as THREE from 'three';

export async function playAudioFromFile(path, loop = false, url='') {
  try {
    const response = await fetch(`${url}${path}`).catch(e => null);

    if (!response || !response.ok) return;

    const audioData = await response.arrayBuffer();

    audioContext.decodeAudioData(
      audioData,
      buffer => {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.loop = loop;
        source.start(0);
      },
      () => {}
    );
  } catch {}
}



/* get from audio data JSON */

export async function getProbeJSONAsync(audioFilePath) {
  // Assuming the JSON files are named like the audio files but with .json extension
  const jsonFilePath = `${audioFilePath}.json`;

  try {
    const response = await fetch(jsonFilePath);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json();
    return jsonData;
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
    return null;
  }
}

export function getProbeJSON(audioPath, callback) {
  // Change the file extension to .json
  const jsonPath = audioPath + '.json';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', jsonPath, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && xhr.status == 200) {
      try {
        var json = JSON.parse(xhr.responseText);
        callback(json);
      } catch (e) {
        console.error('Error parsing JSON:', e);
      }
    }
  };
  xhr.send();
}


export function getSoundIndex(audioData, fileName) {
  const indexes = [];
  for (let i = 0; i < audioData.length; i++) {
    if (audioData[i].includes(fileName)) {
      indexes.push(i);
    }
  }
  return indexes.length ? indexes : -1;
}


export function findSound(audioData, name) {
  if (!Array.isArray(audioData)) return console.error("Error: 'audioData' must be an array"), null;
  if (typeof name !== 'string') return console.error("Error: 'name' must be a string"), null;
  
  const index = getSoundIndex(audioData, name)[0];
  return index !== undefined ? audioData[index] : (console.error(`Error: Could not find sound ${name}`), null);
}


export function findSounds(audioData, name) {
  if (audioData === undefined) return console.error("Error: Missing argument 'audioData'"), null;
  if (name === undefined) return console.error("Error: Missing argument 'name'"), null;

  const indexes = getSoundIndex(audioData, name);
  if (indexes === -1) return console.error(`Error: Could not find sounds for ${name}`), null;

  return indexes.map(index => audioData[index]);
}





// Usage
// const audioPath = audioData[3];  // 'audio/CandyGranuls.mp3'
// getProbeJSON(audioPath, function(data) {
//   console.log(data);
// });


