/**
 * Shared enums for communications messages.
 * Consolidates message types and statuses used across entities
 * to keep DTOs and services aligned.
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  AUDIO = 'audio',
  VIDEO = 'video',
  LOCATION = 'location',
  POLL = 'poll',
  SYSTEM = 'system',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  WELCOME_MESSAGE = 'welcome_message',
  MODERATION_ACTION = 'moderation_action',
  ANNOUNCEMENT = 'announcement',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  EDITED = 'edited',
  DELETED = 'deleted',
  MODERATED = 'moderated',
  BLOCKED = 'blocked',
  PENDING_APPROVAL = 'pending_approval',
  SCHEDULED = 'scheduled',
}
