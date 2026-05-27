# @openvideo/sdk

Developer-friendly API client for OpenVideo Director.

## Installation

```bash
npm install @openvideo/sdk
# or
yarn add @openvideo/sdk
# or
pnpm add @openvideo/sdk
```

## Quick Start

```typescript
import { OpenVideo } from "@openvideo/sdk";

// Initialize with API key (recommended for server/CLI)
const ov = new OpenVideo({
  apiKey: "ov_live_xxx", // Get from https://openvideo.dev/dashboard
});

// Or with JWT (for web apps)
const ov = new OpenVideo({
  accessToken: "eyJhbG...", // From /auth/sign-in
});

// Create a space
const space = await ov.spaces.create({
  name: "My Project",
});

// Register an asset
const asset = await ov.assets.register({
  spaceId: space.id,
  id: "my-video",
  name: "intro.mp4",
  type: "video",
  src: "https://my-cdn.com/videos/intro.mp4",
});

// Chat with AI Director
const response = await ov.chat.send({
  spaceId: space.id,
  message: "Generate a trailer from this footage",
});
```

## API Reference

### Spaces

```typescript
// List all spaces
const spaces = await ov.spaces.list();

// Create a space
const space = await ov.spaces.create({
  name: "My Project",
  data: {
    canvasSize: { width: 1920, height: 1080 },
    fps: 30,
  },
});

// Get a space
const space = await ov.spaces.get("space-id");

// Update a space
await ov.spaces.update("space-id", { name: "Updated Name" });

// Delete a space
await ov.spaces.delete("space-id");

// Sync space (triggers backend sync)
await ov.spaces.sync("space-id");
```

### Assets

```typescript
// List assets in a space
const assets = await ov.assets.list("space-id");

// Get upload URL (for direct S3 upload)
const { url, key } = await ov.assets.getUploadUrl({
  spaceId: "space-id",
  filename: "video.mp4",
  contentType: "video/mp4",
});

// Upload file
await ov.assets.upload(url, file, "video/mp4");

// Register asset (after upload)
const asset = await ov.assets.register({
  spaceId: "space-id",
  id: key,
  name: "video.mp4",
  type: "video",
  src: url.split("?")[0],
});

// One-step upload + register
const asset = await ov.assets.create("space-id", file, {
  name: "video.mp4",
  type: "video",
  contentType: "video/mp4",
});
```

### Chat (AI Director)

```typescript
// Send message
const response = await ov.chat.send({
  spaceId: "space-id",
  message: "Create a 10-second intro clip",
});

// Stream response
const stream = await ov.chat.stream({
  spaceId: "space-id",
  message: "Edit this video",
});

for await (const chunk of stream) {
  if (chunk.type === "chunk") {
    process.stdout.write(chunk.content);
  }
}

// Create session
const { sessionId } = await ov.chat.createSession("space-id");
```

### Indexing (RAG)

```typescript
// Start indexing
const job = await ov.indexes.create("asset-id", "space-id");

// Check status
const status = await ov.indexes.getStatus("asset-id");

// Reindex
await ov.indexes.reindex("asset-id", "space-id");
```

### API Tokens

```typescript
// List tokens
const tokens = await ov.tokens.list();

// Create token (⚠️ token shown only once!)
const { token, id } = await ov.tokens.create({
  name: "Production Server",
  scopes: ["all"],
  expiresInDays: 30,
});

// Update token name
await ov.tokens.update(id, "Updated Name");

// Revoke token
await ov.tokens.delete(id);

// Exchange API key for JWT
const { token: jwt } = await ov.tokens.exchange("ov_live_xxx");
```

## Error Handling

```typescript
import { OpenVideo, AuthenticationError, NotFoundError, RateLimitError } from "@openvideo/sdk";

const ov = new OpenVideo({ apiKey: "ov_live_xxx" });

try {
  await ov.spaces.get("invalid-id");
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log("Space not found");
  } else if (error instanceof AuthenticationError) {
    console.log("Invalid API key");
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  }
}
```

## Configuration

```typescript
const ov = new OpenVideo({
  apiKey: "ov_live_xxx",
  baseURL: "https://api.openvideo.dev", // Optional
  timeout: 30000, // 30 seconds (default)
  retries: 3, // 3 retries (default)
});
```

## License

MIT
