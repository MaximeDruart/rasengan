import { DataTexture, FloatType, MathUtils, RGBFormat, ShaderMaterial, UniformsUtils } from "three"
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js"
import { DigitalGlitch } from "three/examples/jsm/shaders/DigitalGlitch.js"

class GlitchPass extends Pass {
  constructor(dt_size = 64) {
    super()

    const shader = DigitalGlitch

    this.uniforms = UniformsUtils.clone(shader.uniforms)

    this.uniforms["tDisp"].value = this.generateHeightmap(dt_size)

    this.material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
    })

    this.fsQuad = new FullScreenQuad(this.material)

    this.curF = 0
    this.generateTrigger()

    this.strength = 0
  }

  render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {
    this.uniforms["tDiffuse"].value = readBuffer.texture
    this.uniforms["seed"].value = Math.random() //default seeding
    this.uniforms["byp"].value = 0

    // this.strength = MathUtils.mapLinear(Math.sin(Date.now() / 1000), -1, 1, 0, 1)

    this.uniforms["amount"].value = Math.random() / MathUtils.mapLinear(this.strength, 0, 1, 20000, 200)
    this.uniforms["angle"].value = MathUtils.randFloat(-Math.PI * this.strength, Math.PI * this.strength)
    this.uniforms["seed_x"].value = MathUtils.randFloat(-this.strength, this.strength)
    this.uniforms["seed_y"].value = MathUtils.randFloat(-this.strength, this.strength)
    this.uniforms["distortion_x"].value = MathUtils.randFloat(0, this.strength)
    this.uniforms["distortion_y"].value = MathUtils.randFloat(0, this.strength)
    this.uniforms["col_s"].value = 0

    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
      this.fsQuad.render(renderer)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
      this.fsQuad.render(renderer)
    }
  }

  generateTrigger() {
    this.randX = MathUtils.randInt(120, 240)
  }

  generateHeightmap(dt_size) {
    const data_arr = new Float32Array(dt_size * dt_size * 3)
    const length = dt_size * dt_size

    for (let i = 0; i < length; i++) {
      const val = MathUtils.randFloat(0, 1)
      data_arr[i * 3 + 0] = val
      data_arr[i * 3 + 1] = val
      data_arr[i * 3 + 2] = val
    }

    return new DataTexture(data_arr, dt_size, dt_size, RGBFormat, FloatType)
  }
}

export { GlitchPass }
