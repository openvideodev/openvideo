export const CUSTOM_EFFECTS = [
  {
    key: "zoomRotate",
    label: "Zoom Rotate",
    fragment: `
      in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;

void main(void)
{
    vec2 center = vec2(0.5, 0.5);
    vec2 uvs = vTextureCoord - center;

    float angle = uTime * 4.0 * 6.2831853;
    float scale = 1.0 + 0.2 * sin(uTime * 3.0);

    float c = cos(angle);
    float s = sin(angle);
    mat2 rot = mat2(c, -s, s, c);

    uvs = rot * uvs;
    uvs /= scale;
    uvs += center;

    gl_FragColor = texture2D(uTexture, uvs);
}
    `,
  },
];
