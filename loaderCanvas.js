import * as THREE from "three"

import { AsciiEffect } from "three/examples/jsm/effects/AsciiEffect.js"

let camera, controls, scene, renderer, effect

let sphere, torus

const start = Date.now()

init()
animate()

function init() {
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000)
  camera.position.y = 150
  camera.position.z = 900

  camera.lookAt(0, 0, 0)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0, 0, 0)

  const pointLight1 = new THREE.PointLight(0xffffff)
  pointLight1.position.set(500, 500, 500)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0xffffff, 0.25)
  pointLight2.position.set(-500, -500, -500)
  scene.add(pointLight2)

  sphere = new THREE.Mesh(
    new THREE.SphereBufferGeometry(200, 20, 10),
    new THREE.MeshPhongMaterial({ flatShading: true })
  )
  scene.add(sphere)

  torus = new THREE.Mesh(
    new THREE.TorusBufferGeometry(400, 30, 64, 36),
    new THREE.MeshPhongMaterial({ flatShading: true })
  )

  torus.rotation.x = -Math.PI / 2
  torus.rotation.y = -Math.PI / 8
  scene.add(torus)

  renderer = new THREE.WebGLRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)

  effect = new AsciiEffect(renderer, " .:-+*=%@#", { invert: true })
  effect.setSize(window.innerWidth, window.innerHeight)
  effect.domElement.style.color = "white"
  effect.domElement.style.backgroundColor = "black"

  // Special case: append effect.domElement, instead of renderer.domElement.
  // AsciiEffect creates a custom domElement (a div container) where the ASCII elements are placed.

  document.querySelector(".loader").appendChild(effect.domElement)

  //

  window.addEventListener("resize", onWindowResize)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  effect.setSize(window.innerWidth, window.innerHeight)
}

//

function animate() {
  requestAnimationFrame(animate)

  render()
}

function render() {
  const timer = Date.now() - start

  sphere.rotation.z = timer * 0.0002

  torus.rotation.z = timer * 0.0002

  effect.render(scene, camera)
}
