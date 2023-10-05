import * as THREE from 'three';


import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import Stats from 'three/addons/libs/stats.module.js';

import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

import { Sky } from 'three/addons/objects/Sky.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from './libs/hands/XRHandModelFactory.js';

import * as shot from './libs/shotlines';
import * as tp from './libs/teleport';

import * as Hls from 'hls.js/dist/hls.js'

console.log("shot", shot)

// import { PlaneGeometry } from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/* Colors */ 
import * as cols from './libs/colors/pastels.js'
let colsVariantsIdx = 8
window.colsVariantsIdx = colsVariantsIdx
const colorsSet = [0xA8E6CE,0xDCEDC2,0xFFD3B5,0xFFAAA6,0xFF8C94]

/* Camera controls */
const DEFAULT_CAMERA_ROT = '{"isEuler":true,"_x":-0.4890319918221778,"_y":0.029905380566305973,"_z":0.015910295468581418,"_order":"XYZ"}';
const DEFAULT_CAMERA_POS =  '{"x":0.3966156804487375,"y":8.240668844853648,"z":16.11327172278412}';
const DEFAULT_CONTROLS_TARGET = '{"x":-1.8977369150584633,"y":-27.789645896127855,"z":-51.59438146811678}';

const clubModel = 'assets/models/xoyo-club_v2.glb'

let gui
let stats
let RAPIER
let camera
let scene
let renderer
let controls

let xrRefSpace
let cameraPositions = []

let hand1, hand2;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
const handModels = {
    left: null,
    right: null
};
let handModelFactory;
let conS = [];


let world
let groundHeight = 0;
let gravity = { x: 0.0, y: -1.2, z: 0.0 };
let eventQueue

window.myRapierWorld
window.rigidBodies = window.rigidBodies || [];
window.threeCubes = window.threeCubes || [];


/* Textures Data */

import ballsTexturesData from './assets/images/balls/index.json';
let texturesCache = []
function loadTextures() {
  for(let i=0; i<ballsTexturesData.length; i++) {
    let path = "assets/images/"+ballsTexturesData[i]      
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(path, function(texture) {
      texturesCache.push({path:path, texture:texture})
    })
  }
}

/* Sky */

let sky, sun;

function getSkyAverageColor() {
    const width = 16; // Low resolution is fine for average color
    const height = 16;

    // Create an off-screen render target
    const rt = new THREE.WebGLRenderTarget(width, height);

    // Render the sky to the off-screen render target using a secondary camera
    const cam = new THREE.PerspectiveCamera(75, width / height, 1, 1000);
    renderer.setRenderTarget(rt);
    renderer.render(sky, cam);
    renderer.setRenderTarget(null);

    // Read pixel data from the texture
    const buffer = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, width, height, buffer);

    let r = 0, g = 0, b = 0;

    // Average the RGB values
    for (let i = 0; i < buffer.length; i += 4) {
        r += buffer[i];
        g += buffer[i + 1];
        b += buffer[i + 2];
    }

    r /= (width * height);
    g /= (width * height);
    b /= (width * height);

    // Cleanup
    rt.dispose();

    return new THREE.Color(r / 255, g / 255, b / 255);
}
window.getSkyAverageColor = getSkyAverageColor;


function updateFog() {
  // if (!scene || !scene.fog || !scene.fog.color) {
  //   console.warn("Scene or fog not initialized");
  //   return;
  // }

  let skyAverageColor = getSkyAverageColor();
  if (!skyAverageColor) {
    console.warn("Sky average color not retrieved");
    return;
  }

  //scene.fog.color.lerpColors(new THREE.Color(0x48424a), skyAverageColor, 0.5);
  console.log("skyAverageColor:",skyAverageColor)
  scene.fog = new THREE.Fog(0x000000, 500, 1000); // white fog that starts at 10 units and ends at 50 units.
  //scene.fog = new THREE.FogExp2(0x48424a, 0.005); // Adjust the density value as needed.


}
window.updateFog = updateFog



function initSky() {

  // Add Sky
  sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);

  sun = new THREE.Vector3();

  // Load saved parameters or use default values
  const savedParams = localStorage.getItem('skyParameters');
  const defaultParams = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
    exposure: renderer.toneMappingExposure
  };
  
  const effectController = savedParams ? JSON.parse(savedParams) : defaultParams;

  function guiChanged() {
    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = effectController.turbidity;
    uniforms['rayleigh'].value = effectController.rayleigh;
    uniforms['mieCoefficient'].value = effectController.mieCoefficient;
    uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
    const theta = THREE.MathUtils.degToRad(effectController.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    uniforms['sunPosition'].value.copy(sun);

    renderer.toneMappingExposure = effectController.exposure;
    renderer.render(scene, camera);

    // Save the current sky parameters to localStorage
    localStorage.setItem('skyParameters', JSON.stringify(effectController));
  }

  gui = new GUI();


  gui.add( effectController, 'turbidity', 0.0, 20.0, 0.1 ).onChange( guiChanged );
  gui.add( effectController, 'rayleigh', 0.0, 4, 0.001 ).onChange( guiChanged );
  gui.add( effectController, 'mieCoefficient', 0.0, 0.1, 0.001 ).onChange( guiChanged );
  gui.add( effectController, 'mieDirectionalG', 0.0, 1, 0.001 ).onChange( guiChanged );
  gui.add( effectController, 'elevation', 0, 90, 0.1 ).onChange( guiChanged );
  gui.add( effectController, 'azimuth', - 180, 180, 0.1 ).onChange( guiChanged );
  gui.add( effectController, 'exposure', 0, 1, 0.0001 ).onChange( guiChanged );


// nested controllers
// const folder = gui.addFolder( 'Position' );
// folder.add( obj, 'x' );
// folder.add( obj, 'y' );
// folder.add( obj, 'z' );  

// let obj = {
//     myBoolean: true,
//     myString: 'lil-gui',
//     myNumber: 1,
//     myFunction: function() { alert( 'hi' ) }
// }

// gui.add( obj, 'myBoolean' );    // checkbox
// gui.add( obj, 'myString' );     // text field
// gui.add( obj, 'myNumber' );     // number field
// gui.add( obj, 'myFunction' );   // button


  guiChanged();

  gui.close();
    // window.gui = gui;


}




/* Controllers */

function initControllers() {

    shot.initShotLines(scene)

    controller1 = renderer.xr.getController(0);
    scene.add(controller1);
    controller2 = renderer.xr.getController(1);
    scene.add(controller2);
    const controllerModelFactory = new XRControllerModelFactory();
    handModelFactory = new XRHandModelFactory();
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);
    hand1 = renderer.xr.getHand(0);
    hand1.userData.currentHandModel = 0;
    scene.add(hand1);
    handModels.left = [
        handModelFactory.createHandModel(hand1, 'mesh')
    ];
    const model1 = handModels.left[0];
    model1.visible = true;
    hand1.add(model1);
    hand1.addEventListener('pinchend', function() {
        console.log('hand1 pinched')
        //au.playAudioFromFile(au.findSounds(audioData, "Serge_3")[0])
        shootBallXR(1)
    });
    // Hand 2
    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);
    hand2 = renderer.xr.getHand(1);
    hand2.userData.currentHandModel = 2;
    scene.add(hand2);
    handModels.right = [
        handModelFactory.createHandModel(hand2, 'mesh')
    ];
    const model2 = handModels.right[0];
    model2.visible = true;
    hand2.add(model2);
    hand2.addEventListener('pinchend', function() {
        console.log('hand2 pinched')
        //addSingleCube({x:.2,y:.1,z:.2}, {x:controller2.position.x,y:controller2.position.y-0.05,z:controller2.position.z}, Math.random()*9999999, true);
        //au.playAudioFromFile(au.findSounds(audioData, "Serge_3")[0])
        shootBallXR(2);
    });
    window.hand1 = hand1;
    window.hand2 = hand2;

    //let conS = [];
    controller1.addEventListener("connected", function (e) {
        console.log("Controller 1 connected!", e.data);
        if (e.data.gamepad !== null) {
            console.log("e.data.gamepad", e.data.gamepad.axes);
            if (conS.filter(obj => obj.id === 0).length === 0) {
                conS.push({
                    id: 0,
                    // side: e.data.handedness,
                    data: e.data,
                    // gamepad: e.data.gamepad
                });
            }
        }
    });

    controller2.addEventListener("connected", function (event) {
        console.log("Controller 2 connected!", event.data);
        if (event.data.gamepad !== null) {
            console.log("event.data.gamepad", event.data.gamepad.axes);
            if (conS.filter(obj => obj.id === 1).length === 0) {
                conS.push({
                    id: 1,
                    // side: event.data.handedness,
                    data: event.data,
                    // gamepad: event.data.gamepad
                });
            }
        }
    });

    // For Hand 1
    controller1.addEventListener('selectstart', function() {
        console.log('controller1 trigger pressed');
        //au.playAudioFromFile(au.findSounds(audioData, "Serge_3")[0]);
        shootBallXR(1);
    });
    // For Hand 2
    controller2.addEventListener('selectstart', function() {
        console.log('controller2 trigger pressed');
        //au.playAudioFromFile(au.findSounds(audioData, "Serge_3")[0]);
        shootBallXR(2);
    });
    // For Hand 1
    controller1.addEventListener('squeezestart', function() {
        console.log('controller1 trigger pressed');
        //makeScene()
    });
    // For Hand 2
    controller2.addEventListener('squeezestart', function() {
        console.log('controller2 trigger pressed');
        //makeScene()
    });
}

/* Static Model */


function addPhysics(mesh, density) {

    let worldPosition = new THREE.Vector3();
    let worldQuaternion = new THREE.Quaternion();
    
    mesh.getWorldPosition(worldPosition);
    mesh.getWorldQuaternion(worldQuaternion);

    let rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(worldPosition.x, worldPosition.y, worldPosition.z)
        .setRotation({ w: worldQuaternion.w, x: worldQuaternion.x, y: worldQuaternion.y, z: worldQuaternion.z });

    let rigidBody = myRapierWorld.createRigidBody(rigidBodyDesc);
    const vertices = mesh.geometry.attributes.position.array;
    const indices = mesh.geometry.index.array;
    const trimesh = new RAPIER.TriMesh(vertices, indices);    

    let colliderDesc = RAPIER.ColliderDesc.trimesh(trimesh).setDensity(density);
    colliderDesc.shape.indices = indices;
    colliderDesc.shape.vertices = vertices;      

    let collider = myRapierWorld.createCollider(colliderDesc, rigidBody);

    window.rigidBodies.push(rigidBody);
    window.threeCubes.push(mesh);
}


function addModel(filePath, name, position, rotation = {x:0,y:0,z:0}) {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('draco_decoder/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    const baseURL = "";
    const fullURL = baseURL + filePath;

    loader.load(fullURL, gltf => {
        let sceneRoot = gltf.scene;
        sceneRoot.name = name;
        sceneRoot.position.copy(position);
        sceneRoot.rotation.set(rotation.x, rotation.y, rotation.z);

        // sceneRoot.traverse((child) => {
        //     if (child.isMesh) {
        //         addPhysics(child, 40);
        //     }
        // });

        scene.add(sceneRoot);

          // initSky();
          // updateFog();

    });
}
window.addModel = addModel;


function addStaticModel(filePath, name, position, rotation = {x:0,y:0,z:0}) {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('static/libs/draco');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    const baseURL = "";
    const fullURL = baseURL + filePath;

    loader.load(fullURL, gltf => {
        let sceneRoot = gltf.scene;
        sceneRoot.name = name;
        sceneRoot.position.copy(position);
        sceneRoot.rotation.set(rotation.x, rotation.y, rotation.z);

        sceneRoot.traverse((child) => {
            if (child.isMesh) {
                addPhysics(child, 40);
            }
        });

        scene.add(sceneRoot);
    });
}
window.addStaticModel = addStaticModel;



/* Eye dropper */


async function addEyeDropper() {
  if ('EyeDropper' in window) {
    // The API is available!
    const eyeDropper = new EyeDropper();

    try {
      const result = await eyeDropper.open();
      // The user selected a pixel, here is its color:
      
      console.log(result)
      return result.sRGBHex;

    } catch (err) {
      // The user escaped the eyedropper mode or there was an error.
      console.error("Error using EyeDropper:", err);
      return null;
    }

  } else {
    console.log('EyeDropper unavailable');
    return null;
  }
}

window.addEyeDropper = addEyeDropper;


function addScene() {


  const container = document.createElement('div');

  document.body.appendChild(container);

  // CAMERA
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000); 
  camera.rotation.order = 'XYZ';

  camera.position.x = 0;
  camera.position.z = 0;
  camera.position.y = 1.7;
  camera.lookAt(0,0,-5)  

  // SCENE
  scene = new THREE.Scene();
  // Fog
  
  //scene.fog = new THREE.Fog(0x48424a, 10, 650); // white fog that starts at 10 units and ends at 50 units.
  //scene.fog = new THREE.FogExp2(0x48424a, 0.005); // Adjust the density value as needed.



  // RENDERER
  renderer = new THREE.WebGLRenderer({ antialias: true, xrCompatible: true });

  let bgColor = 0x888888
  renderer.setClearColor(bgColor, 1); // Sets the background color to white with 50% opacity
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.gammaFactor = 2.2;
  renderer.gammaOutput = true;  
  // switch to false to improve rendering
  renderer.shadowMap.enabled = true;
  //renderer.shadowMap.type = THREE.PCFSoftShadowMap;   
  renderer.xr.enabled = true;


  renderer.xr.addEventListener('sessionstart', onXRSessionStart);
  renderer.xr.addEventListener('sessionend', onXRSessionEnd);

  container.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // ORBIT CONTROLS
  controls = new OrbitControls(camera, container);
  
  controls.enableDamping = false;
  //controls.dampingFactor = 0.5;
  //controls.minPolarAngle = 0;
  // controls.maxPolarAngle = Math.PI / 2.1; // This is already the default, means camera can't go more than 90 degrees.        
  controls.minDistance = 0.25; // The closest the camera can get to the target
  controls.maxDistance = 900; // The farthest the camera can be from the target


  const debouncedSave = debounce(saveCameraPosition, 300); // 300ms delay
  controls.addEventListener('end', debouncedSave);
  //controls.addEventListener('end', saveCameraPosition);
  
  //controls.update();

  // STATIC GROUND
  // let floorColor = 0xFF2233
  // const groundGeometry = new THREE.PlaneGeometry(10, 10, 10, 10);
  // const groundMaterial = new THREE.MeshStandardMaterial({ color: floorColor, metalness:0, roughness:0, transparent:true, opacity: 0.5, wireframe: false });
  // const ground = new THREE.Mesh(groundGeometry, groundMaterial);

  // ground.rotation.x = -Math.PI / 2;
  // ground.receiveShadow = true;
  // ground.position.set(0,0,0)
  // ground.name = "ground";
  // scene.add(ground);

  // LIGHTS
  const hemilight = new THREE.HemisphereLight(0xf6ffff, 0xfffddc, 3)
  scene.add(hemilight);   

  //scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xeeeeff, 3));

  const light = new THREE.DirectionalLight(0xe6ffff, 10);
  //scene.add(light);    
  
  light.position.set(0, 1.2, -10);
  light.castShadow = true;  
  light.shadow.camera.left = -5;
  light.shadow.camera.right = 5;
  light.shadow.camera.top = 5;
  light.shadow.camera.bottom = -5;
  light.shadow.camera.near = 0.3;
  light.shadow.camera.far = 512;

  // light.position.set(0, 4, 0);
  // light.castShadow = true;
  // light.shadow.camera.top = 20;
  // light.shadow.camera.bottom = -2;
  // light.shadow.camera.right = 2;
  // light.shadow.camera.left = -3;

  light.shadow.mapSize.set(256*10,256*10);


    stats = new Stats();
    stats.dom.id = "myStats"  
    document.body.appendChild(stats.domElement);
    let myStats = document.getElementById("myStats");

    document.getElementById("myStats").setAttribute("style", "position: fixed; bottom: 0px; left: 0px; cursor: pointer; opacity: 0.9; z-index: 10000;")

}




function initShooting() {

    document.addEventListener('keyup', function(event) {
    
    console.log(event.key);

    // if (event.key.match(/^\d$/)) {  // Check if the key is a single digit
    //     iterateCameraData(event.key)
    // }

      if (event.keyCode === 32) {
        //shootBall()
      }

      // if (event.keyCode === 86) {
      //   dropSomething()
      // }

    })


}

function loadSkyboxTexture(basePath,ext) {

    let directions = ["px", "nx", "py", "ny", "pz", "nz"];
    let textureCubeImage = directions.map(dir => `${basePath}/${dir}.${ext}`);
    let textureCube = new THREE.CubeTextureLoader().load(textureCubeImage);

    textureCube.mapping = THREE.CubeRefractionMapping;
    return textureCube;
}


function initTerrain() {

  addModel("assets/models/terrain2.glb", "terrain", {x:0,y:-150,z:0})
  
  // let skyboxPath = "assets/images/skybox/3k/";    
  // scene.background = loadSkyboxTexture(skyboxPath,"png");

}


let hlsStreams = [

    {name:"apple_1", url:'assets/video/Apple/Apple_1/prog_index.m3u8' }, /// added folders for each video 
    {name:"apple_2", url:'assets/video/Apple/Apple_2/prog_index.m3u8' },
    {name:"apple_3", url:'assets/video/Apple/Apple_3/prog_index.m3u8' },
    {name:"apple_4", url:'assets/video/Apple/Apple_4/prog_index.m3u8' },
    {name:"apple_5", url:'assets/video/Apple/Apple_5/prog_index.m3u8' },
    {name:"apple_6", url:'assets/video/Apple/Apple_6/prog_index.m3u8' },

    {name:"local1", url:'assets/video/prog_index.m3u8' },
    {name: "bigBuckBunny", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"},
    {name: "appleBipbop", url: "http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8"},
    {name: "bbbTest", url: "https://test-streams.mux.dev/test_001/stream.m3u8"},
    {name: "sampleElephantsDream", url: "https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8"},
    {name: "sampleBigBuckBunny", url: "https://sample.vodobox.net/big_buck_bunny_4k/big_buck_bunny_4k.m3u8"},
    {name: "testPattern", url: "https://test-streams.mux.dev/pts_shift/master.m3u8"},
    {name: "demoNginx", url: "http://demo.unified-streaming.com/video/ateam/ateam.ism/ateam.m3u8"},
    {name: "angelOne", url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8"},
    {name: "angelTwo", url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8"},
    {name: "hlsVariantAudio", url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8"},
    {name: "sampleCosmosLaundromat", url: "https://sample.vodobox.net/cosmos_laundromat/cosmos_laundromat.m3u8"},
    {name: "sampleSitaSingsTheBlues", url: "https://sample.vodobox.net/sita_sings_the_blues/sita_sings_the_blues.m3u8"},
    {name: "sampleElephantsDream", url: "https://sample.vodobox.net/elephants_dream/elephants_dream.m3u8"},
    {name: "sampleOcean", url: "https://sample.vodobox.net/ocean/ocean.m3u8"},
    {name: "sampleBigBuckBunnyAlt", url: "https://sample.vodobox.net/big_buck_bunny/big_buck_bunny.m3u8"},
    {name: "sampleSkatePhantomFlex4k", url: "https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8"}
];

window.hlsStreams = hlsStreams;

let sceneConfig = [
    {texture: "Floor", videoTextureSrc: "apple_2"},
    {texture: "SmallScreen", videoTextureSrc: "apple_1"},
    {texture: "BigScreen", videoTextureSrc: "apple_4"},
    {texture: "StageCeiling_1152", videoTextureSrc: "apple_3"},
    {texture: "StageSmall1_512", videoTextureSrc: "apple_5"},
    {texture: "StageSmall2_512", videoTextureSrc: "apple_1"},
    {texture: "StageSmall3_512", videoTextureSrc: "apple_6"},
    {texture: "RearScreen", videoTextureSrc: "apple_1"},
    {texture: "RearCeiling_1024", videoTextureSrc: "apple_2"},
    {texture: "MegaScreen", videoTextureSrc: "apple_6"}

];

const streamName = (name) => hlsStreams.find(stream => stream.name === name)?.url;
const fallbackUrl = streamName("local1");

function getStreamParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const streamUrl = urlParams.get('stream');
    if (!streamUrl) return fallbackUrl;
    try {
        new URL(streamUrl);
        if (/\.m3u8$/.test(streamUrl)) return streamUrl;
    } catch (_) {
        return fallbackUrl;
    }
    return fallbackUrl;
}
window.getStreamParameter = getStreamParameter;

let videoTexture = {};
let videoMaterial = {};
let video = {};
let hls = {};

function setupVideoForMesh(meshName) {


    let previousVideoSrc = null; 

    const stream = streamName(sceneConfig.find(conf => conf.texture === meshName).videoTextureSrc);
    
    if (!stream) {
        console.error(`No stream found for meshName: ${meshName}`);
        return;
    }
    
    video[meshName] = document.createElement('video');
    video[meshName].width = 1024;
    video[meshName].height = 512;
    video[meshName].controls = true;
    video[meshName].autoplay = false;
    video[meshName].loop = true;
    document.body.appendChild(video[meshName]);
    
    if (video[meshName].canPlayType('application/vnd.apple.mpegurl')) {
        video[meshName].src = stream;
    } else if (Hls.isSupported()) {
        hls[meshName] = new Hls();
        hls[meshName].loadSource(stream);
        hls[meshName].attachMedia(video[meshName]);
    } else {
        console.error('HLS is not supported on this platform!');
    }
    
    videoTexture[meshName] = new THREE.VideoTexture(video[meshName]);
    videoMaterial[meshName] = new THREE.MeshBasicMaterial({ map: videoTexture[meshName], side: THREE.DoubleSide });
 //   video[meshName].addEventListener('play', () => {
   //     document.removeEventListener('click', tryPlayVideo);
     //   document.removeEventListener('touchstart', tryPlayVideo);
       // document.removeEventListener('keydown', tryPlayVideo);
  //  });
    

    /*
    function tryPlayVideo() {
        if (video[meshName].paused) video[meshName].play().catch(error => console.error('Video play failed:', error));
    }
    
    document.addEventListener('click', tryPlayVideo);
    document.addEventListener('touchstart', tryPlayVideo);
    document.addEventListener('keydown', tryPlayVideo);
*/
}


function videoGui() {

    const gui = new GUI({ autoPlace: false });
    gui.domElement.id = "videoGui";

    document.body.appendChild(gui.domElement);

    gui.domElement.style.position = 'fixed';
    gui.domElement.style.top = '0px';
    gui.domElement.style.left = '0px';
    const guiState = {};
    hlsStreams.forEach(stream => {
        guiState[stream.name] = stream.url;
    });

    const control = {
        syncVideos: function () {
            Object.keys(video).forEach(key => {
                video[key].currentTime = 0;
               video[key].play();  // Uncomment this if you want it to autoplay after resetting
            });
        } 
    };
      
    let previousVideoSrc = null; 

    const controlSTOP = {
        stopAllVideos: function() {
            Object.keys(video).forEach(key => {
                video[key].pause();
                video[key].currentTime = 0;  // Optional, if you want to also reset the video time
            });
        },
        
    };
    
    let allVideosPaused = false;  // Add this line to keep track of the state

    const controlPause = {
        pauseOrPlayAllVideos: function() {  
            Object.keys(video).forEach(key => {
                if (allVideosPaused) {
                    video[key].play();
                } else {
                    video[key].pause();
                }
            });
            allVideosPaused = !allVideosPaused;  // Toggle the state
        },
    };

    document.addEventListener('keydown', function(event) {
        if (event.keyCode === 50) {  // ASCII code for key '2'
            controlPause.pauseOrPlayAllVideos();  // Call your pause/play function
        }
    });
    

      // Add to dat.GUI
     gui.add(control, 'syncVideos').name('Sync/Reset');
    
     document.addEventListener('keydown', function(event) {
        if (event.keyCode === 49) {  // ASCII code for key '1'
            control.syncVideos();  // Call your pause/play function
        }
    });



    sceneConfig.forEach(config => {

        guiState[config.texture] = config.videoTextureSrc;

        gui.add(guiState, config.texture, Object.keys(guiState))

        .onChange(function(newValue) {
                
             // Debug log to print the value of previousVideoSrc
    previousVideoSrc = sceneConfig.find(conf => conf.texture === config.texture).videoTextureSrc;
    console.log("Previous video source: ", previousVideoSrc);

    // Debug log to print all keys in video object
    console.log("All keys in video object: ", Object.keys(video));
                
    if (video[previousVideoSrc]) {
        console.log(`Pausing video: ${previousVideoSrc}`);
        video[previousVideoSrc].pause();
    }

        
                
                // Update the videoTextureSrc in the sceneConfig
                let configItem = sceneConfig.find(conf => conf.texture === config.texture);
                if (configItem) {
                    configItem.videoTextureSrc = newValue;
                }
                // Setup the new video for the mesh
                setupVideoForMesh(config.texture);
                // Get the GLTF object from the scene


                // Play the newly selected video for this mesh
                if (video[newValue]) {
                    video[newValue].play();
                      }
                        console.log("Selected texture:", config.texture, "Selected video:", newValue);
                        


                let gltf = scene.getObjectByName("PAD");
                if (gltf) {
                    gltf.traverse(item => {
                        if (item.isMesh && item.name === config.texture) {
                            applyMaterialToMeshes(item, videoMaterial[config.texture]);
                        }
                    });
                } else {
                    console.warn("Couldn't find 'PAD' object in the scene.");
                }

                


            });

    });


    // The dummy object and save function
    const dataSaver = {
        save: function() {
            const data = JSON.stringify(sceneConfig, null, 2);
            const blob = new Blob([data], { type: 'text/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sceneConfig.json';
            a.click();
        }
    };

    gui.add(controlPause, 'pauseOrPlayAllVideos').name('Pause/Play');
    gui.add(controlPause, 'pauseOrPlayAllVideos').name('')
    .disable();
   
    // Add to dat.GUI
    gui.add(controlSTOP, 'stopAllVideos').name('Stop All Videos');
   
    document.addEventListener('keydown', function(event) {
        if (event.keyCode === 51) {  // ASCII code for key '3'
            controlSTOP.stopAllVideos();  // Call your pause/play function
        }
    });


    // Add the save function to the GUI
    gui.add(dataSaver, 'save').name('Save SceneConfig');
    // Dummy object and load function
    const dataLoader = {
        load: function() {
            fileInput.click(); // trigger the hidden file input's click event
        }
    };

    // Add the load function to the GUI
    gui.add(dataLoader, 'load').name('Load SceneConfig');

}

let fileInput;

function videoGuiLoader() {

    // Create a hidden file input to handle file selection
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json'; // only allow .json files
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const loadedData = JSON.parse(e.target.result);
                if (Array.isArray(loadedData)) {

                    sceneConfig.length = 0;
                    
                    Array.prototype.push.apply(sceneConfig, loadedData);

                    sceneConfig = loadedData;
                    sceneConfig.forEach(config => {

                       let gltf = scene.getObjectByName("PAD");
                        if (gltf) {
                            gltf.traverse(item => {
                                if (item.isMesh && item.name === config.texture) {
                                    setupVideoTexturesForGLTFItem(item)
                                }
                            });
                        } else {
                            console.warn("Couldn't find 'PAD' object in the scene.");
                        }
                    });

                    // Refresh the GUI
                    document.getElementById("videoGui").remove();
                    videoGui();

                } else {
                    console.error("Invalid JSON format.");
                }
            };
            reader.onerror = function(error) {
                console.error("Error reading the JSON file:", error);
            };
            reader.readAsText(file);
        }
    });


}


function updateVideos() {
    for (let configItem of sceneConfig) {
        let meshName = configItem.texture;
        if (video[meshName] && video[meshName].readyState === video[meshName].HAVE_ENOUGH_DATA) videoTexture[meshName].needsUpdate = true;
    }
}

function applyMaterialToMeshes(node, material) {
    if (node.isMesh) node.material = material;
    else if (node.isGroup) node.children.forEach(child => applyMaterialToMeshes(child, material));
}

function setupVideoTexturesForGLTFItem(item) {

    if(!item.isMesh) return

    const configItem = sceneConfig.find(conf => conf.texture === item.name);
    if (configItem) {
        setupVideoForMesh(configItem.texture);
        applyMaterialToMeshes(item, videoMaterial[configItem.texture]);
    }
}

function updateStats() {

    if(stats) {
        stats.update()
    }

}


/* Scene */

function initScene() {

  console.log("initScene")

  addScene();

  //setupVideo();

  //loadTextures();

  restoreCameraPosition();

  //initControllers();

  dumpMachine();

  initShooting();

  initSky();

  //initTerrain();

  cleanBalls();

  videoGui();
  videoGuiLoader();

  window.addEventListener('resize', onWindowResize, false);


}


// gltf.scene.traverse(node => {
//     if (node.name === "Floor" || node.name === "Screen") {
//         applyMaterialToMeshes(node, videoMaterial);
//     }
// });



function addClub() {

    console.log("addClub");
    
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('draco_decoder/');
    
    const loader = new GLTFLoader();
    
    loader.setDRACOLoader(dracoLoader);
    
    loader.load(clubModel, gltf => {
        let mesh = gltf.scene
        mesh.name = "PAD"
        scene.add(mesh);

        if (gltf.animations && gltf.animations.length > 0) {
            console.log("gltf.animations",gltf.animations)
            mixer = new THREE.AnimationMixer(mesh);
            // Playing all animations
            for (let i = 0; i < gltf.animations.length; i++) {
                mixer.clipAction(gltf.animations[i]).play();
            }
        }

        gltf.scene.traverse(item => {

          if ((/^Lamp(\d*)$/).test(item.name) && item.isGroup && item.children[1] && item.children[1].material) {
              item.children[0].material.transparent = true;
              item.children[0].material.opacity = 0;
              lamps.push({
                  mesh: item.children[0],
                  isIncreasing: true  // initially set to increasing for all lamps
              });
              console.log("+ Lamp added:", item.name)
          }

        if (item.isMesh) {

                console.log("isMesh:", item.name)
            
                setupVideoTexturesForGLTFItem(item)


            
                const geometry = item.geometry;
                item.castShadow = true;     // allows the node to cast shadows
                item.receiveShadow = true;                 
            
                // you can swap material for refractions
                // item.material = new THREE.MeshPhongMaterial({ 
                //     transparent: true,  opacity: 0.1, 
                //     color: 0xFFFFFF
                //     //color: 0xFFFFFF, envMap: envMap1, refractionRatio: 0.98, reflectivity: 0.98
                // });
                //console.log(geometry)

                const vertices = geometry.attributes.position.array;
                const indices = geometry.index.array;
                const trimesh = new RAPIER.TriMesh(vertices, indices);
                // console.log('TriMesh created successfully', trimesh);
                // console.log('Vertices length:', vertices.length);
                // console.log('Indices length:', indices.length);

                let groundColliderDesc = RAPIER.ColliderDesc.trimesh(trimesh)
                    .setDensity(100)
                    .setTranslation(0, groundHeight, 0)
                    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
                // this part is a kind of hack...

                groundColliderDesc.shape.indices = indices;
                groundColliderDesc.shape.vertices = vertices;

                let groundCollider = world.createCollider(groundColliderDesc);
                window.groundColliderHandle = groundCollider.handle;
                window.myRapierWorld = world;
                window.eventQueue = eventQueue;

            }
        

        })

    })
}



import('@dimforge/rapier3d').then(rapierModule => {

    //console.log("init rapierModule")

    initScene();

    RAPIER = rapierModule;

    world = new RAPIER.World(gravity);
    eventQueue = new RAPIER.EventQueue(true);

    //addRapierGround();

    addClub()

    animate();

});


/* Lamps */
let lamps = [];
window.lamps = lamps

let lastBlinkTime = Date.now();

function updateLamps() {
    const blinkInterval = 200;  // Time in milliseconds for each blink

    const currentTime = Date.now();
    if (currentTime - lastBlinkTime >= blinkInterval) {
        for (let lampObj of lamps) {
            const lamp = lampObj.mesh;

            // Toggle opacity between 0 and 1 for the blink effect
            lamp.material.opacity = (lamp.material.opacity === 0.3) ? 1 : 0.3;
        }

        lastBlinkTime = currentTime;  // Update the lastBlinkTime to the current time
    }
}



/* Animation Mixer */

let mixer
const clock = new THREE.Clock();

function updateMixer() {

    if (mixer) {
        mixer.update(clock.getDelta());
    }

}


function addRapierGround() {

    console.log("addRapierGround");


    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('draco_decoder/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load('assets/models/crane1.glb', gltf => {
        let mesh = gltf.scene
        mesh.name = "PAD"
        scene.add(mesh);


        if (gltf.animations && gltf.animations.length > 0) {
            console.log("gltf.animations",gltf.animations)
            mixer = new THREE.AnimationMixer(mesh);
            
            // Playing all animations
            for (let i = 0; i < gltf.animations.length; i++) {
                mixer.clipAction(gltf.animations[i]).play();
            }
        }          

        
        gltf.scene.traverse(item => {


            // /* add lamps for animation */
            // if (/^Lamp\d+$/.test(String(item.name))) {
            //   console.log("+ Lamp added:", item.name)
            //   lamps.push(item);
            // }
          
          if ((/^Lamp(\d*)$/).test(item.name) && item.isGroup && item.children[1] && item.children[1].material) {
              item.children[0].material.transparent = true;
              item.children[0].material.opacity = 0;
              lamps.push({
                  mesh: item.children[0],
                  isIncreasing: true  // initially set to increasing for all lamps
              });
              console.log("+ Lamp added:", item.name)
          }




            if (item.isMesh) {

                console.log("isMesh:", item.name)

                const geometry = item.geometry;

                item.castShadow = true;     // allows the node to cast shadows
                item.receiveShadow = true;                 
              
                // you can swap material for refractions
                // item.material = new THREE.MeshPhongMaterial({ 
                //     transparent: true,  opacity: 0.1, 
                //     color: 0xFFFFFF
                //     //color: 0xFFFFFF, envMap: envMap1, refractionRatio: 0.98, reflectivity: 0.98
                // });
              
                //console.log(geometry)
                const vertices = geometry.attributes.position.array;
                const indices = geometry.index.array;
                const trimesh = new RAPIER.TriMesh(vertices, indices);

                // console.log('TriMesh created successfully', trimesh);
                // console.log('Vertices length:', vertices.length);
                // console.log('Indices length:', indices.length);
                
                let groundColliderDesc = RAPIER.ColliderDesc.trimesh(trimesh)
                    .setDensity(100)
                    .setTranslation(0, groundHeight, 0)
                    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
                // this part is a kind of hack...
                groundColliderDesc.shape.indices = indices;
                groundColliderDesc.shape.vertices = vertices;
                let groundCollider = world.createCollider(groundColliderDesc);

                window.groundColliderHandle = groundCollider.handle;
                window.myRapierWorld = world;
                window.eventQueue = eventQueue;




            }
        })

    })


}


function cleanBalls() {

    if(Math.random()*1 > 0.5) return;
    setInterval(()=>removeAllCubes(), 30000)

}



function removeAllCubes() {
    // Remove from Three.js
    for (let i = 0; i < window.threeCubes.length; i++) {
        scene.remove(window.threeCubes[i]);
    }
    
    // Remove from Rapier
    for (let i = 0; i < window.rigidBodies.length; i++) {
        myRapierWorld.removeRigidBody(window.rigidBodies[i]);
    }
    
    // Clear arrays
    window.threeCubes = [];
    window.rigidBodies = [];
}

window.removeAllCubes = removeAllCubes;


function addBallFromShotLineEnd2(line, radius, color, density = 1, speedFactor = 10) {

    console.log(line, radius, color, density, speedFactor)

    if (!line) {
        console.log("Teleport line is not defined");
        return;
    }

    console.log("addBallFromShotLineEnd2 ???")
  
    const linePoints = line.geometry.attributes.position.array;
    const endPoint = new THREE.Vector3(linePoints[3], linePoints[4], linePoints[5]);
  
    // Get the direction from the starting point to the endpoint
    const startPoint = new THREE.Vector3(linePoints[0], linePoints[1], linePoints[2]);
    const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
  
    // Calculate speed factor
    //const speedFactor = 10 + Math.random() * 0.1;
  
    // Create the rigid body description and set its properties
    let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(endPoint.x, endPoint.y, endPoint.z)
        .setLinvel(direction.x * speedFactor, direction.y * speedFactor, direction.z * speedFactor);
    let rigidBody = myRapierWorld.createRigidBody(rigidBodyDesc);

    //let texture = texturesCache[Math.floor(Math.random() * texturesCache.length)].texture;
    // const texture = new THREE.MeshPhongMaterial({ 
    //     color: color
    // });    

    const sphereGeometry = new THREE.SphereGeometry(radius);
    
    const myBallMaterial = new THREE.MeshStandardMaterial({ color: color });
  
    //const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    const sphereMesh = new THREE.Mesh(sphereGeometry, myBallMaterial);
    sphereMesh.scale.set(radius, radius, radius); // scale the geometry
    sphereMesh.material.color.set(color); // update the material color
    sphereMesh.rotation.set(0, 90 * (Math.PI / 180), 0);
    sphereMesh.position.copy(endPoint);

    scene.add(sphereMesh);

    console.log("sphereMesh", sphereMesh)
  
    // Create the collider
    let colliderDesc = RAPIER.ColliderDesc.ball(radius).setDensity(density);
    let collider = myRapierWorld.createCollider(colliderDesc, rigidBody);
  
    // Save for global access
    window.colliderHandles = window.colliderHandles || [];
    window.colliderHandles.push(collider.handle);
    window.rigidBodies.push(rigidBody);
    window.threeCubes.push(sphereMesh); // Consider renaming this array

}


window.addBallFromShotLineEnd2 = addBallFromShotLineEnd2;


function shootBallXR(handNum) {
    console.log("XR pinch!");
    let ballSize = 0.15 + Math.random()*0.01
    let density = 10
    let speedFactor = 12
    addBallFromShotLineEnd2(shot["shotLine"+handNum], ballSize, colorsSet[Math.floor(Math.random()*colorsSet.length)], density, speedFactor)
}
window.shootBallXR = shootBallXR;


function addBallFromTop(radius, color, offsetY = 0.2, density = 1, position) {
    const speedFactor = 5 + Math.random() * 5;
    let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
                          .setTranslation(position.x, position.y, position.z)
                          .setLinvel(0 * speedFactor, -1 * speedFactor, 0 * speedFactor);
    let rigidBody = myRapierWorld.createRigidBody(rigidBodyDesc);
    // Sphere Core
    const sphereGeometry = new THREE.SphereGeometry(radius);

    // const myBallMaterial = new THREE.MeshPhongMaterial({ 
    //     color: color, envMap:textureCube, refractionRatio: 0.98, reflectivity: 0.9
    // })

    const myBallMaterial = new THREE.MeshPhongMaterial({ 
        color: color
    });

    const sphereMesh = new THREE.Mesh(sphereGeometry, videoMaterial);
    scene.add(sphereMesh);
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;
    let colliderDesc = RAPIER.ColliderDesc.ball(radius).setDensity(density);
    let collider = myRapierWorld.createCollider(colliderDesc, rigidBody);
    window.colliderHandles = window.colliderHandles || [];
    window.colliderHandles.push(collider.handle);
    window.rigidBodies.push(rigidBody);
    window.threeCubes.push(sphereMesh);  // Consider renaming `threeCubes` to a more appropriate name like `threeSpheres`
}
window.addBallFromTop = addBallFromTop;

function addBallFromCamera(radius, color, offsetY = 0.2, density = 1) {

    // Get camera position and direction
    const cameraPosition = camera.position;
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    // Apply offset to the Y-component of the camera direction
    cameraDirection.y += offsetY;
    // Normalize the direction vector after applying the offset
    cameraDirection.normalize();
    // Speed factor to apply to the camera direction for the ball velocity
    const speedFactor = 15;
    // Create the rigid body description and set its properties
    let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
                          .setTranslation(cameraPosition.x, cameraPosition.y, cameraPosition.z)
                          .setLinvel(cameraDirection.x * speedFactor, cameraDirection.y * speedFactor, cameraDirection.z * speedFactor);
    let rigidBody = myRapierWorld.createRigidBody(rigidBodyDesc);
    
    //let texture = texturesCache[Math.floor(Math.random() * texturesCache.length)].texture;
    
    let texture = videoTexture;

      // Sphere Core
      const sphereGeometry = new THREE.SphereGeometry(radius,16,12);
      //const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
      const myBallMaterial = new THREE.MeshStandardMaterial({ map: texture });
      const sphereMesh = new THREE.Mesh(sphereGeometry, myBallMaterial);
      scene.add(sphereMesh);
      // Create the collider
      let colliderDesc = RAPIER.ColliderDesc.ball(radius*1.05).setDensity(density)
      let collider = myRapierWorld.createCollider(colliderDesc, rigidBody);
      // Save the collider handle
      window.colliderHandles = window.colliderHandles || [];
      window.colliderHandles.push(collider.handle); 
      // Push the rigid body and the Three.js sphere to the global arrays:
      window.rigidBodies.push(rigidBody);
      window.threeCubes.push(sphereMesh);  // Consider renaming this array for clarity
}

window.addBallFromCamera = addBallFromCamera;


function shootBallFromTop(ballBaseSize = 0.2, randmFactor = 0.005) {
    if (typeof myRapierWorld === 'undefined' || !myRapierWorld) return;
    
    let ballSize = ballBaseSize + Math.random() * randmFactor;
    let rf = 1;
    let startY = 7;
    let x = Math.random() * rf * 1 - Math.random() * rf * 1;
    let y = startY + Math.random() * rf - Math.random() * rf;
    let z = -4 + Math.random() * rf - Math.random() * rf;
    let idx = Math.floor(Math.random() * 32);
    let color = cols.variants[window.colsVariantsIdx][idx];

    addBallFromTop(ballSize, color, 0.1, 10, { x: x, y: y, z: z });
}
window.shootBallFromTop = shootBallFromTop;



function shootBall() {

    console.log("shootBall - Spacebar released!");

    let ballSize = 0.15 + Math.random()*0.01;

    // addBallFromCamera(radius, color, offsetY = 0.2, density = 1) {
    
    addBallFromCamera(ballSize, colorsSet[Math.floor(Math.random()*colorsSet.length)], 0.1, 30)
    
    //addBallFromShotLineEnd(ballSize, colorsSet[Math.floor(Math.random()*colorsSet.length)], 0.1, 1)
    //au.playAudioFromFile(au.findSounds(audioData, "kick2")[0])
}
window.shootBall = shootBall;



// function dropSomething() {
//   if(Math.random()*1 > 0.3) {
//     shootBallFromTop()
//   }
// }


function dumpMachine() {

  setInterval(()=> {
    let s = 0.1 + Math.random()*2
     shootBallFromTop(s);
  }, 1500)

}


function updateRapier() {


    if (window.myRapierWorld && window.rigidBodies) {

        //window.myRapierWorld.step();
        window.myRapierWorld.step(window.eventQueue);

        //console.log(window.rigidBodies)

        for(let i = 0; i < window.rigidBodies.length; i++) {

            if(window.rigidBodies[i].bodyType() == 0) {

                let position = window.rigidBodies[i].translation();
                window.threeCubes[i].position.set(position.x, position.y, position.z);

                // Add this part to update the rotation
                let rotation = window.rigidBodies[i].rotation(); // Assuming the rotation method returns a quaternion
                window.threeCubes[i].quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
            }
        }

        // - TO DO
        // logEvents()


    }
}



function onXRSessionStart() {    
    const session = renderer.xr.getSession();
    console.log("onSessionStart session", session);
    session.requestReferenceSpace('local').then((referenceSpace) => {
        xrRefSpace = referenceSpace;
    });
}

function onXRSessionEnd() {
    console.log("onSessionEnd")
    if (renderer.xr.isPresenting) {
        renderer.xr.end();
    }
}

function saveCameraPosition() {
    const cameraData = {
        position: camera.position.clone(),
        rotation: camera.rotation.clone()
    };
    const controlsData = { target: controls.target.clone() };

    // Store individual data (optional based on your use case)
    localStorage.setItem('cameraData', JSON.stringify(cameraData));
    localStorage.setItem('controlsData', JSON.stringify(controlsData));

    // Store combined data
    cameraPositions.push({ camera: cameraData, controls: controlsData });
    localStorage.setItem('cameraPositions', JSON.stringify(cameraPositions));

    console.log(JSON.stringify(cameraPositions[cameraPositions.length-1]));




}



function restoreCameraPosition() {
    try {
        if (localStorage.getItem('cameraPositions') && camera) {
            let data = JSON.parse(localStorage.getItem('cameraPositions'));
            let cam = data[data.length-1].camera;
            let con = data[data.length-1].controls;

            camera.position.copy(new THREE.Vector3().copy(cam.position));
            camera.rotation.set(cam.rotation.x, cam.rotation.y, cam.rotation.z);

            if(controls) {
                controls.target.copy(new THREE.Vector3().copy(con.target));
            }
        } else {
            // Use the default values if no data is available in localStorage
            camera.position.copy(new THREE.Vector3().fromJSON(JSON.parse(DEFAULT_CAMERA_POS)));
            
            let defaultRot = JSON.parse(DEFAULT_CAMERA_ROT);
            camera.rotation.set(defaultRot._x, defaultRot._y, defaultRot._z);

            if(controls) {
                controls.target.copy(new THREE.Vector3().fromJSON(JSON.parse(DEFAULT_CONTROLS_TARGET)));
            }
        }
        controls.update();
    } catch(error) {
        console.error('Error restoring camera position:', error);
    }
}
window.restoreCameraPosition = restoreCameraPosition;
  


function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


function render(timeStamp, xrFrame) {

  if(!camera || !scene) return;

  //console.log(timeStamp, xrFrame)
    
    if(controls) {
      // console.log("controls")
      // controls.update();
    }

    // if (xrFrame && xrRefSpace) {
    //     const hands = [...xrFrame.session.inputSources].filter(inputSource => inputSource?.hand);
    //     if (hands.length) {
    //         updateHands(hands, xrFrame, xrRefSpace);
    //         handyWorkUpdate(hands, xrRefSpace, xrFrame, poseDetected);
    //     }
    // }

    updateStats()

    updateRapier();

    //updateVideo();
    updateVideos();

    updateLamps();

    updateMixer()

    try {
       renderer.render(scene, camera);
    } catch (error) {
       console.error("Error rendering:", error);
    }

}


function animate() {
    console.log("animate");
    renderer.setAnimationLoop(render);
}
