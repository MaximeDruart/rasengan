import * as THREE from "three"
const vec3c = new THREE.Vector3()
const G = 0.01

const applyForce = (obj, force) => {
  obj.acc.add(force)
}

const addGravitationalForce = (attractor, attractee, g = G) => {
  const force = vec3c.subVectors(attractor.mesh.position, attractee.mesh.position)
  let distanceSq = force.lengthSq()
  distanceSq = THREE.MathUtils.clamp(distanceSq, 5000, 50000)

  const strength = (g * (attractor.mass * attractee.mass)) / distanceSq
  force.setLength(strength)

  applyForce(attractee, force)
}

const collisionCheck = (itemA, itemB) => {
  const diff = vec3c.subVectors(itemA.mesh.position, itemB.mesh.position)
  const distance = diff.length()
  const radiusSum =
    itemA.mesh.geometry.parameters.radius * itemA.mesh.scale.x +
    itemB.mesh.geometry.parameters.radius * itemB.mesh.scale.x

  return distance < radiusSum
}
const isBInsideA = (itemA, itemB) => {
  const diff = vec3c.subVectors(itemA.mesh.position, itemB.mesh.position)
  const distance = diff.length()

  const maxLengthForCheck =
    itemA.mesh.geometry.parameters.radius * itemA.mesh.scale.x -
    itemB.mesh.geometry.parameters.radius * itemB.mesh.scale.x

  // multiplicating by 1.5 so it eats a little easier :)
  return distance < maxLengthForCheck * 1.5
}

const applyBounceForce = (obj) => {
  obj.acc = obj.acc.negate()
  obj.vel = obj.vel.negate()
}

const explode = (attractor, particles) => {
  for (const particle of particles) {
    const force = vec3c.subVectors(particle.mesh.position, attractor.mesh.position)
    force.multiplyScalar(0.06)

    applyForce(particle, force)
  }
}
const pullIn = (attractor, particles) => {
  for (const particle of particles) {
    const force = vec3c.subVectors(attractor.mesh.position, particle.mesh.position)
    force.multiplyScalar(0.06)

    applyForce(particle, force)
  }
}
const spreadBack = (particles) => {
  for (const particle of particles) {
    const force = vec3c.randomDirection().multiplyScalar(0.2)
    applyForce(particle, force)
  }
}

export { applyForce, addGravitationalForce, collisionCheck, applyBounceForce, isBInsideA, explode, pullIn, spreadBack }
