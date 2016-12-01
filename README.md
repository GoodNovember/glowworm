# Glowworm
Cute little WebGL Library written in Javascript. 


## Inspiration
This little lady was built based on a few tutorials that I had seen around as well as a lovely talk given by Nick Desaulniers.

- https://www.youtube.com/embed/H4c8t6myAWU/?feature=player_detailpage
- http://webglfundamentals.org/
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial


## Usage:

```javascript

var glow = new Glowworm(canvasElement);

var gl = glow.gl;

var fImageShader = "./shaders/phantom_video_fragment.glsl";
var vImageShader = "./shaders/phantom_video_vertex.glsl";

glow.shaders.createProgram_FromFiles(vImageShader, fImageShader, function(err, program){

			// initialization

			if(err){
				console.log("Err:", err);
			}else{

				// tell Webgl to use the shader "program" we just had it generate.
				gl.useProgram(program);

				// using the program, let's extract the shader Uniforms and Attributes
				uniforms = glow.getUniforms(program);
				attributes = glow.getAttributes(program);

				// simple log.
				console.log("Got a program ready!");
				
				// create a rectangle onto which we can apply a texture
				glow.rectangles.create(-1,-1,2,2, attributes.aPosition);
				// specify how we want to drape the texture onto the above rectangle.

				/*
				
				0x0y                   1x0y
				+----------+----------+
				|          |          |
				|          |          |
				|  0.5x0.5y|          |
				+----------O----------+
				|          |          |
				|          |          |
				|          |          |
				+----------+----------+
				0x1t						1x1y			
				
				*/
				//                      X    Y    width    height
				glow.rectangles.create(0.0, 0.0, 0.5, 0.5, attributes.aTexCoordForwardColor); // good
				glow.rectangles.create(0.5, 0.0, 0.5, 0.5, attributes.aTexCoordForwardMask);  // good
				glow.rectangles.create(0.0, 0.5, 0.5, 0.5, attributes.aTexCoordBackwardColor); // good
				glow.rectangles.create(0.5, 0.5, 0.5, 0.5, attributes.aTexCoordBackwardMask); // good
				// set the shader uniform values of Color and Mask to use TEXTURE0 TEXTURE1 respectively.
				gl.uniform1i(uniforms.uColorImage, 0);
				gl.uniform1i(uniforms.uIsForward, isGoingForward);
				// gl.uniform1i(uniforms.uMaskImage, 1);
				console.log("once");
				// Start the render sequence.
				render();
			}

		});// end setup webgl;

		// take a video element and inject its data into a specific texture.
		function pullTextureFromVideoElm(elm, textureTarget){
			var _videoElm = elm;
			if( _videoElm ){
				if (!texCache[textureTarget]){
					console.log("once");
					// texCache[textureTarget] = glow.textures.create( _videoElm );
					glow.textures.create(_videoElm, function(err, texture){
						texCache[textureTarget] = texture;
						gl.activeTexture( gl["TEXTURE" + textureTarget] );
						gl.bindTexture( gl.TEXTURE_2D, texCache[textureTarget] );
					})

				}else{
					gl.activeTexture( gl["TEXTURE" + textureTarget]);
					glow.textures.updateWithVideo( texCache[textureTarget] , _videoElm );
				}
			}else{
				console.error("No Video Element Found");
			}
		}

		// call the above function using the color and mask elements.
		function pullFramesFromVideos(colorElm, maskElm){
			pullTextureFromVideoElm(colorElm, 0);
			pullTextureFromVideoElm(maskElm, 1);
		}

		var isRendering = false;

		function render(){
			// console.log("Blip!");
			if (isRendering === false){
				isRendering = true;
			}
			// re-up this function at the earliest opprotunity.
			requestAnimationFrame(render);

			// clear the canvas and resize it to match the desired video resolution aspec ratio.
			glow.clear();
			glow.resize();
			glow.resetViewportToAspectRatio((1279.0/854.0));

			// draw what we wrote on the last round.
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			
			// when we are confident we have what we need, pull down a frame from the videos.
			//if(bothVideosCanPlay() && videosAreLoaded()){
				pullTextureFromVideoElm(videoElm, 0);
				// pullFramesFromVideos(colorVideoElm, maskVideoElm);
			//}
		}

```
