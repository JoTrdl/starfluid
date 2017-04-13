
(function() {

  var CELLS = 256;

  Stage.Motion = Stage.Effect.extend({

    name: 'motion',

    initialize: function(ctx) {
      this.ctx = ctx;

      var gl = ctx.gl;

      this.uniforms = {
        'point': { type: '2f', value: null},
        'lastPoint': { type: '2f', value: null},
        'dye': { type: '1f', value: 0.0},
        'velocity': { type: '2f', value: [0,0]},
        'ratio': { type: '1f', value: ctx.aspect}
      };

      this.motion = new RTT(gl, {
        width: CELLS,
        height: CELLS,
        texture: { type: gl.FLOAT }
      }).fragment(document.getElementById('fluid-motion').textContent, this.uniforms)
        .render();

      var self = this;
      document.addEventListener('mouseup', function () {
        self.addDye = false;
      }, false);
      document.addEventListener('mousedown', function (event) {
        event = event || window.event;
        //The following will detect if the left and only the left mouse button is pressed
        var isLeftButtonPressed = "buttons" in event ? event.buttons == 1 : event.which || event.button;
        if (isLeftButtonPressed){
          self.addDye = true;
        }
      }, false);
      canvas.addEventListener('mousemove', this.mousemove.bind(this), false);
    },

    update: function(ctx) {
      this.ctx = ctx;
      this.motion.render();
      this.uniforms.velocity.value = [0, 0];
      this.uniforms.dye.value = 0;
    },

    resize: function(ctx) {
      this.ctx = ctx;
      this.uniforms.ratio.value = ctx.aspect;
    },

    mousemove: function(e) {
      if (this.ctx.paused) {
        return;
      }

      this.oldMouseX = this.oldMouseX || 0;
      this.oldMouseY = this.oldMouseY || 0;

      var mouseX = e.offsetX,
        mouseY = e.offsetY;

      // Find the cell below the mouse
      var i = ((mouseX / this.ctx.width) * CELLS) | 0,
          j = ((mouseY / this.ctx.height) * CELLS) | 0;

      // Set the current position in source shader
      this.uniforms.lastPoint.value = (this.uniforms.point.value) ? this.uniforms.point.value : [i/CELLS, 1.0 - j/CELLS];
      this.uniforms.point.value = [i/CELLS, 1.0 - j/CELLS];

      // Mouse velocity
      var du = (mouseX - this.oldMouseX),
          dv = (mouseY - this.oldMouseY);

      // Convert in shader space
      du = (du / this.ctx.width);
      dv = (dv / this.ctx.height);

      this.uniforms.velocity.value = [du, -dv];
      if (this.addDye) {
        this.uniforms.dye.value = 1.0;
      }

      this.oldMouseX = mouseX;
      this.oldMouseY = mouseY;
    }

  });

})();
