import * as THREE from "three"

import { AsciiEffect } from "three/examples/jsm/effects/AsciiEffect.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import gsap from "gsap/all"

let camera, controls, scene, renderer, effect

let sphere, orbits

const start = Date.now()

const flatMat = new THREE.MeshPhongMaterial({ flatShading: true, transparent: true })
const littleSphereGeo = new THREE.IcosahedronBufferGeometry(120, 0)

let stopRender = false

const loaderContainer = document.querySelector(".loader")

function initLoader() {
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1500)
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

  sphere = new THREE.Mesh(new THREE.IcosahedronBufferGeometry(200, 1), flatMat)
  scene.add(sphere)

  orbits = new THREE.Group()

  const getRandomPosComponent = (avg) => Math.random() * avg - avg / 2

  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(littleSphereGeo, flatMat)
    m.position.setFromSphericalCoords(500, getRandomPosComponent(Math.PI * 100), getRandomPosComponent(Math.PI * 100))
    orbits.add(m)
  }

  orbits.rotation.x = -Math.PI / 2
  orbits.rotation.y = -Math.PI / 8
  scene.add(orbits)

  renderer = new THREE.WebGLRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)

  effect = new AsciiEffect(renderer, " loading", { invert: true })
  effect.setSize(window.innerWidth, window.innerHeight)
  effect.domElement.style.color = "white"
  effect.domElement.style.backgroundColor = "black"

  // Special case: append effect.domElement, instead of renderer.domElement.
  // AsciiEffect creates a custom domElement (a div container) where the ASCII elements are placed.

  controls = new OrbitControls(camera, effect.domElement)

  loaderContainer.appendChild(effect.domElement)

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

function animateLoader() {
  if (stopRender) {
    flatMat.dispose()
    littleSphereGeo.dispose()
    scene.clear()
    renderer.clear()
    document.body.removeChild(loaderContainer)
  } else {
    requestAnimationFrame(animateLoader)
    render()
  }
}

function render() {
  controls.update()
  const timer = Date.now() - start

  sphere.rotation.z = timer * 0.0002

  orbits.rotation.z = timer * 0.0002
  orbits.rotation.y = timer * 0.0002
  orbits.rotation.x = timer * 0.0002

  effect.render(scene, camera)
}

function stopLoader() {
  return new Promise((res, _) => {
    const elementsToAnimate = [sphere, ...orbits.children]
    const materials = elementsToAnimate.map((mesh) => mesh.material)
    const scales = elementsToAnimate.map((mesh) => mesh.scale)
    gsap
      .timeline({
        onComplete: () => {
          res()
          stopRender = true
        },
      })
      .addLabel("sync")
      .to(materials, { opacity: 0, duration: 1.2 }, "sync")
      .to(scales, { x: 0, y: 0, z: 0, duration: 1.2 }, "sync")
  })
}

export { initLoader, animateLoader, stopLoader }
