-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "director_session" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "historyJson" JSONB NOT NULL DEFAULT '[]',
    "pendingPlan" JSONB,
    "activePlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "director_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clip_transcript" (
    "id" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "segments" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clip_transcript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "director_session_projectId_userId_idx" ON "director_session"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "clip_transcript_clipId_key" ON "clip_transcript"("clipId");

-- CreateIndex
CREATE INDEX "clip_transcript_projectId_idx" ON "clip_transcript"("projectId");
