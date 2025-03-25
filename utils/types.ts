// Types pour les messages
interface Message {
  id?: string;
  text: string;
  read: boolean;
  sender: string;
  timestamp: any;
  attachment?: {
    type: 'image' | 'document';
    url: string;
    name?: string;
  };
}

// Type pour les conversations
interface Conversation {
  id: string;
  businessId: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  messages: Message[];
}

export { Conversation, Message };
