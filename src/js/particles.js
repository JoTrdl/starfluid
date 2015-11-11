
(function() {

  // Number of particles
  var PARTICLE_COUNT = 1024 * 256;
  var CELLS_PARTICLE_DATA = Math.ceil(Math.sqrt(PARTICLE_COUNT));

  // How many particles can be emitted at a given time
  var PARTICLE_EMIT_RATE = CELLS_PARTICLE_DATA;

  // Particles Geometry
  var VERTICES = [];
  for (var i = 0, l = CELLS_PARTICLE_DATA * CELLS_PARTICLE_DATA; i < l; i++ ) {
    VERTICES.push(i % CELLS_PARTICLE_DATA / CELLS_PARTICLE_DATA);
    VERTICES.push(Math.floor(i / CELLS_PARTICLE_DATA) / CELLS_PARTICLE_DATA);
  }

  // PI 2
  var PI_2 = Math.PI * 2;

  // Particle base size, age and radius
  var PARTICLE_SIZE = 0.7;
  var PARTICLE_AGE = 5;
  var PARTICLE_RADIUS = 0.025;

  /**
   * Stage Particles Effect
   */
  Stage.Particles = Stage.Effect.extend({

    name: 'particles',

    /**
     * Initializer
     */
    initialize: function(ctx) {
      this.ctx = ctx;

      var gl = ctx.gl;

      var TIMESTEP = 0.25;
      var CELLS = 256;

      var dataUniform = {
        'd': { type: '2f', value: [1/CELLS, 1/CELLS]},
        'dt': { type: '1f', value: TIMESTEP },
        'solver': {type: 't', value: ctx.effects.fluid.solver.output}
      };

      // Particles data
      this.data = new RTT(gl, {
        width: CELLS_PARTICLE_DATA,
        height: CELLS_PARTICLE_DATA,
        texture: { type: gl.FLOAT }
      })
      .fragment(document.getElementById('fragment-particle-data').textContent, dataUniform)
      .render();

      // Particles
      this.uniforms = {
        'ratio': { type: '1f', value: ctx.aspect },
        'particleData': { type: 't', value: this.data.output }
      };
      this.particles = new RTT(gl, {
        texture: { type: gl.FLOAT },
        geometry: [new Float32Array(VERTICES), gl.POINTS, 0, VERTICES.length / 2]
      })
      .vertexFragment(
        document.getElementById('vertex-particles').textContent,
        document.getElementById('fragment-particles').textContent, this.uniforms)
      .render();

      // Buffer for writing into particles data texture
      this.buffer = [];
      this.bufferIndex = 0;

      var onMouseMove = this.mousemove.bind(this);
      
      document.addEventListener('mouseup', function() {
        document.removeEventListener('mousemove', onMouseMove);
      }, false);
      document.addEventListener('mousedown', function() {
        document.addEventListener('mousemove', onMouseMove, false);
      }, false);

    },

    /**
     * Update callback
     */
    update: function(ctx) {
      this.ctx = ctx;
      var gl = ctx.gl;

      this.data.render();

      gl.enable(gl.BLEND);
      this.particles.clear().render();
      gl.disable(gl.BLEND);
    },

    /**
     * Resize
     */
    resize: function(ctx) {
      this.ctx = ctx;
      this.particles.resize();
    },

    mousemove: function(e) {
      if (this.ctx.paused) {
        return;
      }

      var gl = this.ctx.gl;

      // Find the position on canvas
      var i = e.offsetX / this.ctx.width,
          j = 1.0 - e.offsetY / this.ctx.height;

      // Determine the x and y coordinates in the particles data texture
      var x = ~~ (this.bufferIndex % CELLS_PARTICLE_DATA);
      var y = ~~ (this.bufferIndex / CELLS_PARTICLE_DATA);
      
      gl.bindTexture(gl.TEXTURE_2D, this.data.output);

      for (var p = 0; p < PARTICLE_EMIT_RATE; p++) {
        var angle = Math.random() * PI_2;

        this.buffer.push(
          i + Math.cos(angle) * Math.random() * PARTICLE_RADIUS,
          j + Math.sin(angle) * Math.random() * PARTICLE_RADIUS * this.ctx.aspect,
          PARTICLE_SIZE,
          Math.random() * PARTICLE_AGE
        );
      }

      // write data in the texture
      gl.texSubImage2D(
        gl.TEXTURE_2D, 0, x, y, PARTICLE_EMIT_RATE, 1,
        gl.RGBA, gl.FLOAT, new Float32Array(this.buffer)
      );

      this.buffer = [];
      this.bufferIndex = (this.bufferIndex + PARTICLE_EMIT_RATE) % PARTICLE_COUNT;
    }

  });

})();