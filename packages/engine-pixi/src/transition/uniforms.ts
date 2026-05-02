import { GLTransition } from './types';

export const uniforms = {
  custom: (transition: GLTransition) => {
    // Handle transitions without defaultParams (like local custom transitions)
    const defaultParams = transition.defaultParams || {};
    const paramsTypes = transition.paramsTypes || {};

    return Object.fromEntries(
      Object.entries(defaultParams).map(([name, value]) => [
        name,
        {
          value,
          type: getUniformType(paramsTypes[name]),
        },
      ])
    );
  },
  basics: {
    _fromR: { value: 1, type: 'f32' },
    _toR: { value: 1, type: 'f32' },
    ratio: { value: 1, type: 'f32' },
    progress: { value: 0, type: 'f32' },
    customUniform: { value: 0, type: 'f32' },
    center: { value: [0.5, 0.5], type: 'vec2<f32>' }, // Center point of the canvas (not element centers)
  },
};

const getUniformType = (type: string) => {
  if (type === 'f32' || type === 'i32') {
    return type;
  } else if (type === 'float') {
    return 'f32';
  } else return `${type}<f32>`;
};
