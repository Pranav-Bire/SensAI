-- CreateTable
CREATE TABLE "JobPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'LinkedIn',
    "skills_required" TEXT[],
    "match_percentage" DOUBLE PRECISION,
    "missing_skills" TEXT[],
    "application_deadline" TIMESTAMP(3),
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobPost_userId_idx" ON "JobPost"("userId");

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
