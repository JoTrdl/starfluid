/*! RTT.gl v1.0.0 | (c) 2015 Johann Troendle | https://github.com/JoTrdl/rtt.gl */
;(function(exports) {

  'use strict';

  var utils = {};

  /**
   * Create a GL program.
   * 
   * @param  {WebGLRenderingContext} gl      WebGL context
   * @param  {String}                vsCode  Vertex code
   * @param  {String}                fsCode  Fragment code
   * @return {Program}                       The program compiled & linked.
   */
  utils.createProgram = function(gl, vsCode, fsCode) {
    var i, vs, fs, tmpProgram = gl.createProgram();

    try {
      vs = this.compileShader(gl, vsCode, gl.VERTEX_SHADER);
      fs = this.compileShader(gl, fsCode, gl.FRAGMENT_SHADER);
    } catch (e) {
      gl.deleteProgram(tmpProgram);
      throw e;
    }

    gl.attachShader(tmpProgram, vs);
    gl.deleteShader(vs);
    gl.attachShader(tmpProgram, fs);
    gl.deleteShader(fs);
    gl.linkProgram(tmpProgram);

    return tmpProgram;
  };

  /**
   * Compile the shader.
   * 
   * @param  {WebGLRenderingContext} gl   WebGL context
   * @param  {String}                code Shader code
   * @param  {Int}                   type Shader type (gl.VERTEX_SHADER | gl.FRAGMENT_SHADER)
   * @return {Shader}                Compiled shader
   */
  utils.compileShader = function(gl, code, type) {
    var shader = gl.createShader(type);
    
    gl.shaderSource(shader, code);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var lines = gl.getShaderSource(shader).split('\n');
      var src = '';
      for (var i = 0; i < lines.length; i++) {
        src += (i+1) + '.' + lines[i] + '\n';
      }
      throw 'GLSL Compilation Error:\n' + gl.getShaderInfoLog(shader) + '\n' + src;
    }

    return shader;
  };

  /**
   * Create an empty texture.
   * 
   * @param  {WebGLRenderingContext} gl     WebGL context
   * @param  {Number}                width  Width
   * @param  {Number}                height Height
   * @return {Texture}                      The texture
   */
  utils.createTexture = function(gl, width, height, options) {
    
    var type = options && options.type || gl.UNSIGNED_BYTE;
    var min = options && options.minFilter || gl.NEAREST;
    var mag = options && options.magFilter || gl.NEAREST;
    var wrapS = options && options.wrapS || gl.CLAMP_TO_EDGE;
    var wrapT = options && options.wrapT || gl.CLAMP_TO_EDGE;

    var texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, type, null);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);

    // We are ready, release the texture.
    gl.bindTexture(gl.TEXTURE_2D, null);

    return texture;
  };

  /**
   * The default vertex.
   * @type {String}
   */
  var DEFAULT_VERTEX_SHADER = [
    'attribute vec2 position;',
    'varying vec2 vUv;',

    'void main() {',
      'vUv =  position;',
      'vec2 vPos = position * 2.0 - 1.0;',
      'gl_Position = vec4(vPos.x, vPos.y, 0, 1);',
    '}'
  ].join('\n');

  /**
   * The default fragment to paint in buffer.
   * @type {String}
   */
  var DEFAULT_FRAGMENT_SHADER = [
    'precision highp float;',
    'uniform sampler2D tSampler;',

    'varying vec2 vUv;',
    'void main() {',
    '  gl_FragColor = texture2D(tSampler, vUv);',
    '}'
  ].join('\n');

  /**
   * 2 triangles (plane) for painting the result
   * @type {Float32Array}
   */
  var VERTICES = new Float32Array([
    -1.0,-1.0, 1.0,-1.0, -1.0,1.0,
    1.0,-1.0, 1.0,1.0, -1.0,1.0
  ]);

  /**
   * Pre-compute VERTICES length
   * @type {Number}
   */
  var VERTICES_LENGTH = VERTICES.length / 2;

  /**
   * Apply uniform.
   * 
   * @param  {Object} gl       GL context
   * @param  {Object} shader   Shader program
   * @param  {Object} type     GL uniform type or 't' for texture
   * @param  {String} location Uniform name
   * @param  {Object} value    Value to set
   * @param  {Object} texture  Web GL texture if type is 't'
   */
  var applyUniform = function(gl, shader, type, location, value, texture) {
    var uLocation = gl.getUniformLocation(shader, location);

    if (value === null || !uLocation) {
      return;
    }
    
    var args = [uLocation];
    if (value.length) // value is an array
      args = args.concat(value);
    else
      args.push(value);

    if (!texture) {
      type.apply(gl, args);
    }
    else { // texture
      type.call(gl, uLocation, value);

      if (texture.length) { 
        // textures array
        for (var i = 0; i < texture.length; i++) {
          gl.activeTexture(gl.TEXTURE0 + value[i]);
          gl.bindTexture(gl.TEXTURE_2D, texture[i]);
        }
      }
      else { // single texture
        gl.activeTexture(gl.TEXTURE0 + value);
        gl.bindTexture(gl.TEXTURE_2D, texture);
      } 
    }
  };

  /**
   * Apply attribute.
   * 
   * @param  {Object} gl       GL context
   * @param  {Object} shader   Shader program
   * @param  {String} location Location name
   */
  var applyAttribute = function(gl, shader, location, size, buffer, data) {
    var aLocation = gl.getAttribLocation(shader, location);

    if (aLocation < 0) {
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(aLocation);
    gl.vertexAttribPointer(aLocation, size, gl.FLOAT, false, 0, 0);
  };

  /**
   * RTT constructor
   * @param {WebGLRenderingContext} gl      WebGL context for rendering
   * @param {Object}                options Object of options.
   */
  var RTT = function(gl, options) {
    this.options = options || {};
    this.gl = gl;
   
    if (!(this.gl && this.gl instanceof WebGLRenderingContext)) {
      console.log('Error, paramater [gl] must be a WebGL context');
      return;
    }

    // Init texture size
    this.width = this.options.width || gl.canvas.width;
    this.height = this.options.height || gl.canvas.height;

    // Init viewport size
    this.viewportWidth = this.options.viewportWidth || gl.canvas.width;
    this.viewportHeight = this.options.viewportHeight || gl.canvas.height;

    // Initialize stuffs
    this.reset(true);
  };
  
  /**
   * Resize the RTT.
   *  
   * @param  {Object} options Object containing the new width/height.
   * @return {Object}         'this'
   */
  RTT.prototype.resize = function(options) {
    var gl = this.gl;

    this.width = options && options.width || gl.canvas.width;
    this.height = options && options.height || gl.canvas.height;

    this.viewportWidth = options && options.viewportWidth || gl.canvas.width;
    this.viewportHeight = options && options.viewportHeight || gl.canvas.height;

    // Update texture sizes
    for (var i = 0; i < this.textures.length; i++) {
      var type = this.options.texture && this.options.texture.type || gl.UNSIGNED_BYTE;
      gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, type, null);
    }

    // Update history size
    for (var i = 0; i < this.history.length; i++) {
      var type = this.options.texture && this.options.texture.type || gl.UNSIGNED_BYTE;
      gl.bindTexture(gl.TEXTURE_2D, this.history[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, type, null);
    }

    return this;
  };

  RTT.prototype.reset = function(init) {
    var gl = this.gl;

    if (!init) {
      var i;
      // Clean textures
      for (i = 0; i < this.textures.length; i++) {
        gl.deleteTexture(this.textures[i]);
      }

      // Clean shaders
      for (i = 0; i < this.shaders.length; i++) {
        gl.deleteProgram(this.shaders[i]);
      }

      // clean framebuffer
      gl.deleteFramebuffer(this.frameBuffer);

      // clean geometry buffer
      gl.deleteBuffer(this.geometryBuffer);

      // Clean history
      for (i = 0; i < this.history.length; i++) {
        gl.deleteTexture(this.history[i]);
      }
    }

    // Shaders list
    this.shaders = [];

    // Atrributes list
    this.attributes = [];

    // Uniforms list
    this.uniforms = [];

    // Framebuffer & textures
    this.frameBuffer = gl.createFramebuffer();
    this.textures = [
      utils.createTexture(gl, this.width, this.height, this.options.texture),
      utils.createTexture(gl, this.width, this.height, this.options.texture)
    ];

    // History textures
    this.history = new Array(this.options.history + 1 || 0); // One more for ping-pong
    for (var i = 0; i < this.history.length; i++) {
      this.history[i] = utils.createTexture(gl, this.width, this.height, this.options.texture);
    }

    // Cyclic index
    this.renderIndex = 0;

    // Paint buffer & shader
    this.quadBuffer = gl.createBuffer();
    this.paintShader = utils.createProgram(gl, DEFAULT_VERTEX_SHADER, DEFAULT_FRAGMENT_SHADER);

    // Init quad buffer for painting + geometry for rendering
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    this.quadVertices = new Float32Array(VERTICES);

    this.geometryBuffer = this.quadBuffer;
    this.vertices = this.quadVertices;
    this.geometry = [gl.TRIANGLE_STRIP, 0, VERTICES_LENGTH]; // default to quad

    // Process custom geometry
    if (this.options.geometry) {
      this.geometryBuffer = gl.createBuffer();
      this.vertices = this.options.geometry.shift();

      this.geometry = this.options.geometry;
    }

    return this;
  };

  /**
   * Add a new fragment in the RTT chain with DEFAULT_VERTEX_SHADER vertex.
   * 
   * @param  {String} fragmentShader The fragment shader
   * @return {Object}                'this' RTT for chaining
   */
  RTT.prototype.fragment = function(fragmentShader, uniforms) {
    return this.vertexFragment(DEFAULT_VERTEX_SHADER, fragmentShader, uniforms);
  };

  /**
   * Add a new vertex/fragment in the RTT chain.
   * 
   * @param  {String} vertexShader   The vertext shader
   * @param  {String} fragmentShader The fragment shader
   * @return {Object}                'this' RTT for chaining
   */
  RTT.prototype.vertexFragment = function(vertextShader, fragmentShader, uniforms, attributes) {

    var shader = utils.createProgram(this.gl, vertextShader, fragmentShader);

    this.shaders.push(shader);
    this.uniforms.push(uniforms);
    
    // Init buffers before pushing on stack
    for (var a in attributes) {
      attributes[a].buffer = gl.createBuffer();
    }

    this.attributes.push(attributes);

    return this;
  };

  /**
   * Render the fragments.
   * @return {Object}  'this' RTT for chaining
   */
  RTT.prototype.render = function() {

    var gl = this.gl, input, i, j, textureUnit, units;

    for (i = 0; i < this.shaders.length; i++) {

      textureUnit = 0;

      this.renderIndex = (this.renderIndex + 1) % 2;

      // Ping pong
      input = this.output;
      this.output = this.textures[this.renderIndex];

      // Switch with history texture if last shader
      if (this.history.length && i == this.shaders.length-1) {
        // Advance in history
        this.history.unshift(this.history.pop());
        this.output = this.history[0];
      }

      // Bind program & framebuffer
      gl.useProgram(this.shaders[i]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.output, 0);

      // Apply position attribute
      applyAttribute(gl, this.shaders[i], 'position', 2, this.geometryBuffer, this.vertices);

      var attributes = this.attributes[i] || {};
      for (var a in attributes) {
        applyAttribute(gl, this.shaders[i], a, attributes[a].size, attributes[a].buffer, attributes[a].data);
      }

      // Apply n-1 sampler result
      applyUniform(gl, this.shaders[i], gl.uniform1i, 'tSampler', textureUnit, input);
      textureUnit ++;
      
      // Apply uniforms
      var uniforms = this.uniforms[i] || {};
      for (var u in uniforms) {
        if (uniforms[u].type == 't') {
          applyUniform(gl, this.shaders[i], gl.uniform1i, u, textureUnit, uniforms[u].value);
          textureUnit ++;
        }
        else {
          applyUniform(gl, this.shaders[i], gl['uniform' + uniforms[u].type], u, uniforms[u].value);
        }
      }

      if (this.history.length) {
        units = [];
        for (j = 1; j < this.history.length; j++) {
          units.push(++textureUnit);
        }
        applyUniform(gl, this.shaders[i], gl.uniform1iv, "tHistory", units, this.history.slice(1));
      }

      // Draw
      gl.viewport(0, 0, this.width, this.height);
      gl.drawArrays.apply(gl, this.geometry);
    }
   
    return this;
  };

  /**
   * Iterate the last program on the stack.
   * 
   * @param  {Number} count Iterate count
   * @return {Object} 'this' RTT for chaining
   */
  RTT.prototype.iterate = function(count) {

    var shader = this.shaders[this.shaders.length - 1];
    var uniform = this.uniforms[this.uniforms.length - 1];
    
    for (var i = 0; i < count; i++) {
      this.shaders.push(shader);
      this.uniforms.push(uniform);
    }

    return this;
  };

  /**
   * Swap the 2 internal textures.
   * 
   * @return {Object} 'this' RTT for chaining
   */
  RTT.prototype.swap = function() {
    var tmp = this.textures[0];
    this.textures[0] = this.textures[1];
    this.textures[1] = tmp;

    return this;
  };

  /**
   * Clear the framebuffer.
   * 
   * @return {Object} 'this' RTT for chaining
   */
  RTT.prototype.clear = function() {
    
    if (!this.output) { // Nothing to clear
      return this;
    }

    var gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    return this;
  };

  /**
   * Paint in the screen buffer.
   * @return {Object} 'this' RTT for chaining
   */
  RTT.prototype.paint = function() {
    
    if (!this.output) {
      console.log('Error: no output to paint. Call render() at least once.');
      return this;
    }

    var gl = this.gl;

    gl.useProgram(this.paintShader);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    applyAttribute(gl, this.paintShader, 'position', 2, this.quadBuffer, this.quadVertices);
    applyUniform(gl, this.paintShader, gl.uniform1i, 'tSampler', 0, this.output);

    gl.viewport(0, 0, this.viewportWidth, this.viewportHeight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, VERTICES_LENGTH);

    return this;
  };

  // Export
  exports.RTT = RTT;

})(window);