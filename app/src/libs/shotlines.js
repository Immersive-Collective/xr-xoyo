/* Teleport */

import * as THREE from 'three';

export let shotLine1, shotLine2;

export function initShotLines(scene) {
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  
  // Initialize the line for the first controller
  shotLine1 = createShotLine(material);
  scene.add(shotLine1);
  
  // Initialize the line for the second controller
  shotLine2 = createShotLine(material);
  scene.add(shotLine2);
}

function createShotLine(material) {
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  line.visible = false;
  return line;
}

export function updateShotLine(controller, shotLine) {
  if (shotLine) {
    const controllerPosition = new THREE.Vector3();
    controller.getWorldPosition(controllerPosition);

    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(controller.quaternion);
    
    const scalingFactor = 0.5;  // Set this value to control the length of the line
    direction.multiplyScalar(scalingFactor);  // Apply the scaling factor

    const endPoint = controllerPosition.clone().add(direction);
    const points = [controllerPosition, endPoint];
    shotLine.geometry.setFromPoints(points);
    shotLine.visible = true;

  } else {
    
    console.log("no teleportLine");
    
  }
}


// export function initShotLine(scene) {
//     const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
//     const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
//     const geometry = new THREE.BufferGeometry().setFromPoints(points);
//     teleportLine = new THREE.Line(geometry, material);
//     teleportLine.visible = false;
//     scene.add(teleportLine);
// }

// export function updateShotLine(controller1) {
//     if (teleportLine) {
        
//         teleportLine.position.set(0, 0, 0);
//         teleportLine.position.copy(controller1.position);
//         const direction = new THREE.Vector3(0, 0, -1);
//         direction.applyQuaternion(controller1.quaternion);
//         const points = [new THREE.Vector3(), direction.clone().add(controller1.position)];
//         teleportLine.geometry.setFromPoints(points);
//         teleportLine.visible = true;
        
//         teleportLine.updateMatrixWorld(true);

//     } else {
//         console.log("no teleportLine");
//     }
// }

console.log("shotlines.js")
