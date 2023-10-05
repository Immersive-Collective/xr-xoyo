// src/utils/helperFunctions.js

import * as THREE from 'three';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';


export function makeStarGeometry3(radius = 2, spikes = 10) {


  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const { position } = geometry.attributes;

  const vertices = position.array;

  for (let i = 0; i < vertices.length; i += 3) {
    const vertex = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
    const spikeAmount = Math.sin(vertex.angleTo(new THREE.Vector3(0, 1, 0)) * spikes * 2) + 1;
    vertex.normalize().multiplyScalar(radius + spikeAmount);
    vertices[i] = vertex.x;
    vertices[i + 1] = vertex.y;
    vertices[i + 2] = vertex.z;
  }

  position.needsUpdate = true;  // Required when you update BufferGeometry attributes manually
  
  return geometry;
}


export function noise(x) {
  return Math.sin(x * 12.9898 + 78.233) * 43758.5453 % 1;
}


/* Texture Noises */

export function generateNoiseTexture(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);

  for (let i = 0; i < imgData.data.length; i += 4) {
    const grayValue = Math.floor(Math.random() * 256);
    imgData.data[i] = grayValue;
    imgData.data[i + 1] = grayValue;
    imgData.data[i + 2] = grayValue;
    imgData.data[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  
  return texture;
}


export function generateVoronoiTexture(width, height, numPoints) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);

  const points = [];

  for (let i = 0; i < numPoints; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    points.push({ x, y });
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDist = Math.sqrt(width * width + height * height); // Max possible distance in the image
      for (const point of points) {
        const dx = x - point.x;
        const dy = y - point.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
        }
      }

      const pixelIndex = (y * width + x) * 4;
      const grayValue = Math.floor(minDist) % 256;

      imgData.data[pixelIndex] = grayValue;
      imgData.data[pixelIndex + 1] = grayValue;
      imgData.data[pixelIndex + 2] = grayValue;
      imgData.data[pixelIndex + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);

  return texture;
}


/* Text from shape */

export function addBoundingBox(text, position) {

    const boundingBox = new THREE.Box3().setFromObject(text);

    const boundingBoxGeometry = new THREE.BoxGeometry(
        boundingBox.max.x - boundingBox.min.x,
        boundingBox.max.y - boundingBox.min.y,
        boundingBox.max.z - boundingBox.min.z + 0.01
    );

    const boundingBoxMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF0000,
        transparent: true,
        opacity: 0,
        wireframe: false,
        depthWrite: false // Disable depth write
    });

    const boundingBoxMesh = new THREE.Mesh(boundingBoxGeometry, boundingBoxMaterial);
    boundingBoxMesh.position.copy(position);


    /* !!!! -test */
    //text.position.y -= (boundingBox.max.y + boundingBox.min.y) / 2;
    boundingBoxMesh.userData = { textMesh: text };

    return boundingBoxMesh;

}

export function swapTexture(object, imageFile) {


 const textureLoader = new THREE.TextureLoader();
  
    textureLoader.load(imageFile, function(texture) {


    // Use the loaded texture
    const newMaterial = new THREE.MeshStandardMaterial({ 
      wireframe: false,
      metalness: 0,
      roughness: 1,
      transparent: false,
      bumpMap: texture,
      bumpScale: 0.05,
      opacity: 1,
/*      map: noiseTexture,
*/      map: texture 
    });


        object.material = newMaterial;

    })


}




//     // // Mesh
//     // const myBallGeometry = new THREE.SphereGeometry(3, 32, 32);
//     // const myBallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });    
//     // const myBall = new THREE.Mesh(myBallGeometry, myBallMaterial);
    
//     // Mesh
//     const myBallGeometry = new THREE.SphereGeometry(3, 32, 32);
    
//     // Use the loaded texture
//     const myBallMaterial = new THREE.MeshStandardMaterial({ 
//       wireframe: false,
//       metalness: 0,
//       roughness: 1,
//       transparent: false,
//       bumpMap: texture,
//       bumpScale: 0.05,
//       opacity: 1,
// /*      map: noiseTexture,
// */      map: texture 
//     });
 
//     const myBall = new THREE.Mesh(myBallGeometry, myBallMaterial);
//     myBall.position.set(position.x, position.y, position.z);
//     let rotation =  degrees * (Math.PI / 180)
//     myBall.rotation.set(0,rotation,0);
    
//     scene.add(myBall);
//     window.myBall = myBall;
    
//     // Rigid Body Description
//     const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,0,0);
//     const rigidBody = myRapierWorld.createRigidBody(rigidBodyDesc);
//     // Collider Description
//     const colliderDesc = RAPIER.ColliderDesc.ball(3);
//     window.myRapierWorld.createCollider(colliderDesc, rigidBody);
//     window.ballRigidBody = rigidBody;
  



// Calculate full height of the font
export function calculateFontFullHeight(font,size,text) {
    const testText = addTextToButton(font, text, size, { x: 0, y: 0, z: 0 }, 1);
    const testBoundingBox = new THREE.Box3().setFromObject(testText);
    let H = testBoundingBox.max.y - testBoundingBox.min.y;
    let W = testBoundingBox.max.x - testBoundingBox.min.x;
    return {w:W, h:H};
}


export function createTextShape(font, message, fontSize, position, scale, color = 0xFFFFFF) {

  const shapes = font.generateShapes(message, fontSize);

  const geometry = new THREE.ShapeGeometry(shapes);
  
  const matLite = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  });

  const text = new THREE.Mesh(geometry, matLite);

  text.scale.set(scale, scale, scale);

  return text;  

}

export function addBlackOutline(mesh) {
    mesh.onBeforeRender = function(renderer, scene, camera, geometry, material, group) {
        effect.setSize(window.innerWidth, window.innerHeight);
        effect.render(scene, camera);
    };
}


export function makeGeometryIndexed(geometry) {

    const positions = geometry.attributes.position.array;
    const vertices = [];
    const indices = [];
    const verticesMap = new Map(); // Use a Map for more efficient lookups

    let nextIndex = 0;

    for (let i = 0; i < positions.length; i += 3) {
        const vertexStr = `${positions[i]},${positions[i + 1]},${positions[i + 2]}`;

        if (!verticesMap.has(vertexStr)) {
            verticesMap.set(vertexStr, nextIndex);
            vertices.push(positions[i], positions[i + 1], positions[i + 2]);
            indices.push(nextIndex++);
        } else {
            indices.push(verticesMap.get(vertexStr));
        }
    }

    const indexedGeometry = new THREE.BufferGeometry();
    indexedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    indexedGeometry.setIndex(indices);

    // If the original geometry has additional attributes, like 'normal' or 'uv', 
    // you'd need to handle those similarly to ensure the attributes remain consistent.

    return indexedGeometry;
}




export function addTextToButton(font, message, fontSize, position, scale, color = 0xFFFFFF, callback = []) {

  const shapes = font.generateShapes(message, fontSize);
  const geometry = new THREE.ShapeGeometry(shapes);
  const matLite = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  });

  geometry.computeBoundingBox();

  //console.log("geometry.computeBoundingBox()")
  const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
  const yMid = -0.5 * (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
  

  geometry.translate(xMid, yMid, 0);

  const text = new THREE.Mesh(geometry, matLite);

  text.scale.set(scale, scale, scale);
  //text.position.set(0, 0, position.z);
  text.callback = callback;

  return text;  

}


export function addTextToScene(font, message, fontSize, position, scale, color = 0xFFFFFF, callback = []) {
  const shapes = font.generateShapes(message, fontSize);
  const geometry = new THREE.ShapeGeometry(shapes);
  const matLite = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  });
  
  geometry.computeBoundingBox();
  const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
  geometry.translate(xMid, 0, 0);
  
  const text = new THREE.Mesh(geometry, matLite);
  text.scale.set(scale, scale, scale);
  text.position.set(position.x, position.y, position.z);
  text.callback = callback;

  return text;  

}


/* Displacers */

export function displaceSphereGeometry(geometry) {
    const vertices = geometry.attributes.position.array;

    for (let i = 0; i < vertices.length; i += 3) {
        // Get the vertex position
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];

        // Calculate the length (radius) from the origin to the vertex
        const length = Math.sqrt(x*x + y*y + z*z);

        // Calculate displacement. Adjust the function as per your needs.
        const displacement = Math.sin(x * y) * 0.1;

        // Normalize and scale by the displacement
        const nx = x / length;
        const ny = y / length;
        const nz = z / length;

        // Update the vertex position
        vertices[i] += nx * displacement;
        vertices[i + 1] += ny * displacement;
        vertices[i + 2] += nz * displacement;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals(); // Recompute normals after displacing
}

export function displaceSphereGeometryFac(geometry, strength = 1.0) {
    const vertices = geometry.attributes.position.array;

    for (let i = 0; i < vertices.length; i += 3) {
        // Get the vertex position
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];

        // Calculate the length (radius) from the origin to the vertex
        const length = Math.sqrt(x*x + y*y + z*z);

        // Calculate displacement. Adjust the function as per your needs.
        const displacement = Math.sin(x * y) * 0.1 * strength;  // Multiply by strength here

        // Normalize and scale by the displacement
        const nx = x / length;
        const ny = y / length;
        const nz = z / length;

        // Update the vertex position
        vertices[i] += nx * displacement;
        vertices[i + 1] += ny * displacement;
        vertices[i + 2] += nz * displacement;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals(); // Recompute normals after displacing
}


export function displaceGeometry(geometry) {

    const vertices = geometry.attributes.position.array;
    for (let i = 2; i < vertices.length; i += 3) {  // Starting from 2 as z is the third component in the array
      const x = vertices[i - 2];
      const y = vertices[i - 1];
      vertices[i] += Math.sin(x * y);
    }
    geometry.attributes.position.needsUpdate = true;

}






