
(function() {

  Stage.Visualizer = Stage.Effect.extend({
    
    name: 'visualizer',

    initialize: function(ctx) {
      this.ctx = ctx;

      var gl = ctx.gl;

      this.uniforms = {
        'sampler': {type: 't', value: ctx.effects.fluid.dye.output},
        'particles': {type: 't', value: ctx.effects.particles.particles.output}
      };
      this.visualizer = new RTT(gl, {
        texture: { minFilter: gl.LINEAR, magFilter: gl.LINEAR }
      }).fragment(document.getElementById('fluid-visualizer').textContent, this.uniforms)
        .render();
    },
    
    update: function(ctx) {
      var gl = ctx.gl;
      
      this.uniforms.particles.value = ctx.effects.particles.particles.output;

      gl.enable(gl.BLEND);
      this.visualizer.clear().render();
      gl.disable(gl.BLEND);

      this.visualizer.paint();
    },
    
    resize: function(ctx) {
      this.ctx = ctx;

      this.visualizer.resize();
    }

  });

})();