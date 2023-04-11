import * as THREE from "three"
import SimplexNoise from "simplex-noise"
import gsap from "gsap"

import Webcam from "webcam-easy"
import * as tf from "@tensorflow/tfjs"
import * as handpose from "@tensorflow-models/handpose"
import * as fp from "fingerpose"
import {
  closedHandDescription,
  openHandDescription,
  sideThumbCloseDescription,
  sideThumbOpenDescription,
} from "./gestures"

import explodeMP3 from "./assets/sounds/explode.mp3"
import rampUpMP3 from "./assets/sounds/rampUp.mp3"
import closeShieldMP3 from "./assets/sounds/closeShield.mp3"
import openShieldMP3 from "./assets/sounds/openShield.mp3"
import "./style.css"

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass"
import { GlitchPass } from "./GlitchPass"
import { LuminosityShader } from "three/examples/jsm/shaders/LuminosityShader.js"
import { SobelOperatorShader } from "three/examples/jsm/shaders/SobelOperatorShader.js"
import { PixelShader } from "three/examples/jsm/shaders/PixelShader.js"
import { GUI } from "three/examples/jsm/libs/dat.gui.module"

import { animateLoader, initLoader, stopLoader } from "./loaderCanvas"
import { getRandomPosComponent } from "./utils"
import {
  addGravitationalForce,
  applyBounceForce,
  collisionCheck,
  explode,
  isBInsideA,
  pullIn,
  spreadBack,
} from "./forceStuff"

let camera,
  scene,
  renderer,
  composer,
  particles,
  attractor,
  attractorShield,
  attractorShadow,
  attractorShieldOpacity = 0,
  addParticlesInterval,
  absorbMode = false,
  bounceMode = false,
  concentration = 0,
  attractorScale = 0,
  isHolding = false,
  amountOfParticle = 25,
  absorbCounter = 0,
  exploding = false,
  attractorMouseDownMaxScale = 1.6,
  model,
  webcamElement,
  canvasElement,
  webcam,
  webcamWidth,
  webcamHeight,
  activeGesture = "open_hand",
  palmPosition = null,
  effectSobel,
  effectPixel,
  glitchPass

const params = {
  bounceBetweenSpheres: false,
  g: 0.01,
}

const k = 3
const vec3 = new THREE.Vector3()

const simplex = new SimplexNoise()

const startApp = async () => {
  initLoader()
  animateLoader()
  webcamElement = document.getElementById("webcam-video")
  canvasElement = document.getElementById("webcam-canvas")
  webcam = new Webcam(webcamElement, "user", canvasElement)

  await webcam.start()

  const info = await webcam.info()
  const capabilities = info[0].getCapabilities()
  webcamWidth = capabilities.width.max
  webcamHeight = capabilities.height.max
  console.log("WEBCAM STARTED")

  model = await handpose.load()
  console.log("MODEL LOADED")
  detect()
  await stopLoader()
  console.log("LOADER DELETED")
  init()
  animate()
}

const detect = async () => {
  const predictions = await model.estimateHands(webcamElement, true)

  if (predictions.length > 0) {
    palmPosition = { x: predictions[0].annotations.palmBase[0][0], y: predictions[0].annotations.palmBase[0][1] }
    palmPosition.x = palmPosition.x / 500
    palmPosition.y = palmPosition.y / 500 - 0.5
    const GE = new fp.GestureEstimator([
      openHandDescription,
      closedHandDescription,
      sideThumbOpenDescription,
      sideThumbCloseDescription,
    ])
    const gesture = await GE.estimate(predictions[0].landmarks, 4)
    if (gesture.gestures.length === 1) {
      activeGesture = gesture.gestures[0].name
    } else {
      let highestConfidenceGesture = { name: "", score: 0 }
      for (const _gesture of gesture.gestures) {
        if (_gesture.score > highestConfidenceGesture.score) {
          highestConfidenceGesture = _gesture
        }
      }
      activeGesture = highestConfidenceGesture.name
    }
  }

  setTimeout(() => {
    detect()
  }, 120)
}

const explodeAudio = new Audio(explodeMP3)
explodeAudio.volume = 0.8
const rampUpAudio = new Audio(rampUpMP3)
rampUpAudio.volume = 0.8
const openShieldAudio = new Audio(openShieldMP3)
openShieldAudio.volume = 0.65
const closeShieldAudio = new Audio(closeShieldMP3)
closeShieldAudio.volume = 0.65

const attractorGeo = new THREE.SphereBufferGeometry(3, 64, 64)
const attractorMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })

const particleGeo = new THREE.SphereBufferGeometry(1, 32, 32)
const particleMat = new THREE.MeshBasicMaterial({ color: "red" })

startApp()

function init() {
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.set(0, 10, 12)
  camera.lookAt(scene.position)

  // CREATE ITEMS

  attractor = {
    pos: new THREE.Vector3(0, 0, 0),
    mass: 100,
    geo: attractorGeo,
    mat: attractorMat,
    mesh: new THREE.Mesh(attractorGeo, attractorMat),
  }

  particles = Array.from({ length: amountOfParticle }).map(() => ({
    pos: new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10),
    vel: new THREE.Vector3().randomDirection().multiplyScalar(0.2),
    acc: new THREE.Vector3(0, 0, 0),
    speedLimit: 0.8,
    mass: 50,
    mesh: new THREE.Mesh(particleGeo, particleMat),
  }))

  attractorShield = {
    mesh: new THREE.Mesh(
      new THREE.SphereBufferGeometry(4.2, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xccc,
        wireframe: false,
        transparent: true,
        opacity: attractorShieldOpacity,
      })
    ),
  }
  attractorShadow = {
    mesh: new THREE.Mesh(
      new THREE.SphereBufferGeometry(8, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xaaa, wireframe: false, transparent: true, opacity: 0.4 })
    ),
  }

  attractorShadow.mesh.scale.set(0, 0, 0)

  attractor.mesh.add(attractorShield.mesh)
  attractor.mesh.add(attractorShadow.mesh)

  scene.add(attractor.mesh)
  for (const particle of particles) {
    particle.mesh.scale.set(0, 0, 0)
    gsap.to(particle.mesh.scale, { x: 1, y: 1, z: 1, duration: 1.2, delay: Math.random() / 2 })
    particle.mesh.position.copy(particle.pos)
    scene.add(particle.mesh)
  }

  // SET RENDERER

  renderer = new THREE.WebGLRenderer()
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  // POSTPROCESSING

  composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const effectGrayScale = new ShaderPass(LuminosityShader)
  composer.addPass(effectGrayScale)

  effectSobel = new ShaderPass(SobelOperatorShader)
  effectSobel.uniforms["resolution"].value.x = window.innerWidth * window.devicePixelRatio
  effectSobel.uniforms["resolution"].value.y = window.innerHeight * window.devicePixelRatio

  effectPixel = new ShaderPass(PixelShader)
  console.log(effectPixel)
  effectPixel.uniforms["resolution"].value = {
    x: window.innerWidth * window.devicePixelRatio,
    y: window.innerHeight * window.devicePixelRatio,
  }

  effectPixel.uniforms["pixelSize"].value = 10
  // effectPixel.uniforms["resolution"].value

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)
  bloomPass.threshold = 0
  bloomPass.strength = 10
  bloomPass.radius = 0

  glitchPass = new GlitchPass()

  // composer.addPass(bloomPass)

  composer.addPass(effectPixel)

  composer.addPass(effectSobel)
  composer.addPass(glitchPass)

  const bloomPass2 = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)
  bloomPass2.threshold = 0
  bloomPass2.strength = 2
  bloomPass2.radius = 0

  composer.addPass(bloomPass2)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableZoom = false
  controls.enablePan = false

  const gui = new GUI()

  gui.add(params, "bounceBetweenSpheres").onChange(() => {})
  gui.add(params, "g").min(0.001).max(0.2).step(0.0001)

  window.addEventListener("resize", onWindowResize)
  window.addEventListener("keydown", onKeyDown)
  window.addEventListener("keyup", onKeyUp)
}

function handleBounceModeChange() {
  if (bounceMode) {
    gsap
      .timeline({
        onStart: () => {
          openShieldAudio.play()
          explode(attractor, particles)
        },
        onComplete: () => {},
      })
      .to(attractorShadow.mesh.scale, { x: 1, y: 1, z: 1 })
      .to(attractorShadow.mesh.material, { opacity: 0, ease: "bounce.inOut" })

    concentration = 0
  } else {
    gsap
      .timeline({
        onStart: () => {
          closeShieldAudio.play()
          // attractorShadow.mesh.scale.set(1, 1, 1)
          // attractorShadow.mesh.material.opacity = 0.4
        },
      })
      .addLabel("sync")
      .set(attractorShadow.mesh.material, { opacity: 0.4, ease: "bounce.inOut" })
      .to(attractorShadow.mesh.scale, { x: 0, y: 0, z: 0 }, "sync")

    attractorShieldOpacity = 0
  }
}

function handleAbsorbModeChange() {
  console.log("CHANGING ABSORB MODE TO :", absorbMode)
  if (absorbCounter > 50) {
    concentration = 10000
    const tl = gsap
      .timeline({
        onStart: () => {
          stopAddParticles()
          exploding = true
          explodeAudio.play()
          for (const particle of particles) {
            particle.mesh.visible = false
            particle.mesh.scale.set(0, 0, 0)
          }
        },
      })
      .to(attractor.mesh.scale, { x: 10, y: 10, z: 10 })
      .addLabel("sync")
      .to(
        attractor.mesh.material,
        {
          opacity: 0,
          duration: 3,
          onComplete: () => {
            for (const particle of particles) particle.mesh.visible = true
            attractor.mesh.scale.set(0, 0, 0)
            attractorScale = 0
            exploding = false
            explodeAudio.pause()
            explodeAudio.currentTime = 0
            attractor.mesh.material.opacity = 1
          },
        },
        "sync"
      )
      .to(
        attractor.mesh.scale,
        {
          x: 12,
          y: 12,
          z: 12,
          duration: 2.5,
        },
        "sync"
      )
    for (const particle of particles) {
      tl.to(particle.mesh.scale, { x: 1, y: 1, z: 1 })
    }
    tl.play()
  }
  absorbCounter = 0
  if (absorbMode) {
    rampUpAudio.play()
    addParticles()
  } else {
    rampUpAudio.pause()
    rampUpAudio.currentTime = 0
    stopAddParticles()
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)

  effectSobel.uniforms["resolution"].value.x = window.innerWidth * window.devicePixelRatio
  effectSobel.uniforms["resolution"].value.y = window.innerHeight * window.devicePixelRatio
  // effectPixel.uniforms["resolution"].value.x = window.innerWidth * window.devicePixelRatio
  // effectPixel.uniforms["resolution"].value.y = window.innerHeight * window.devicePixelRatio
}

function onKeyDown(e) {
  switch (e.code) {
    case "KeyL":
      explode(attractor, particles)
      break
    case "Semicolon":
      pullIn(attractor, particles)
      break
    case "Space":
      isHolding = true
      break
    case "KeyK":
      spreadBack(particles)
      break
    case "KeyB":
      bounceMode = !bounceMode
      handleBounceModeChange()
      break
    case "KeyN":
      absorbMode = !absorbMode
      handleAbsorbModeChange()
      break

    default:
      break
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case "Space":
      isHolding = false
      break

    default:
      break
  }
}

const addParticles = () => {
  addParticlesInterval = setInterval(() => {
    if (particles.length > 80) return
    const newParticle = {
      pos: new THREE.Vector3(getRandomPosComponent(50), getRandomPosComponent(50), getRandomPosComponent(50)),
      vel: new THREE.Vector3().randomDirection().multiplyScalar(0.2),
      acc: new THREE.Vector3(0, 0, 0),
      speedLimit: 0.8,
      mass: 50,
      mesh: new THREE.Mesh(particleGeo, particleMat),
    }
    newParticle.mesh.position.copy(newParticle.pos)
    newParticle.mesh.material.opacity = 0
    newParticle.mesh.scale.set(0, 0, 0)
    gsap.to(newParticle.mesh.material, { opacity: 1, duration: 0.4 })
    gsap.to(newParticle.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4 })
    scene.add(newParticle.mesh)
    particles.push(newParticle)
  }, 30)
}

const stopAddParticles = () => clearInterval(addParticlesInterval)

function animate(t) {
  if (!model) return requestAnimationFrame(animate)
  const time = (t || 0) / (exploding ? 4000 : 500)

  // if (!exploding && !absorbMode) {
  //   if (activeGesture === "side_thumb_open") {
  //     if (!bounceMode) {
  //       bounceMode = true
  //       handleBounceModeChange()
  //     }
  //   } else if (activeGesture === "side_thumb_close") {
  //     if (bounceMode) {
  //       bounceMode = false
  //       handleBounceModeChange()
  //     }
  //   }
  // }

  if (!exploding && !bounceMode) {
    // if (activeGesture === "closed_hand") {
    //   if (!absorbMode) {
    //     absorbMode = true
    //     handleAbsorbModeChange()
    //   }
    // } else if (activeGesture === "open_hand") {
    //   if (absorbMode) {
    //     absorbMode = false
    //     handleAbsorbModeChange()
    //   }
    // }
    // if (!absorbMode) {
    //   absorbMode = true
    //   handleAbsorbModeChange()
    // }
  }

  for (const particle of particles) {
    addGravitationalForce(attractor, particle, params.g)

    if (absorbMode) {
      if (isBInsideA(attractor, particle)) {
        scene.remove(particle.mesh)
        particles = particles.filter((p) => p.mesh.id !== particle.mesh.id)
        absorbCounter++
      }
    }

    if (params.bounceBetweenSpheres) {
      const particlesToCheck = particles.filter((p) => p.mesh.id !== particle.mesh.id)
      for (const possibleParticle of particlesToCheck) {
        if (collisionCheck(possibleParticle, particle)) {
          applyBounceForce(possibleParticle)
          applyBounceForce(particle)
        }
      }
    }

    if (collisionCheck(bounceMode ? attractorShield : attractor, particle)) {
      if (bounceMode) {
        attractorShieldOpacity += 0.16
        applyBounceForce(particle)
      }
      concentration += 0.8
    } else {
      if (concentration > 40) {
        concentration -= 0.16
      } else {
        concentration -= 0.08
        attractorShieldOpacity -= 0.0003
      }
    }

    concentration = THREE.MathUtils.clamp(concentration, 0, 100)
    attractorShieldOpacity = THREE.MathUtils.clamp(attractorShieldOpacity, 0, 0.65)

    // UPDATE PARTICLE POSITION / VELOCITY / ACCELERATION
    particle.vel.add(particle.acc)
    particle.vel.clampLength(0, particle.speedLimit)
    particle.pos.add(particle.vel)
    particle.acc.multiplyScalar(0)

    // SYNC PARTICLE DATA AND MESHES
    particle.mesh.position.copy(particle.pos)
    particle.mesh.lookAt(vec3.copy(particle.pos).add(particle.vel))
    particle.mesh.scale.y = THREE.MathUtils.mapLinear(particle.vel.length(), 10, particle.speedLimit, 1, 0.8)
  }

  const positions = attractor.mesh.geometry.attributes.position.array

  for (let i = 0; i < positions.length; i += 3) {
    const [x, y, z] = attractor.mesh.geometry.attributes.position.array.slice(i, i + 3)
    const vertexVec = vec3.set(x, y, z)
    vertexVec
      .normalize()
      .multiplyScalar(
        attractor.mesh.geometry.parameters.radius +
          (absorbMode ? Math.max(1, (1 - 1 / absorbCounter + 1) * 80) : concentration * 3) *
            0.004 *
            simplex.noise3D(vertexVec.x * k + time, vertexVec.y * k + time, vertexVec.z * k + time)
      )
    positions[i] = vertexVec.x
    positions[i + 1] = vertexVec.y
    positions[i + 2] = vertexVec.z
  }
  attractor.mesh.geometry.attributes.position.needsUpdate = true

  glitchPass.strength = Math.min(1, THREE.MathUtils.lerp(glitchPass.strength, absorbCounter / 50, 0.1))

  if (absorbMode) {
    // aiming for a diminishing return kind of curve, few first have a lot of impact but later on it kinda caps to a value
    let absorbScalar = (1 - 1 / absorbCounter + 1) * 1.2
    absorbScalar = Math.max(1, absorbScalar)

    attractorScale = THREE.MathUtils.lerp(attractorScale, absorbScalar, 0.02)
  } else {
    attractorScale = THREE.MathUtils.lerp(attractorScale, isHolding ? attractorMouseDownMaxScale : 1, 0.09)
  }
  if (!exploding) {
    attractor.mesh.scale.set(attractorScale, attractorScale, attractorScale)
  }

  attractorShield.mesh.material.opacity = THREE.MathUtils.lerp(
    attractorShield.mesh.material.opacity,
    attractorShieldOpacity,
    0.1
  )

  if (palmPosition) {
    attractor.pos.x = THREE.MathUtils.lerp(attractor.pos.x, palmPosition.x * 3, 0.08)
    attractor.pos.y = THREE.MathUtils.lerp(attractor.pos.y, -palmPosition.y * 3, 0.08)
    attractor.pos.z = THREE.MathUtils.lerp(attractor.pos.z, simplex.noise2D(palmPosition.x, palmPosition.y) * 1, 0.03)
  }

  attractor.mesh.position.copy(attractor.pos)

  requestAnimationFrame(animate)
  composer.render()
}
