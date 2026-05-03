import { loadClip } from '@openvideo/core';
import { CoreConfig } from '@openvideo/core';
import { NodeMetadataProvider } from './src/core/node-metadata-provider';

async function test() {
  const provider = new NodeMetadataProvider();
  CoreConfig.setMetadataProvider(provider);

  console.log('Testing image metadata extraction...');
  const clip = await loadClip(
    { type: 'Image', src: 'https://cdn.scenify.io/generated/test-project-id/generate_cat_image.png' },
    { canvasSize: { width: 1920, height: 1080 } }
  );

  console.log('Resulting clip:', clip);
}

test().catch(console.error);
