function Glowworm(targetElement, label){
	
	var self = this;

	var gl, canvas;

	var isWebGLEnabled = false;

	function init(){

		if (typeof targetElement === "string"){
			canvas = document.getElementById(targetElement);
		}else{
			canvas = targetElement;
		}
		// console.count("Glow Load");
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

		// console.log(label,"Got Context:", canvas.width, canvas.height);

		if(!gl){
			console.warn("Webgl is not supported by this browser!");
			return false;
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
		self.supportsWebGl = supportsWebGl;
		
		self.resize = resize;
		self.resizeTo = resizeTo;
		self.resizeAndMatchViewport = resizeAndMatchViewport;
		self.resizeToAspectRatio = resizeToAspectRatio;

		self.resetViewport = resetViewport;
		self.resetViewportTo = resetViewportTo;
		self.resetViewportToAspectRatio = resetViewportToAspectRatio;
		self.resetViewportToMatchVideoElementAspectRatio = resetViewportToMatchVideoElementAspectRatio;
		self.resetViewportContainMediaSize = resetViewportContainMediaSize;		

		self.getAttributes = getAttributes;
		self.getUniforms = getUniforms;
		
		self.shaders = {
			create:createShader,
			createVertexShader_FromFile:_CreateVertexShaderFromFile,
			createFragmentShader_FromFile:_CreateFragmentShaderFromFile,
			createProgram:createProgram,
			createProgram_FromFiles:createProgramFromShaderFiles,
			createProgramFromShaderStrings:createProgramFromShaderStrings,
		};
		self.renderBuffers = {
			create:createRenderBuffer,
			// attachTexture: attachTextureToRenderBuffer,
		},
		self.frameBuffers = {
			activate:activateFrameBuffer,
			deactivate:deactivateFrameBuffer,
			create:createFrameBuffer,
			applyTexture:applyTextureToFrameBuffer,
			applyRenderBuffer:applyRenderBufferToFrameBuffer,
			canReadActive:canReadActiveFrameBuffer,
		},
		self.textures = {
			maxUnits:getMaxTextureUnits,
			create:createTexture,
			createBlank:createBlankTexture,
			updateWithVideo:updateTextureWithVideo,
			updateWithArrayBuffer:updateTextureWithArrayBuffer,
			update:updateTexture,
		};
		self.buffers = {
			init:initBuffer,
		};
		self.rectangles = {
			create:createRectangle,
		}
	
	}
	init();

	function supportsWebGl(){
		return 
	}

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

	function createFragmentShaderFromString(fileString, callback){
		var errContext = "createFragmentShaderFromString() [" + fileString + "]";
		createShader(gl.FRAGMENT_SHADER, fileString, function(err, shader){
			if (err){
				var wrappedError = errorWrapper(errContext, err);
				callback(wrappedError);
			}else{
				callback(null, shader);
			}
		})
	}
	function createVertexShaderFromString(fileString, callback){
		var errContext = "createVertexShaderFromString() [" + fileString + "]";
		createShader(gl.VERTEX_SHADER, fileString, function(err, shader){
			if (err){
				var wrappedError = errorWrapper(errContext, err);
				callback(wrappedError);
			}else{
				callback(null, shader);
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

	function createProgramFromShaderStrings(vertexShaderString, fragmentShaderString, callback){
		var vShader_compiled;
		var fShader_compiled;

		var errors = [];
		var counter = 0;

		createFragmentShaderFromString(fragmentShaderString, function(err, fShader){
			if (err){
				errors.push(err);
			}else{
				fShader_compiled = fShader;
			}
			counter++;
			if (counter === 2){
				continueTheJourney();
			}
		})
		createVertexShaderFromString(vertexShaderString, function(err, vShader){
			if (err){
				errors.push(err);
			}else{
				vShader_compiled = vShader;
			}
			counter++;
			if (counter === 2){
				continueTheJourney();
			}
		})

		function continueTheJourney(){
			if (errors.length > 0){
				callback(errors);
			}else{
				createProgram(vShader_compiled, fShader_compiled, callback);
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

	function resize(hadToResize){
		var realToCSSPixels = window.devicePixelRatio; // default is 1, but could be up to 3... may need to optomize this a bit
		// var realToCSSPixels = 1; 
		
		var displayHeight = Math.floor(gl.canvas.clientHeight * realToCSSPixels);
		var displayWidth = Math.floor(gl.canvas.clientWidth * realToCSSPixels);

		if(gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight){
			gl.canvas.width = displayWidth;
			gl.canvas.height = displayHeight;
			// console.log(label,"Resize!", canvas.width, canvas.height);
			if(typeof hadToResize === "function"){
				hadToResize();
			}
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
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	}
	
	function resetViewportTo(x1, y1, x2, y2){
		gl.viewport(x1, y1, x2, y2);
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

	function resetViewportContainMediaSize(mediaWidth, mediaHeight){
		// START CONTAIN CODE ///

			var wizardHeight = canvas.height;
			var wizardWidth = canvas.width;
			
			var mediaRatio = mediaWidth / mediaHeight / 2;

			var wizardRatio = (wizardWidth / wizardHeight) * mediaRatio;			

			var isLandscape = wizardRatio > 1;
			var isPortrait = wizardRatio < 1;
			var isSquare = wizardRatio == 1;

			// console.log("L", isLandscape, "P", isPortrait, "S", isSquare);

			var leftOffset = 200;
			var bottomOffset = 0;
			var rightOffset = 200;

			var mediaScaledHeight = (wizardWidth * mediaRatio) ;
			var mediaScaledWidth = (wizardHeight / mediaRatio);

			if (isLandscape){
				// we want padding on either side, image is full height.
				leftOffset = (wizardWidth - mediaScaledWidth)/2;
				mediaScaledHeight = wizardHeight;
				// console.log("Is Landscape", wizardRatio, mediaRatio);
			}else if (isPortrait || isSquare){
				// we want it clamped to the bottom, full width, with padding on top.
				mediaScaledWidth = wizardWidth;
				leftOffset = 0;
				rightOffset = 0;
				bottomOffset = 0;
				// console.log("Is portrait", wizardRatio, mediaRatio);
			}else{
				// console.log("Is Wut?");
			}

			var calcX1 = leftOffset;
			var calcY1 = bottomOffset;
			var calcX2 = mediaScaledWidth;
			var calcY2 = mediaScaledHeight;

			if (mediaHeight && mediaWidth){
				resetViewportTo(calcX1, calcY1, calcX2, calcY2);
			}
	}

	function resetViewportToMatchVideoElementAspectRatio(videoElement){
		var videoWidth = videoElement.width;
		var videoHeight = videoElement.height;
		var ratio = videoWidth / videoHeight;
		resetViewportToAspectRatio(ratio);
	}

	function clear(){
		gl.clearColor(0.0,0.0,0.0,0.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	function initBuffer(data, elmPerVertex, attribute){

		if(typeof attribute === "undefined"){
			throw new Error("Attribute provided is undefined.");
		}else{
			var buffer = gl.createBuffer();
			if(!buffer){
				throw new Error("Failed to create buffer.");
			}
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
			gl.vertexAttribPointer(attribute, elmPerVertex, gl.FLOAT, false, 0,0);
			gl.enableVertexAttribArray(attribute);
		}
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

		// gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

		if (imageData){
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
			// gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_SHORT_4_4_4_4, imageData);

		}else{
			gl.deleteTexture(texture);
			console.log("Should have deleted:", texture);
			if (typeof callback === "function"){
				var err = new Error("Bad ImageData");
				callback(err);
			}
		}
		

		if (typeof callback === "function"){
			callback(null, texture);
		}else{
			return texture;
		}
	}

	function createBlankTexture(width, height, callback){
		var texture = gl.createTexture();
		if (!texture){
			if (typeof callback === "function"){
				callback(new Error("Unable to create a texture!"))
			}
			throw new Error("Unable to create texture!");
		}
		gl.bindTexture(gl.TEXTURE_2D, texture);

		var colorCount = width * height * 4

		var blackArray = new Uint8Array(colorCount);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0 ,gl.RGBA, gl.UNSIGNED_BYTE, blackArray);

		// console.log("created blank texture w:", width, 'h:', height, texture, colorCount);

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

	function updateTexture(texture, newData){
		if(texture && newData){
			// console.dir(newData);
			// gl.bindTexture(gl.TEXTURE_2D, texture);
			// console.log("I want to update text:", texture, "With new data:", newData);
			// gl.bindTexture(gl.TEXTURE_2D, texture);
			// gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, newData);
			// gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, newData);
		}
	}

	function updateTextureWithArrayBuffer(width, height, pixelData){
		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,width,height,gl.RGBA, gl.UNSIGNED_BYTE, newData);
	}

	function loadImage(url, callback){
		var image = new Image();
		image.src = url;
		image.onload = function(){
			callback(null, image, url);
		}
		image.onerror = function(event){
			callback(event);
		}
	}

	function loadImageAndIndex(url, index, callback){
		// special helper function for the loadImages() function.
		loadImage(url, function(error, image){
			callback(error, index, image);
		})
	}

	function loadImages(urlArray, callback){
		// The index of the url of the image that you specify
		// is where the final image data is placed in the done array. 

		// you will only ge the done array once all the images are either downloaded or errored out.

		var count = 0;
		var expected = urlArray.length;
		var done = createEmptyArray(urlArray.length, undefined);
		var errors = [];
		function imageLoadError(index, error, url){
			this.index = index;
			this.error = error;
			this.url = url;
		}
		for(var i = 0; i < urlArray.length; i++){
			var index = i;
			var url = urlArray[index];
			loadImageAndIndex(url, index, imageResponse);
		}

		function imageResponse(error, index, image){
			count++;
			if (error){
				var err = new imageLoadError(index, error, urlArray[index]);
				errors.push(err);
			}else{
				done[index] = image;
				// console.log("index:", index);

			}
			if (count === expected){
				if (errors.length > 0){
					complete(errors, done);
				}else{
					complete(null, done);
				}
				// complete(null, done);
			}
		}

		function checkImages(imageArray){

			var detailsObj = {
				loadedCount: 0,
				errorCount: 0,
				allImagesAreTheSameSize: true,
				allImagesLoaded: true,
				imageWidth:null,
				imageHeight:null,
				avgImageWidth:null,
				avgImageHeight:null,
				safeFirstImageIndex:-1,
			}

			var knownWidths = [];
			var knownHeights = [];
			var exampleImg = null;
			for(var i = 0; i < imageArray.length; i++){
				var img = imageArray[i];
				if (img){
					if(exampleImg === null){
						exampleImg = img;
						detailsObj.safeFirstImageIndex = i;
					}
					detailsObj.loadedCount++;
					knownHeights.push(img.height)
					knownWidths.push(img.width);
				}else{
					detailsObj.errorCount++;
					if(detailsObj.allImagesLoaded){
						detailsObj.allImagesLoaded = false;
					}
				}
			}
			function avg(array){
				if (array.length === 0){
					return null;
				}
				var output = 0;
				for(var i = 0; i < array.length; i++){
					var value = array[i];
					output += value;
				}
				return output/array.length;
			}
			function allAreTheSame(array){
				var output = true;
				if (array.length > 1){
					var lastitem = array[0];
					for(var i = 1; i < array.length; i++){
						var value = array[i];
						if (lastitem !== value){
							output = false;
							break;
						}
						lastitem = value;
					}
					return output;
				}else if (array.length === 1){
					return true;
				}else if (array.length === 0){
					return false;
				}
			}

			detailsObj.avgImageWidth = avg(knownWidths);
			detailsObj.avgImageHeight = avg(knownHeights);

			var sameHeight = allAreTheSame(knownHeights);
			var sameWidth = allAreTheSame(knownWidths);

			if (sameHeight && sameWidth){
				detailsObj.allImagesAreTheSameSize = true;
				if(exampleImg){
					detailsObj.imageWidth = exampleImg.width;
					detailsObj.imageHeight = exampleImg.height;
				}
			}else{
				detailsObj.allImagesAreTheSameSize = false;
			}
			
			return detailsObj;
		}

		function complete(error, images){
			if (error){
				callback(error, images, checkImages(images));
			}else{
				callback(null, images, checkImages(images));
			}
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

		// console.log("Attr:" + label, attribute);

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

	function createFrameBuffer(width, height, callback){
		if (width && height){
			var frameBuffer = gl.createFramebuffer();
			if (frameBuffer){
				gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
				// gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
				if(typeof callback === "function"){
					frameBuffer.width = width;
					frameBuffer.height = height;
					callback(null, frameBuffer);
				}
			}else if (!frameBuffer){
				if (typeof callback === "function"){
					callback(new Error("Unable to create a frameBuffer!"))
				}
				throw new Error("Unable to create frameBuffer!");
			}
		}else{
	
			if (typeof callback === "function"){
				callback(new Error("Unable to create a frameBuffer without width and height specified."))
			}
			throw new Error("Unable to create frameBuffer!");
			
		}
	}

	function createRenderBuffer(width, height, callback){
		if (width && height){
			var renderBuffer = gl.createRenderbuffer();
			if (renderBuffer){
				gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
				gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, width, height);
				if(typeof callback === "function"){
					callback(null, renderBuffer);
				}
			}else if (!renderBuffer){
				if (typeof callback === "function"){
					callback(new Error("Unable to create a renderBuffer!"))
				}
				throw new Error("Unable to create renderbuffer!");
			}
		}else{
	
			if (typeof callback === "function"){
				callback(new Error("Unable to create a renderBuffer without width and height specified."))
			}
			throw new Error("Unable to create renderbuffer!");
			
		}

	}

	function applyTextureToFrameBuffer(texture, frameBuffer){
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		// gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer);
	}
	function applyRenderBufferToFrameBuffer(renderbuffer, frameBuffer){
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	}

	function activateFrameBuffer(frameBuffer){
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
	}
	function deactivateFrameBuffer(){
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	function canReadActiveFrameBuffer(){
		return gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE;
	}

	var maxTexUnits;
	function getMaxTextureUnits(){
		if(!maxTexUnits){
			maxTexUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
		}

		return maxTexUnits;
	}

}// end glowworm
