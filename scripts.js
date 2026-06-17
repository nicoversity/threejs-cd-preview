/*
 *  Filename: scripts.js
 *  Description: Functions (dynamic behavior) for the cylindrical display preview.
 *
 *  Version: 2026.06
 *  Authors: Nico Reski
 *  GitHub: https://github.com/nicoversity
 */

// === DEPENDENCIES ===
// * Three.js r184  : https://github.com/mrdoob/three.js

// === DOCS ===
// Three.js: https://threejs.org/docs/
// First Three.js Project: https://threejs-journey.com/lessons/first-threejs-project

// === IMPLEMENTED INTERACTIONS ===
// pointer (mouse):
//      LEFT hold + move:   orbit camera (around look-at point)
//      WHEEL:              zoom in/out (towards look-at point)
// keyboard:
//      ARROW RIGHT:        switch to next cylindrical display texture
//      ARROW LEFT:         switch to previous cylindrical display texture

// === IMPORT STATEMENTS ===
import { CDData } from "./data.js";
import { CDSceneConfig, CDConfig } from "./config.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// === HTML / DOM PREPARATION ===
// margin of the body (according to settings in styles.css)
let htmlBodyMargin = window.getComputedStyle(document.body).getPropertyValue('margin-top');
htmlBodyMargin = htmlBodyMargin.substring(0, htmlBodyMargin.length-2);

// references to HTML DOM nodes
const canvas = document.getElementById("threejs-canvas");
const nextPreviewUi = document.getElementById("next-preview-ui");
const videoPlaybackUi = document.getElementById("video-playback-ui");
const videoPlaybackLabel = document.getElementById("video-playback-label");

// === EVENT LISTENERS ===
// automatically invoked once the initial loading of the web page has been completed (.html file is completely parsed) 
document.addEventListener("DOMContentLoaded", function(){
    // override default canvas size
    CDSceneConfig.canvas.width = window.innerWidth - htmlBodyMargin * 2;
    CDSceneConfig.canvas.height = window.innerHeight - htmlBodyMargin * 2;

    // set up UI elements
    nextPreviewUi.addEventListener("click", DisplayNextTexture);
    if(CDData.length >= 2) nextPreviewUi.style.display = "block";

    // trigger initialization for video playback support
    VideoInit();

    // trigger Three.js scene initialization
    CdSceneInit();
});

// automatically invoked every time a keydown event (= press on the keyboard) is detected
document.addEventListener("keydown", function(event){
    // only trigger if the keyboard event is trusted
    if(event.isTrusted){
        switch(event.key)
        {
            // --- utilize arrow right/left to iterate through all textures for cylindrical display preview ---
            case "ArrowRight":
                DisplayNextTexture();
                break;

            case "ArrowLeft":
                DisplayPreviousTexture();
                break;

            // --- toggle display of gui ---
            case "g":
                if(nextPreviewUi.style.display === "none") {
                    nextPreviewUi.style.display = "block";
                    if(CDData[displayedTextureIndex].isVideo) videoPlaybackUi.style.display = "block";
                }
                else { 
                    nextPreviewUi.style.display = "none";
                    if(CDData[displayedTextureIndex].isVideo) videoPlaybackUi.style.display = "none";
                }

                break;

            default:
                break;
        }
    }
});

// automatically invoked every time the browser window is resized
window.addEventListener("resize", function(event){
    // override sizes
    CDSceneConfig.canvas.width = window.innerWidth - htmlBodyMargin * 2;
    CDSceneConfig.canvas.height = window.innerHeight - htmlBodyMargin * 2;

    // update Three.js camera and renderer
    camera.aspect = CDSceneConfig.canvas.width / CDSceneConfig.canvas.height;
    camera.updateProjectionMatrix();
    renderer.setSize(CDSceneConfig.canvas.width, CDSceneConfig.canvas.height);
});

// function to display the next texture in the cylindrical display preview
function DisplayNextTexture(){
    // iterate to the next texture index
    if(CDData.length > 1){
        displayedTextureIndex = displayedTextureIndex + 1;
        if(displayedTextureIndex >= CDData.length) displayedTextureIndex = 0;
    }
    // update the displayed texture in the Three.js scene
    UpdateCdPreviewForIndex(displayedTextureIndex);
}

// function to display the previous texture in the cylindrical display preview
function DisplayPreviousTexture(){
    // iterate to the previous texture index
    if(CDData.length > 1){
        displayedTextureIndex = displayedTextureIndex - 1;
        if(displayedTextureIndex < 0) displayedTextureIndex = CDData.length - 1;
    }
    // update the displayed texture in the Three.js scene
    UpdateCdPreviewForIndex(displayedTextureIndex);
}

// helper function to initialize variables to support video playback
function VideoInit(){
    // add event listener to video playback UI
    videoPlaybackUi.addEventListener("click", ToggleVideoPlayback);

    // --- HTML video element node ---
    video = document.createElement("video");
    video.loop = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.muted = true;
}

// function to toggle (play/pause) video playback
// note: manual (user controlled) triggering of initial play is required to support video playback with audio (browser security settings commonly prevent autoplay of videos with audio)
function ToggleVideoPlayback(){
    // unmute video
    video.muted = false;

    // play / pause video playback + UI update
    if(video.paused == true){
        video.play();
        videoPlaybackLabel.innerText = "[ Pause ]";
    } else {
        video.pause();
        videoPlaybackLabel.innerText = "[ Play ]";
    }
}

// === THREEJS IMPLEMENTATION ===
// global scene variables
let scene = null;
let camera = null;
let renderer = null;
let timer = null;
let deltaTime = 0;
let controls = null;

let cdTex = null;
let cdMat = null;

let video = null;
let videoTex = null;

// initialization of the Three.js scene
function CdSceneInit(){
    // two step initialization routine:
    // 1. Load all image texture assets for preview in the cylindrical display, then
    // 2. Build Three.js scene, under utilization of prior loaded assets

    LoadTextures(textureLoader, 0, CDData.length);
}

// texture (asset) loading
// TextureLoader: https://threejs.org/docs/#TextureLoader
let displayedTextureIndex = 0;
const textureLoader = new THREE.TextureLoader();

function LoadTextures(textureLoader, textureIndex, textureCount) {

    // normal case: load next image texture asset
    if(CDData[textureIndex].isVideo == false){
        textureLoader.load(
            // resource URL
            CDData[textureIndex].textureUrl,
            
            // onLoad callback
            function ( texture ) {
                // configure texture for correct preview in the cylindrical display
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.wrapS = THREE.RepeatWrapping;
                texture.repeat.x = - 1;
                
                // keep track of loaded texture, by adding it as a value to a new key "loadedTexture"
                CDData[textureIndex].loadedTexture = texture;
                
                // load next texture, or move to next step in initialization routine
                textureIndex = textureIndex + 1;
                if(textureIndex < textureCount) LoadTextures(textureLoader, textureIndex, textureCount);
                else BuildScene();
            },
            
            // onProgress callback currently not supported
            undefined,
            
            // onError callback
            function(err) {
                console.log("[scripts.js] LoadTextures error");
            }
        );
    }
    // alternative case: skip if texture is a video (note: video texture loading is handled separately on demand)
    else {
        // load next texture, or move to next step in initialization routine
        textureIndex = textureIndex + 1;
        if(textureIndex < textureCount) LoadTextures(textureLoader, textureIndex, textureCount);
        else BuildScene();
    }
}

// main function to build (compose) the 3D scene
function BuildScene()
{
    // --- scene start ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CDSceneConfig.background);

    // --- scene contents ---
    // note: unit convention: 1 unit == 1 meter

    // --- lights ---
    // PointLight: https://threejs.org/docs/#PointLight
    const pointLight = new THREE.PointLight( 0xffffff, 4, 40, 0);
    pointLight.position.set( 0, 6, 0 );
    scene.add( pointLight );
    
    // AmbientLight: https://threejs.org/docs/#AmbientLight
    const ambientLight = new THREE.AmbientLight( 0xffffff );
    scene.add( ambientLight );

    // --- 360 degree cylindrical display ---
    // Part 1: curved texture for texture rendering
    // CylinderGeometry: https://threejs.org/docs/#CylinderGeometry
    const cdGeom = new THREE.CylinderGeometry(CDConfig.radius, CDConfig.radius, CDConfig.height,
        CDConfig.geometry.radialSegments, CDConfig.geometry.heightSegments, CDConfig.geometry.openEnded, CDConfig.geometry.thetaStart, CDConfig.geometry.thetaEnd);
    
    cdMat = new THREE.MeshBasicMaterial( {
        color: 0xffffff,
        wireframe: false,
        side: THREE.BackSide }
    );

    const cdMesh = new THREE.Mesh(cdGeom, cdMat);
    cdMesh.position.y = CDConfig.height * 0.5 + CDConfig.aboveGround;
    scene.add(cdMesh);

    // handle initial (first) texture display via material's .map property
    UpdateCdPreviewForIndex(displayedTextureIndex);

    // Part 2: 3D model
    // create 2D ring shape (inner and outer) that is then extruded 
    const cdInnerModelGeom = new THREE.CircleGeometry(CDConfig.radius + CDConfig.model.offset, CDConfig.model.radialSegments); 
    const cdOuterModelGeom = new THREE.CircleGeometry(CDConfig.radius + CDConfig.model.width - CDConfig.model.offset, CDConfig.model.radialSegments); 
    const cdInnerModelEdges = new THREE.EdgesGeometry( cdInnerModelGeom ); 
    const cdOuterModelEdges = new THREE.EdgesGeometry( cdOuterModelGeom ); 
    const cdInnerModelShape = new THREE.Shape();
    const cdOuterModelShape = new THREE.Shape();

    const cdInnerModelEdgeVertices = cdInnerModelEdges.attributes.position.array;
    cdInnerModelShape.moveTo(cdInnerModelEdgeVertices[0], cdInnerModelEdgeVertices[1]);
    for(let i = 3; i < cdInnerModelEdgeVertices.length; i=i+3){
        cdInnerModelShape.lineTo(cdInnerModelEdgeVertices[i], cdInnerModelEdgeVertices[i+1]);
    }
    cdInnerModelShape.lineTo(cdInnerModelEdgeVertices[0], cdInnerModelEdgeVertices[1]);

    const cdOuterModelEdgeVertices = cdOuterModelEdges.attributes.position.array;
    cdOuterModelShape.moveTo(cdOuterModelEdgeVertices[0], cdOuterModelEdgeVertices[1]);
    for(let i = 3; i < cdOuterModelEdgeVertices.length; i=i+3){
        cdOuterModelShape.lineTo(cdOuterModelEdgeVertices[i], cdOuterModelEdgeVertices[i+1]);
    }
    cdOuterModelShape.lineTo(cdOuterModelEdgeVertices[0], cdOuterModelEdgeVertices[1]);

    cdOuterModelShape.holes.push(cdInnerModelShape);

    const cdModelGeom = new THREE.ExtrudeGeometry(cdOuterModelShape, {
        steps: 1,
        depth: CDConfig.height,
        bevelEnabled: true,
        bevelThickness: 0,
        bevelSize: 0,
        bevelOffset: 0,
        bevelSegments: 0
    });
    const cdModelMat = new THREE.MeshStandardMaterial({
        color: CDConfig.model.color,
        emissive: 0x000000,
        roughness: 1,
        metalness: 0,
        flatShading: false
    });
    const cdModelMesh = new THREE.Mesh(cdModelGeom, cdModelMat) ;
    cdModelMesh.setRotationFromEuler(new THREE.Euler(90 * Math.PI / 180, 0, 0, "XYZ"));
    cdModelMesh.position.y = CDConfig.height + CDConfig.aboveGround;
    scene.add(cdModelMesh);
    
    // --- camera ---
    // PerspectiveCamera: https://threejs.org/docs/#PerspectiveCamera
    camera = new THREE.PerspectiveCamera(CDSceneConfig.camera.fov, CDSceneConfig.canvas.width / CDSceneConfig.canvas.height, CDSceneConfig.camera.near, CDSceneConfig.camera.far);
    camera.position.set(CDSceneConfig.camera.pos.x, CDSceneConfig.camera.pos.y, CDSceneConfig.camera.pos.z);
    scene.add(camera);

    // --- renderer ---
    // WebGLRenderer: https://threejs.org/docs/#WebGLRenderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setSize(CDSceneConfig.canvas.width, CDSceneConfig.canvas.height);
    renderer.render(scene, camera);

    // --- timer ---
    // Timer: https://threejs.org/docs/#Timer
    timer = new THREE.Timer();
    timer.connect(document);    // use Page Visibility API

    // --- controls ---
    // OrbitControls: https://threejs.org/docs/#OrbitControls
    controls = new OrbitControls( camera, renderer.domElement );
    controls.minDistance = 0.1;     // perspective camera only
    controls.maxDistance = 20.0;    // perspective camera only
    // controls.minZoom = 0.1;
    // controls.maxZoom = 18.0;
    controls.minPolarAngle = 0.0 * Math.PI;
    controls.maxPolarAngle = 1.0 * Math.PI;
    // controls.minAzimuthAngle = -1.0 * Math.PI;
    // controls.maxAzimuthAngle = 1.0 * Math.PI;
    controls.enablePan = false;
    controls.target = new THREE.Vector3(CDSceneConfig.camera.lookAt.x, CDSceneConfig.camera.lookAt.y, CDSceneConfig.camera.lookAt.z);

    // --- handle interactivity ---
    Animate();
}

// preform rendering
function Animate(){
    requestAnimationFrame(Animate);

    // ensure timer update
    timer.update();

    // get interval in seconds from last animation frame to current animation frame
    deltaTime = timer.getDelta();

    // required if controls.enableDamping or controls.autoRotate are set to true
    controls.update(deltaTime);      // frame rate (refresh rate of display) independent

    // additional 3D object manipulations go in here
    renderer.render(scene, camera);
}

// update the rendered texture (image or video) on the cylindrical display in the Three.js scene
function UpdateCdPreviewForIndex(index){
    
    // video cleanup (if needed)
    if(video != null) video.pause();
    if(videoTex != null) videoTex.dispose();

    // normal case: the texture is an image
    if(CDData[index].isVideo == false){
        // assign preloaded image texture data
        cdTex = CDData[index].loadedTexture;

        // update video playback ui
        videoPlaybackUi.style.display = "none";
    }
    // alternative case: the texture is a video
    else {
        // --- HTML video element node ---
        video.src = CDData[index].textureUrl;

        // --- video texture ---
        // VideoTexture: https://threejs.org/docs/#VideoTexture
        videoTex = new THREE.VideoTexture(video);
        videoTex.colorSpace = THREE.SRGBColorSpace;
        videoTex.wrapS = THREE.RepeatWrapping;
        videoTex.repeat.x = - 1;

        // assign created video texture data
        cdTex = videoTex;

        // update video playback ui
        videoPlaybackUi.style.display = "block";
        videoPlaybackLabel.innerText = "[ Play ]";
    }

    // update cylindrical display material with updated texture data
    // MeshBasicMaterial .map: https://threejs.org/docs/#MeshBasicMaterial.map
    // Material .needsUpdate: https://threejs.org/docs/#Material.needsUpdate
    cdMat.map = cdTex;
    cdMat.needsUpdate = true;
}
