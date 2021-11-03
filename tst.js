import * as THREE from "three"
import "./style.css"

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { GlitchPass } from "./GlitchPass"

import { LuminosityShader } from "three/examples/jsm/shaders/LuminosityShader.js"
import { SobelOperatorShader } from "three/examples/jsm/shaders/SobelOperatorShader.js"
import { addGravitationalForce, applyForce, collisionCheck } from "./forceStuff"

let camera, scene, renderer, composer, particles, attractor

const vec3 = new THREE.Vector3()

let effectSobel

init()
animate()

function init() {
  //

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.set(0, 10, 15)
  camera.lookAt(scene.position)

  //

  const attractorGeo = new THREE.SphereBufferGeometry(3, 64, 64)
  const attractorMat = new THREE.MeshBasicMaterial({ color: 0xffffff })

  const particleGeo = new THREE.SphereBufferGeometry(1, 64, 64)
  const particleMat = new THREE.MeshBasicMaterial({ color: "red" })

  attractor = {
    mass: 100,
    geo: attractorGeo,
    mat: attractorMat,
    mesh: new THREE.Mesh(attractorGeo, attractorMat),
  }

  console.log(attractor.mesh)

  particles = Array.from({ length: 5 }).map(() => ({
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

  //

  const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4)
  scene.add(ambientLight)

  const pointLight = new THREE.PointLight(0xffffff, 0.8)
  camera.add(pointLight)
  scene.add(camera)

  //

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
  composer.addPass(effectSobel)

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)
  bloomPass.threshold = 0
  bloomPass.strength = 2
  bloomPass.radius = 0
  composer.addPass(bloomPass)

  const glitchPass = new GlitchPass()
  glitchPass.goWild = true
  composer.addPass(glitchPass)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.minDistance = 10
  controls.maxDistance = 100

  window.addEventListener("resize", onWindowResize)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)

  effectSobel.uniforms["resolution"].value.x = window.innerWidth * window.devicePixelRatio
  effectSobel.uniforms["resolution"].value.y = window.innerHeight * window.devicePixelRatio
}

function animate() {
  for (const particle of particles) {
    addGravitationalForce(attractor, particle)

    particle.vel.add(particle.acc)
    particle.vel.clampLength(0, particle.speedLimit)
    particle.pos.add(particle.vel)
    particle.acc.multiplyScalar(0)

    particle.mesh.position.copy(particle.pos)
    particle.mesh.lookAt(vec3.copy(particle.pos).add(particle.vel))
    particle.mesh.scale.y = THREE.MathUtils.mapLinear(particle.vel.length(), 10, particle.speedLimit, 1, 0.8)

    collisionCheck(attractor, particle)
  }

  requestAnimationFrame(animate)

  composer.render()
  // renderer.render(scene, camera)
}
