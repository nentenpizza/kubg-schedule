-- CreateTable
CREATE TABLE "Cache" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "group_name" TEXT,
    "text" TEXT NOT NULL,

    CONSTRAINT "Cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cache_id_key" ON "Cache"("id");
