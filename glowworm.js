// the Glowworm WebGL library
// First Created by Victor Lawrence, Nov. 2016

/*
	This plugin packages a whole bunch of helper functions when dealing with Webgl.
*/

function Glowworm(targetElement){
	
	var self = this;

	var gl, canvas;

	function init(){

		if (typeof targetElement === "string"){
			canvas = document.getElementById(targetElement);
		}else{
			canvas = targetElement;
		}
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		if(!gl){
			console.error("Webgl is not supported by this browser!");
			return;
		}

		gl.enable(gl.BLEND)
      	//gl.enable(gl.DEPTH_TEST);
		  gl.disable(gl.DEPTH_TEST);
		  gl.depthFunc(gl.LESS);

		self.gl = gl;
		self.canvas = canvas;
		self.util = {
			loadFile: loadFile,
			loadImage: loadImage,
			loadImages: loadImages,
		};
		self.clear = clear;
		self.resetViewport = resetViewport;
		self.resize = resize;
		self.resizeTo = resizeTo;
		self.resizeAndMatchViewport = resizeAndMatchViewport;
		self.resizeToAspectRatio = resizeToAspectRatio;
		self.resetViewportToAspectRatio = resetViewportToAspectRatio;
		self.resetViewportToMatchVideoElementAspectRatio = resetViewportToMatchVideoElementAspectRatio;
		self.getAttributes = getAttributes;
		self.getUniforms = getUniforms;
		self.shaders = {
			create:createShader,
			createVertexShader_FromFile:_CreateVertexShaderFromFile,
			createFragmentShader_FromFile:_CreateFragmentShaderFromFile,
			createProgram:createProgram,
			createProgram_FromFiles:createProgramFromShaderFiles,
		};
		self.textures = {
			create:createTexture,
			updateWithVideo:updateTextureWithVideo,
		};
		self.buffers = {
			init:initBuffer,
		};
		self.rectangles = {
			create:createRectangle,
		}
	}
	init();

	function errorWrapper(context, value){
		var newErrorLevel = {};
		newErrorLevel[context] = value;
		return newErrorLevel;
	}

	function loadFile(filepath, callback){
		var output;

		function loaded (event) {
			// console.log(this.responseText, event);
			callback(null, this.responseText);
		}

		function error (event){
			// console.error(event);
			// console.log("What?!?");
			callback(event, null);
		}

		var oReq = new XMLHttpRequest();
		oReq.addEventListener("load", loaded);
		oReq.addEventListener("error", error);
		oReq.open("GET", filepath);
		oReq.send();
	}

	function createShader(type, source, callback){
		var shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if (success){
			callback(null, shader);
		}else{
			var error = gl.getShaderInfoLog(shader);
			var wrappedError = errorWrapper("createShader()", error);
			callback(wrappedError);
			gl.deleteShader(shader);
		}
	}
	function _CreateVertexShaderFromFile(filepath, callback){
		createShaderFromFile(filepath, gl.VERTEX_SHADER, callback);
	}
	function _CreateFragmentShaderFromFile(filepath, callback){
		createShaderFromFile(filepath, gl.FRAGMENT_SHADER, callback);
	}
	function createShaderFromFile(filepath, type, callback){
		var errors = [];

		var isFrag = type === gl.FRAGMENT_SHADER;
		var isVert = type === gl.VERTEX_SHADER;

		var errType = type;

		if (isFrag){
			errType = "FRAGMENT SHADER";
		}
		else if (isVert){
			errType = "VERTEX SHADER";
		}

		var errContext = "createShaderFromFile() [" + errType + "] [" + filepath + "]";

		loadFile(filepath, function(err, fileString){
			if (err){
				var wrappedError = errorWrapper(errContext, err);
				callback(wrappedError);
			}else{
				createShader(type, fileString, function(err, shader){
					if (err){
						var wrappedError = errorWrapper(errContext, err);
						callback(wrappedError);
					}else{
						callback(null, shader);
					}
				})
			}
		})
	}

	function createProgram(vertexShader, fragmentShader, callback){
		var program = gl.createProgram();
		var errContext = "createProgram()";
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		gl.bindAttribLocation(program, 0, "aPosition");
		var success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if(success){
			callback(null, program);
		}else{
			var error = gl.getProgramInfoLog(program);
			var wrappedError = errorWrapper(errContext, error);
			callback(wrappedError);
			gl.deleteProgram(program);
		}
	}

	function createProgramFromShaderFiles(vertexShaderFilePath, fragmentShaderFilePath, callback){
		var counter = 0;
		var errors = [];
		var fragShader;
		var vertShader;
		_CreateFragmentShaderFromFile(fragmentShaderFilePath, function(err, fragmentShader){
			counter++;
			if(err){
				errors.push(err);
			}
			fragShader = fragmentShader;
			if(counter == 2){
				continueTheJourney();
			}
		});
		_CreateVertexShaderFromFile(vertexShaderFilePath, function(err, vertexShader){
			counter++;
			if(err){
				errors.push(err);
			}
			vertShader = vertexShader;
			if(counter == 2){
				continueTheJourney();
			}
		});
		function continueTheJourney(){
			if (errors.length > 0){
				callback(errors);
			}else{
				createProgram(vertShader, fragShader, callback);
			}
		}
	}

	function getAttributes(program){
		var count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
		var output = {};
		for(var i = 0; i < count; i++){
			var key = gl.getActiveAttrib(program, i).name;
			var value = gl.getAttribLocation(program, key);
			output[key] = value;
		}
		return output;
	}

	function getUniforms(program){
		var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
		var output = {};

		for(var i = 0; i < count; i++){
			var key = gl.getActiveUniform(program, i).name;
			var value = gl.getUniformLocation(program, key);
			output[key] = value;
		}

		return output;
	}

	function resize(){
		var realToCSSPixels = window.devicePixelRatio; // default is 1, but could be up to 3... may need to optomize this a bit

		var displayHeight = Math.floor(gl.canvas.clientHeight * realToCSSPixels);
		var displayWidth = Math.floor(gl.canvas.clientWidth * realToCSSPixels);

		if(gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight){
			gl.canvas.width = displayWidth;
			gl.canvas.height = displayHeight;
		}
	}

	function resizeTo(newWidth, newHeight){
		
		var realToCSSPixels = window.devicePixelRatio;
		var displayHeight = Math.floor(newWidth * realToCSSPixels);
		var displayWidth = Math.floor(newHeight * realToCSSPixels);

		if(gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight){
			gl.canvas.width = displayWidth;
			gl.canvas.height = displayHeight;
		}
	}

	function resizeToAspectRatio(ratio){

		var newWidth = Math.floor((gl.canvas.clientWidth * ratio) + gl.canvas.height);
		var newHeight = gl.canvas.clientHeight;

		console.log("Width:", newWidth);
		console.log("Height", newHeight);

		resizeTo(newWidth, newHeight);
	}

	function resizeAndMatchViewport(){
		resize();
		resetViewport();
	}

	function resetViewport(){
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	}

	function resetViewportToAspectRatio(ratio){
		var canvasHeight = gl.canvas.height;
		var canvasWidth = gl.canvas.width;
		if (canvasWidth >= canvasHeight){
			var width = canvasWidth;
			var height = canvasWidth / ratio;
			gl.viewport(0, 0, width, height);
		}else{
			var width = canvasHeight * ratio;
			var height = canvasHeight;

			var leftOffset = (canvasWidth/2) - (width/2);
			gl.viewport(leftOffset,0, width, height);
		}

	}

	function resetViewportToMatchVideoElementAspectRatio(videoElement){
		var videoWidth = videoElement.width;
		var videoHeight = videoElement.height;
		var ratio = videoWidth / videoHeight;
		resetViewportToAspectRatio(ratio);
	}

	function clear(){
		gl.clearColor(0,0,0,0);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	function initBuffer(data, elmPerVertex, attribute){
		var buffer = gl.createBuffer();
		if(!buffer){
			throw new Error("Failed to create buffer.");
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		gl.vertexAttribPointer(attribute, elmPerVertex, gl.FLOAT, false, 0,0);
		gl.enableVertexAttribArray(attribute);
	}

	function createTexture(imageData, callback){
		var texture = gl.createTexture();
		if (!texture){
			if (typeof callback === "function"){
				callback(new Error("Unable to create a texture!"))
			}
			throw new Error("Unable to create texture!");
		}
		gl.bindTexture(gl.TEXTURE_2D, texture);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		if (imageData){
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
		}else{
			gl.deleteTexture(texture);
		}
		

		if (typeof callback === "function"){
			callback(null, texture);
		}else{
			return texture;
		}
	}

	function updateTextureWithVideo(texture, videoElement){
		if (texture && videoElement){
			gl.bindTexture(gl.TEXTURE_2D, texture);
			// gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);
		}
	}

	function loadImage(url, callback){
		var image = new Image();
		image.src = url;
		image.onload = function(){
			callback(image);
		}
	}

	function loadImageAndIndex(url, index, callback){
		// special helper function for the loadImages() function.
		loadImage(url, function(image){
			callback(index, image);
		})
	}

	function loadImages(urlArray, callback){
		// The index of the url of the image that you specify
		// is where the final image data is placed in the done array. 

		// you will only ge the done array once all the images are downloaded.

		var count = 0;
		var expected = urlArray.length;
		var done = createEmptyArray(urlArray.length, undefined);
		for(var i = 0; i < urlArray.length; i++){
			var index = i;
			var url = urlArray[index];
			loadImageAndIndex(url, index, imageLoaded);
		}

		function imageLoaded(index, image){
			count++;
			done[index] = image;
			// console.log("index:", index);
			if (count === expected){
				complete(done);
			}
		}

		function complete(output){
			callback(output);
		}
	}

	function createEmptyArray(length, defaultValue){
		var output = [];
		for(var i = 0; i < length; i++){
			output.push(defaultValue);
		}
		return output;
	}

	function createRectangle(x,y,width, height, attribute){
		var x1 = x;
		var x2 = x + width;
		var y1 = y;
		var y2 = y + height;

		var rectData = new Float32Array([
			/* 

				width

			x1y1      x2y1
				+----/
				|   /
		height	|  /
				| /
				|/
			x1y2

			*/
			x1, y1,
			x2, y1,
			x1, y2,

			/*

					 x2y1
				    /|
				   / |
				  /  |	height
				 /   |
				/----+
			x1y2	 x2y2

				width


			*/

			x1, y2,
			x2, y1,
			x2, y2,
		]);

		initBuffer(rectData, 2, attribute);
	}

}