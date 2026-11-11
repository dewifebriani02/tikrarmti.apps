-- Migration: 20261111_create_whatsapp_inbox.sql
-- Description: Create WhatsApp Inbox & Chat tables for receiving incoming chats via WatZap Webhook and sending admin replies.

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(30) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    batch_name VARCHAR(100),
    student_id_number VARCHAR(50),
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_direction VARCHAR(10) DEFAULT 'inbound', -- 'inbound' | 'outbound'
    unread_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'resolved', 'archived'
    profile_pic_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'inbound' | 'outbound'
    message_body TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'delivered', -- 'received', 'sent', 'delivered', 'failed'
    sender_name VARCHAR(100),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    watzap_message_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_msg ON whatsapp_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_unread ON whatsapp_conversations(unread_count);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user ON whatsapp_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON whatsapp_conversations(status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conv ON whatsapp_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
