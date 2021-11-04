import * as THREE from "three"
import SimplexNoise from "simplex-noise"
import gsap from "gsap"

import "./style.css"

import explodeMP3 from "./assets/explode.mp3"
import rampUpMP3 from "./assets/rampUp.mp3"

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { GlitchPass } from "./GlitchPass"
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js"

import { LuminosityShader } from "three/examples/jsm/shaders/LuminosityShader.js"
import { SobelOperatorShader } from "three/examples/jsm/shaders/SobelOperatorShader.js"
import { addGravitationalForce, applyBounceForce, applyForce, collisionCheck, isBInsideA } from "./forceStuff"

import { GUI } from "three/examples/jsm/libs/dat.gui.module"

const explodeAudio = new Audio(explodeMP3)
const rampUpAudio = new Audio(rampUpMP3)

let camera,
  scene,
  renderer,
  composer,
  particles,
  attractor,
  addParticlesInterval,
  concentration = 0,
  attractorScale = 0,
  isHolding = false,
  amountOfParticle = 25,
  absorbCounter = 0,
  exploding = false,
  attractorMouseDownMaxScale = 1.6

const params = {
  bounceMode: false,
  bounceBetweenSpheres: false,
  absorbMode: false,
  g: 0.01,
}

const k = 3
const vec3 = new THREE.Vector3()

const simplex = new SimplexNoise()

let effectSobel, outlinePass, glitchPass

const attractorGeo = new THREE.SphereBufferGeometry(3, 64, 64)
const attractorMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })

const particleGeo = new THREE.SphereBufferGeometry(1, 32, 32)
const particleMat = new THREE.MeshBasicMaterial({ color: "red" })

init()
animate()

function init() {
  //

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.set(0, 10, 12)
  camera.lookAt(scene.position)

  //

  attractor = {
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

  scene.add(attractor.mesh)
  for (const particle of particles) {
    particle.mesh.position.copy(particle.pos)
    scene.add(particle.mesh)
  }

  renderer = new THREE.WebGLRenderer()
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  // postprocessing

  composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  // color to grayscale conversion

  const effectGrayScale = new ShaderPass(LuminosityShader)
  composer.addPass(effectGrayScale)

  // you might want to use a gaussian blur filter before
  // the next pass to improve the result of the Sobel operator

  // Sobel operator

  effectSobel = new ShaderPass(SobelOperatorShader)
  effectSobel.uniforms["resolution"].value.x = window.innerWidth * window.devicePixelRatio
  effectSobel.uniforms["resolution"].value.y = window.innerHeight * window.devicePixelRatio

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)
  bloomPass.threshold = 0
  bloomPass.strength = 1
  bloomPass.radius = 0

  glitchPass = new GlitchPass()
  glitchPass.goWild = true

  outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera)

  outlinePass.selectedObjects = particles.map((p) => p.mesh)

  // composer.addPass(outlinePass)
  composer.addPass(bloomPass)

  composer.addPass(effectSobel)
  composer.addPass(glitchPass)
  composer.addPass(bloomPass)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.minDistance = 10
  controls.maxDistance = 100

  const gui = new GUI()

  gui.add(params, "bounceMode").onChange(() => {
    if (params.bounceMode) {
      concentration = 0
      explode()
    }
  })
  gui.add(params, "bounceBetweenSpheres").onChange(() => {})
  gui.add(params, "absorbMode").onChange(() => {
    if (absorbCounter > 50) {
      concentration = 10000
      const tl = gsap
        .timeline({
          onStart: () => {
            exploding = true
            explodeAudio.play()
            for (const particle of particles) {
              gsap.to(particle.mesh.scale, { x: 0, y: 0, z: 0 })
            }
          },
        })
        .to(attractor.mesh.scale, { x: 10, y: 10, z: 10 })
        .to(attractor.mesh.material, {
          opacity: 0,
          duration: 2.5,
          delay: 0.4,
          onComplete: () => {
            attractor.mesh.scale.set(0, 0, 0)
            attractorScale = 0
            exploding = false
            explodeAudio.pause()
            explodeAudio.currentTime = 0
            attractor.mesh.material.opacity = 1
          },
        })
      for (const particle of particles) {
        tl.to(particle.mesh.scale, { x: 1, y: 1, z: 1 })
      }
      tl.play()
    }
    absorbCounter = 0
    if (params.absorbMode) {
      rampUpAudio.play()
      addParticles()
    } else {
      rampUpAudio.pause()
      rampUpAudio.currentTime = 0
      stopAddParticles()
    }
  })

  gui.add(params, "g").min(0.001).max(0.2).step(0.0001)

  window.addEventListener("resize", onWindowResize)
  window.addEventListener("keydown", onKeyDown)
  window.addEventListener("keyup", onKeyUp)
  // window.addEventListener("mouseup", onMouseUp)
  // window.addEventListener("mousedown", onMouseDown)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)

  effectSobel.uniforms["resolution"].value.x = window.innerWidth * window.devicePixelRatio
  effectSobel.uniforms["resolution"].value.y = window.innerHeight * window.devicePixelRatio
}

function onKeyDown(e) {
  switch (e.code) {
    case "KeyL":
      explode()
      break
    case "Semicolon":
      pullIn()
      break
    case "Space":
      isHolding = true
      break
    case "KeyK":
      spreadBack()
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

const getRandomPosComponent = (avg) => Math.random() * avg - avg / 2

const addParticles = () => {
  addParticlesInterval = setInterval(() => {
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
  }, 60)
}

const stopAddParticles = () => clearInterval(addParticlesInterval)

const explode = () => {
  for (const particle of particles) {
    const force = vec3.subVectors(particle.mesh.position, attractor.mesh.position)
    force.multiplyScalar(0.06)

    applyForce(particle, force)
  }
}
const pullIn = () => {
  for (const particle of particles) {
    const force = vec3.subVectors(attractor.mesh.position, particle.mesh.position)
    force.multiplyScalar(0.06)

    applyForce(particle, force)
  }
}
const spreadBack = () => {
  for (const particle of particles) {
    const force = vec3.randomDirection().multiplyScalar(0.2)
    applyForce(particle, force)
  }
}

function animate(t) {
  const time = (t || 0) / 500

  for (const particle of particles) {
    addGravitationalForce(attractor, particle, params.g)

    if (params.absorbMode) {
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

    if (collisionCheck(attractor, particle)) {
      if (params.bounceMode) applyBounceForce(particle)
      concentration += 0.8
    } else {
      if (concentration > 40) {
        concentration -= 0.16
      } else {
        concentration -= 0.08
      }
    }

    concentration = THREE.MathUtils.clamp(concentration, 0, 100)

    particle.vel.add(particle.acc)
    particle.vel.clampLength(0, particle.speedLimit)
    particle.pos.add(particle.vel)
    particle.acc.multiplyScalar(0)

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
          (params.absorbMode ? Math.max(1, (1 - 1 / absorbCounter + 1) * 80) : concentration * 3) *
            0.004 *
            simplex.noise3D(vertexVec.x * k + time, vertexVec.y * k + time, vertexVec.z * k + time)
      )
    positions[i] = vertexVec.x
    positions[i + 1] = vertexVec.y
    positions[i + 2] = vertexVec.z
  }
  attractor.mesh.geometry.attributes.position.needsUpdate = true

  glitchPass.strength = Math.min(1, THREE.MathUtils.lerp(glitchPass.strength, absorbCounter / 50, 0.1))

  if (params.absorbMode) {
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

  requestAnimationFrame(animate)

  composer.render()
  // renderer.render(scene, camera)
}
