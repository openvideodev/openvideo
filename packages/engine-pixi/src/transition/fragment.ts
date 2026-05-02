export const fragment = (glsl: string) => `
	precision highp float;
	in vec2 vTextureCoord;
	in vec2 _uv; // Normalized [0,1] coordinates with center at (0.5, 0.5) for canvas-centered transitions
	uniform sampler2D from, to;
	uniform float progress, ratio, _fromR, _toR;
	uniform float customUniform;
	uniform vec2 center; // Center point of the canvas (0.5, 0.5) - NOT element centers

	vec4 getFromColor(vec2 uv){
		return texture2D(from, .5+(uv-.5)*vec2(max(ratio/_fromR,1.), max(_fromR/ratio,1.)));
	}
	vec4 getToColor(vec2 uv){
		return texture2D(to, .5+(uv-.5)*vec2(max(ratio/_toR,1.), max(_toR/ratio,1.)));
	}

	// Helper function to get distance from canvas center
	float distanceFromCenter(vec2 uv) {
		return distance(uv, center);
	}
	
	// Helper function to get angle from canvas center
	float angleFromCenter(vec2 uv) {
		vec2 centered = uv - center;
		return atan(centered.y, centered.x);
	}
	
	// Helper function to get centered coordinates relative to canvas center
	vec2 getCenteredCoord(vec2 uv) {
		return uv - center; // Coordinates relative to canvas center
	}

	// gl-transition code here
	${glsl}
	// gl-transition code end

	void main(){
		// Use _uv which is properly normalized to [0,1] range with center at (0.5, 0.5)
		// This ensures transitions are centered on the canvas, not element centers
		vec2 uv = _uv;
		gl_FragColor = transition(uv);
	}
`;
