
(function() {

  var TIMESTEP = 0.25;
  var CELLS = 256;

  Stage.Fluid = Stage.Effect.extend({
    
    name: 'fluid',

    initialize: function(ctx) {
      this.ctx = ctx;

      var gl = ctx.gl;

      this.uniforms = {
        'd': { type: '2f', value: [1/CELLS, 1/CELLS]},
        'dt': { type: '1f', value: TIMESTEP },
        'motion': {type: 't', value: ctx.effects['motion'].motion.output}
      };
      this.solver = new RTT(gl, {
        width: CELLS,
        height: CELLS,
        texture: { type: gl.FLOAT }
      }).fragment(document.getElementById('fluid-solver').textContent, this.uniforms)
        .render();

      this.uniforms.solver = {type: 't', value: this.solver.output};

      this.dye = new RTT(gl, {
        width: CELLS,
        height: CELLS,
        texture: {  type: gl.FLOAT , minFilter: gl.LINEAR, magFilter: gl.LINEAR }
      }).fragment(document.getElementById('fluid-dye').textContent, this.uniforms)
        .render();
    },
    
    update: function(ctx) {
      this.uniforms.motion.value = ctx.effects['motion'].motion.output;
      this.solver.render();
      this.uniforms.solver.value = this.solver.output;
      this.dye.render();
    }

  });

})();