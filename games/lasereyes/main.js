import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GUI } from 'lil-gui';

// DOM Elements
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const debugCanvas = document.getElementsByClassName('debug_canvas')[0];
const debugCtx = debugCanvas.getContext('2d');
const laserBtn = document.getElementById('laserBtn');
const captureBtn = document.getElementById('captureBtn');

let isDebugMode = false;
let isLaserMode = true;

const settings = {
    showLandmarks: false
};

let landmarksController;

function toggleDebug() {
    isDebugMode = !isDebugMode;
    settings.showLandmarks = isDebugMode;
    if (landmarksController) landmarksController.updateDisplay();
    
    if (!isDebugMode) {
        debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
    }
}

function toggleLaser() {
    isLaserMode = !isLaserMode;
    // G.GUI Visual Feedback
    laserBtn.style.background = isLaserMode ? "var(--neon-red)" : "transparent";
    laserBtn.style.color = isLaserMode ? "#000" : "var(--neon-red)";
    
    if (!isLaserMode) {
        lasers.forEach(l => l.visible = false);
    }
}

function captureImage() {
    if (isLaserMode) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
    
    const dataURL = canvasElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'LAZER_PROTOCOL_EXPORT.png';
    link.href = dataURL;
    link.click();
}

laserBtn.addEventListener('click', toggleLaser);
captureBtn.addEventListener('click', captureImage);

window.addEventListener('keydown', (event) => {
    switch(event.key.toLowerCase()) {
        case 'f': toggleDebug(); break;
        case 'l': toggleLaser(); break;
        case 'c': captureImage(); break;
    }
});

// Three.js Globals
let scene, camera, renderer, composer;
let lasers = []; 

function initThreeJS() {
    scene = new THREE.Scene();
    const container = document.querySelector('.container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    const aspect = width / height;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({
        canvas: canvasElement,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 1);

    const renderScene = new RenderPass(scene, camera);
    
    // HARDCORE BLOOM SETTINGS
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        2.5, // Strength: increased for gamer glow
        0.5, // Radius
        0.85 // Threshold
    );

    const AnamorphicFlareShader = {
        uniforms: {
            'tDiffuse': { value: null },
            'strength': { value: 0.5 },
            'threshold': { value: 0.9 },
            'scale': { value: 1.0 },
            'resolution': { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float strength;
            uniform float threshold;
            uniform float scale;
            uniform vec2 resolution;
            varying vec2 vUv;
            void main() {
                vec4 texel = texture2D( tDiffuse, vUv );
                vec3 originalColor = texel.rgb;
                vec3 flare = vec3(0.0);
                float step = 1.0 / resolution.x * scale;
                for (float i = -10.0; i <= 10.0; i += 1.0) {
                    if (i == 0.0) continue;
                    vec2 offset = vec2(i * step * 2.0, 0.0);
                    vec4 sampleCol = texture2D( tDiffuse, vUv + offset );
                    float brightness = max(sampleCol.r, max(sampleCol.g, sampleCol.b));
                    if (brightness > threshold) {
                        float weight = 1.0 / (abs(i) + 1.0);
                        flare += sampleCol.rgb * weight;
                    }
                }
                gl_FragColor = vec4( originalColor + flare * strength, texel.a );
            }
        `
    };

    const flarePass = new ShaderPass(AnamorphicFlareShader);
    flarePass.uniforms['threshold'].value = 2; 
    flarePass.uniforms['strength'].value = 0.4;
    flarePass.uniforms['scale'].value = 5.0; 

    const outputPass = new OutputPass();

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.addPass(flarePass);
    composer.addPass(outputPass);

    debugCanvas.width = width;
    debugCanvas.height = height;

    const videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.center.set(0.5, 0.5);
    videoTexture.repeat.set(-1, 1); 
    scene.background = videoTexture;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // UPDATED: HARDCORE RED MATERIAL
    const sphereGeometry = new THREE.SphereGeometry(0.1, 32, 32); 
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(50, 0, 0), // Extreme Red Intensity
        toneMapped: false,
        transparent: true,
        opacity: 0.9
    });
    
    const coreGeometry = new THREE.SphereGeometry(0.04, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

    const leftEyeMesh = new THREE.Group();
    leftEyeMesh.add(new THREE.Mesh(sphereGeometry, sphereMaterial));
    leftEyeMesh.add(new THREE.Mesh(coreGeometry, coreMaterial));

    const rightEyeMesh = new THREE.Group();
    rightEyeMesh.add(new THREE.Mesh(sphereGeometry, sphereMaterial));
    rightEyeMesh.add(new THREE.Mesh(coreGeometry, coreMaterial));

    scene.add(leftEyeMesh);
    scene.add(rightEyeMesh);
    
    lasers = [leftEyeMesh, rightEyeMesh];
    lasers.forEach(l => l.visible = false);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    const container = document.querySelector('.container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
    debugCanvas.width = width;
    debugCanvas.height = height;
}

function animate() {
    requestAnimationFrame(animate);
    
    // ADDED: FLICKER EFFECT
    if (isLaserMode && lasers.length > 0) {
        const flicker = 0.9 + Math.random() * 0.3;
        lasers.forEach(l => l.scale.set(flicker, flicker, flicker));
    }

    if (isLaserMode) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

initThreeJS();
animate();

// MediaPipe Setup
const faceMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

const cameraFeed = new Camera(videoElement, {
    onFrame: async () => {
        await faceMesh.send({image: videoElement});
    },
    width: 1280,
    height: 720
});
cameraFeed.start();

function onResults(results) {
    debugCtx.save();
    debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
    debugCtx.translate(debugCanvas.width, 0);
    debugCtx.scale(-1, 1);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        for (const landmarks of results.multiFaceLandmarks) {
            updateMask(landmarks);
            
            if (isDebugMode) {
                drawConnectors(debugCtx, landmarks, FACEMESH_TESSELATION, {color: '#ff003330', lineWidth: 1});
            }
        }
    } else {
        lasers.forEach(l => l.visible = false);
    }
    debugCtx.restore();
}

function updateMask(landmarks) {
    const leftEye = landmarks[468];
    const rightEye = landmarks[473];

    if (!leftEye || !rightEye) return;

    const mapToWorld = (landmark) => {
        const baseDepth = 5;
        const vFOV = camera.fov * Math.PI / 180;
        const visibleHeight = 2 * Math.tan(vFOV / 2) * baseDepth;
        const visibleWidth = visibleHeight * camera.aspect;

        const x = -(landmark.x - 0.5) * visibleWidth;
        const y = -(landmark.y - 0.5) * visibleHeight;
        const z = -landmark.z * visibleWidth;
        return new THREE.Vector3(x, y, z);
    };

    if (lasers.length === 2) {
        if (isLaserMode) {
            lasers[0].visible = true;
            lasers[0].position.copy(mapToWorld(leftEye));
            lasers[1].visible = true;
            lasers[1].position.copy(mapToWorld(rightEye));
        } else {
            lasers.forEach(l => l.visible = false);
        }
    }
}
