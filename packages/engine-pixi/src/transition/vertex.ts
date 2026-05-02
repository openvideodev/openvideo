export const vertex = `
	in vec2 aPosition;
	out vec2 _uv;               
	uniform mat3 projectionMatrix;
	uniform vec4 uInputSize;
	uniform vec4 uOutputFrame;
	out vec2 vTextureCoord;
	uniform vec4 uOutputTexture;

	vec4 filterVertexPosition( void )
	{
			vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

			position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
			position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

			return vec4(position, 0.0, 1.0);
	}

	vec2 filterTextureCoord( void )
	{
	return aPosition * (uOutputFrame.zw * uInputSize.zw);
	}

	void main(void)
	{
	gl_Position = filterVertexPosition();
	vTextureCoord = filterTextureCoord();
	vec2 absolute = aPosition * uOutputFrame.zw + uOutputFrame.xy;
	_uv = absolute / uOutputTexture.xy;
	}
`;
