-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "extension" VARCHAR(10) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "caller_id_name" VARCHAR(100),
    "caller_id_number" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_routes" (
    "id" TEXT NOT NULL,
    "did_number" VARCHAR(20) NOT NULL,
    "destination_extension" VARCHAR(10) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbound_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_records" (
    "id" TEXT NOT NULL,
    "uuid" VARCHAR(100) NOT NULL,
    "caller_id_name" VARCHAR(100),
    "caller_id_number" VARCHAR(50),
    "destination_number" VARCHAR(50),
    "direction" VARCHAR(20),
    "start_time" TIMESTAMP(3),
    "answer_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 0,
    "billsec" INTEGER NOT NULL DEFAULT 0,
    "hangup_cause" VARCHAR(50),
    "recording_path" VARCHAR(500),
    "agent_extension" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agent_id" TEXT,

    CONSTRAINT "call_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_status" (
    "id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'offline',
    "registered_at" TIMESTAMP(3),
    "last_seen" TIMESTAMP(3),
    "user_agent" VARCHAR(255),
    "registered_ip" VARCHAR(50),
    "agent_id" TEXT NOT NULL,

    CONSTRAINT "agent_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agents_extension_key" ON "agents"("extension");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_routes_did_number_key" ON "inbound_routes"("did_number");

-- CreateIndex
CREATE UNIQUE INDEX "call_records_uuid_key" ON "call_records"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "agent_status_agent_id_key" ON "agent_status"("agent_id");

-- AddForeignKey
ALTER TABLE "call_records" ADD CONSTRAINT "call_records_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_status" ADD CONSTRAINT "agent_status_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
