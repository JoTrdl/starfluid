/*! stage.gl.js v1.0.0 | (c) 2015 Johann Troendle | https://github.com/JoTrdl/stage.gl */
;(function(exports) {

  'use strict';

  // Namespace
  var Stage = {};

  var extend = function(obj, source) {
    for (var key in source) {
      if (source.hasOwnProperty(key))
        obj[key] = source[key];
    }
    return obj;
  };

  /**
   * Base effect prototype
   */
  Stage.Effect = function() {};
  Stage.Effect.extend = function(source) {
    var e = function() {};
    extend(e.prototype, Stage.Effect.prototype);
    extend(e.prototype, source);
    return e;
  };

  Stage.Effect.prototype = {
    index: 0,

    initialize: function(ctx) {},
    update: function(ctx) {},
    resize: function(ctx) {}
  };

  /**
   * Utils to retrieve 3d context
   * @param  {HTMLCanvasElement} canvas  The canvas
   * @param  {Object}            options Options for getContext()
   * 
   * @return {Context3d}         Context or null if unavailable.
   */
  var getContext = function(canvas, options) {
    return canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
  };

  /**
   * Renderer
   * @param {HTMLCanvasElement} canvas The canvas
   */
  Stage.Renderer = function(canvas, options) {
    this.canvas = canvas;
    this.gl = getContext(canvas, options && options.gl);
    if (!this.gl) {
      throw 'WebGl is not supported';
    }
    this.effects = [];
    this.names = {};

    this.options = options || {};
    this.events = {};

    this.paused = false;

    this.container = this.options.container || window;

    this.context = {
      gl: this.gl,
      width: this.container.offsetWidth || this.container.innerWidth,
      height: this.container.offsetHeight || this.container.innerHeight,
      effects: this.names,
      paused: this.paused
    };
    this.context.aspect = this.context.width / this.context.height;

    window.addEventListener('resize', this.resize.bind(this));
  };

  /**
   * Add an effect on the stack.
   * Effects are sorted using the effect.index property.
   * @param {Effect} effect Effect to add.
   */
  Stage.Renderer.prototype.effect = function(effect) {
    this.effects.push(effect);
    if (effect.name) {
      this.names[effect.name] = effect;
    }
    
    return this;
  };

  /**
   * Start rendering.
   */
  Stage.Renderer.prototype.render = function() {
    var self = this;

    // Sort effects
    this.effects.sort(function(a, b) {
      return a.index - b.index;
    });

    // Initialize effects
    for (var i = 0; i < this.effects.length; i++) {
      this.effects[i].initialize(this.context);
    }

    render(this);

    return this;
  };

  function render(renderer) {
    function loop() {
      if (!renderer.paused) {
        requestAnimationFrame(loop);
      }

      for (var i = 0; i < renderer.effects.length; i++) {
        renderer.effects[i].update(renderer.context);
      }
    }
    loop();
  }

  /**
   * Pause renderer.
   */
  Stage.Renderer.prototype.pause = function() {

    this.paused = !this.paused;
    this.context.paused = this.paused;

    if (!this.paused) {
      // restart
      render(this);
    }
    
    return this;
  };

  /**
   * Resize renderer.
   */
  Stage.Renderer.prototype.resize = function() {

    this.context.width = this.container.offsetWidth || this.container.innerWidth;
    this.context.height = this.container.offsetHeight || this.container.innerHeight;
    this.context.aspect = this.context.width / this.context.height;

    for (var i = 0; i < this.effects.length; i++) {
      this.effects[i].resize(this.context);
    }

    this.monitor.reset();
    
    return this;
  };

  // Exports
  exports.Stage = Stage;

})(window);