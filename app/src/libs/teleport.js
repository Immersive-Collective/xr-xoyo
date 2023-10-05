/* Teleport */

import * as THREE from 'three';

export let teleportLine1, teleportLine2;

export function createTeleportCurve(material) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -0.5, -1),
    new THREE.Vector3(0, -1, -2),
  ]);

  const points = curve.getPoints(50);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  const line = new THREE.Line(geometry, material);
  line.visible = false;

  return line;

}



export function createTeleportTarget() {

  const circleGeometry = new THREE.CircleGeometry(0.2, 32);
  const circleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const circleMesh = new THREE.Mesh(circleGeometry, circleMaterial);
  circleMesh.visible = false;

  return circleMesh;

}



export function updateTeleportCurve(controller, curveLine, groundMesh) {

  if(!controller || !curveLine || !groundMesh) return;

  const controllerPosition = new THREE.Vector3();
  controller.getWorldPosition(controllerPosition);

  // Assume the ground is at y = 0
  const groundY = 0;

  // Update curve control points based on controller orientation
  // ...

  // Raycasting along the curve to find intersection with the ground
  const raycaster = new THREE.Raycaster();
  const points = curveLine.geometry.attributes.position.array;
  let intersectionPoint;

  for (let i = 0; i < points.length - 3; i += 3) {
    const start = new THREE.Vector3(points[i], points[i + 1], points[i + 2]);
    const end = new THREE.Vector3(points[i + 3], points[i + 4], points[i + 5]);
    
    raycaster.set(start, end.sub(start).normalize());

    const intersects = raycaster.intersectObject(groundMesh);

    if (intersects.length > 0) {
      intersectionPoint = intersects[0].point;
      break;
    }
  }

  // Draw target circle at intersectionPoint
  // ...
}






// export let teleportLine1, teleportLine2;

// export function initTeleportLines(scene) {
//   const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  
//   // Initialize the line for the first controller
//   teleportLine1 = createTeleportLine(material);
//   scene.add(teleportLine1);
  
//   // Initialize the line for the second controller
//   teleportLine2 = createTeleportLine(material);
//   scene.add(teleportLine2);
// }

// function createTeleportLine(material) {
//   const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
//   const geometry = new THREE.BufferGeometry().setFromPoints(points);
//   const line = new THREE.Line(geometry, material);
//   line.visible = false;
//   return line;
// }

// export function updateTeleportLine(controller, teleportLine) {
//   if (teleportLine) {
//     const controllerPosition = new THREE.Vector3();
//     controller.getWorldPosition(controllerPosition);

//     const direction = new THREE.Vector3(0, 0, -1);
//     direction.applyQuaternion(controller.quaternion);
    
//     const scalingFactor = 0.5;  // Set this value to control the length of the line
//     direction.multiplyScalar(scalingFactor);  // Apply the scaling factor

//     const endPoint = controllerPosition.clone().add(direction);
//     const points = [controllerPosition, endPoint];
//     teleportLine.geometry.setFromPoints(points);
//     teleportLine.visible = true;
//   } else {
//     console.log("no teleportLine");
//   }
// }


// export function initTeleportLine(scene) {
//     const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
//     const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
//     const geometry = new THREE.BufferGeometry().setFromPoints(points);
//     teleportLine = new THREE.Line(geometry, material);
//     teleportLine.visible = false;
//     scene.add(teleportLine);
// }

// export function updateTeleportLine(controller1) {
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


console.log("teleport.js")
