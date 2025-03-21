import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, ActionSheetIOS, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import { Search, ArrowLeft, Send, Paperclip, Mic, MoveVertical as MoreVertical } from 'lucide-react-native';
import { allPlaces } from '../../data/places';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context/useContext';
import { supabase } from '@/utils/supabase';

// Types pour les messages
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'business';
  timestamp: number;
  read: boolean;
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

// Données fictives pour les conversations
const mockConversations: Conversation[] = [
  {
    id: '1',
    businessId: '1',
    lastMessage: "Bonjour, nous avons bien reçu votre réservation pour le 15 juin à 19h30.",
    lastMessageTime: Date.now() - 3600000, // 1 heure avant
    unreadCount: 2,
    messages: [
      {
        id: '1-1',
        text: "Bonjour, nous avons bien reçu votre réservation pour le 15 juin à 19h30.",
        sender: 'business',
        timestamp: Date.now() - 3600000,
        read: false
      },
      {
        id: '1-2',
        text: "Nous sommes ravis de vous accueillir prochainement. Avez-vous des demandes particulières pour votre venue ?",
        sender: 'business',
        timestamp: Date.now() - 3590000,
        read: false
      }
    ]
  },
  {
    id: '2',
    businessId: '8',
    lastMessage: "Votre séance de massage est confirmée pour demain à 14h.",
    lastMessageTime: Date.now() - 86400000, // 1 jour avant
    unreadCount: 0,
    messages: [
      {
        id: '2-1',
        text: "Bonjour, je souhaiterais savoir si je dois apporter quelque chose de particulier pour ma séance de massage.",
        sender: 'user',
        timestamp: Date.now() - 172800000, // 2 jours avant
        read: true
      },
      {
        id: '2-2',
        text: "Bonjour, non vous n'avez besoin de rien apporter. Nous fournissons tout le nécessaire. À bientôt !",
        sender: 'business',
        timestamp: Date.now() - 86400000,
        read: true
      }
    ]
  }
];

// Fonction pour formater la date
const formatMessageTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Aujourd'hui : afficher l'heure
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    // Hier
    return 'Hier';
  } else if (diffDays < 7) {
    // Cette semaine : afficher le jour
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[date.getDay()];
  } else {
    // Plus d'une semaine : afficher la date
    return date.toLocaleDateString();
  }
};

export default function MessagesScreen() {
  const { establishers, conversations, fetchConversations, setConversations } = useApp();
  // const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { businessId } = params;

  useEffect(() => {
    fetchConversations();
  }, []);

  // Filtrer les conversations en fonction de la recherche
  const filteredConversations = conversations.filter(conversation => {
    const place = establishers.find(p => p.id == conversation.businessId);
    if (!place) return false;
    
    return place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Fonction pour obtenir les détails d'un établissement
  const getBusinessDetails = (businessId: string) => {
    return establishers.find(place => place.id == businessId);
  };

  // Fonction pour trouver une conversation existante ou en créer une nouvelle
  const findOrCreateConversation = async (businessId: string) => {
    // Fetch conversation from Supabase
    let { data: conversation, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("businessId", businessId)
      .single();

      console.log(conversation, 'conversation in findor create function')
  
    if (error || !conversation) {
      // Fetch business details (assuming you have a function for this)
      const business = await getBusinessDetails(businessId);
      if (!business) return null;
  
      // Create a new conversation in Supabase
      const { data: newConversation, error: insertError } = await supabase
        .from("conversations")
        .insert([
          {
            businessId: businessId,
            lastMessage: "Aucun message",
            lastMessageTime: new Date().toISOString(),
            unreadCount: 0,
            messages: [], // Ensure messages is an array
          },
        ])
        .select()
        .single();
  
      if (insertError) {
        console.error("Error creating conversation:", insertError);
        return null;
      }
  
      return newConversation;
    }
  
    return conversation;
  };  
  

  // Ouvrir automatiquement la conversation si un businessId est fourni
  useEffect(() => {
    if (businessId) {
      const conversation = findOrCreateConversation(businessId);
      console.log(conversation, 'conversation in useeffect')
      if (conversation) {
        setActiveConversation(conversation);
      }
    }
  }, [businessId]);

  // Fonction pour gérer l'ajout de pièces jointes
  const handleAttachment = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Photo de la galerie', 'Prendre une photo', 'Document'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            // Annuler
            return;
          } else if (buttonIndex === 1) {
            // Photo de la galerie
            sendAttachment('image', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4', 'Photo');
          } else if (buttonIndex === 2) {
            // Prendre une photo
            sendAttachment('image', 'https://images.unsplash.com/photo-1559339352-11d035aa65de', 'Photo');
          } else if (buttonIndex === 3) {
            // Document
            sendAttachment('document', 'https://example.com/document.pdf', 'Menu.pdf');
          }
        }
      );
    } else {
      // Pour Android et Web
      Alert.alert(
        'Ajouter une pièce jointe',
        'Choisissez un type de pièce jointe',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Photo', onPress: () => sendAttachment('image', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4', 'Photo') },
          { text: 'Document', onPress: () => sendAttachment('document', 'https://example.com/document.pdf', 'Menu.pdf') },
        ]
      );
    }
  };

  // Fonction pour envoyer une pièce jointe
  const sendAttachment = async (type: 'image' | 'document', url: string, name?: string) => {
    if (!activeConversation) return;
  
    const newMsg = {
      conversation_id: activeConversation.id,
      text: type === 'image' ? 'Photo' : `Document: ${name}`,
      sender: 'user',
      timestamp: new Date().toISOString(),
      read: false,
      attachment: { type, url, name },
    };
  
    const { data, error } = await supabase.from('messages').insert([newMsg]);
  
    if (error) {
      console.error('Error sending attachment:', error);
      return;
    }
  
    setActiveConversation(prev => ({
      ...prev,
      lastMessage: `[${type === 'image' ? 'Photo' : 'Document'}]`,
      lastMessageTime: new Date().toISOString(),
      messages: [...prev.messages, newMsg],
    }));
  };
  

  // Fonction pour envoyer un message
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;
  
    const newMsg = {
      conversation_id: activeConversation.id,
      text: newMessage.trim(),
      sender: "user",
      timestamp: new Date().toISOString(),
      read: false,
    };
  
    // Insert message into Supabase
    const { data: insertedMsg, error } = await supabase
      .from("messages")
      .insert([newMsg])
      .select()
      .single();
  
    if (error) {
      console.error("Error sending message:", error);
      return;
    }
  
    // Update conversation lastMessage
    await supabase
      .from("conversations")
      .update({
        lastMessage: insertedMsg.text,
        lastMessageTime: insertedMsg.timestamp,
      })
      .eq("id", activeConversation.id);
  
    // Fetch updated messages from Supabase
    const { data: updatedMessages, error: fetchError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", activeConversation.id)
      .order("timestamp", { ascending: true });

    if (fetchError) {
      console.error("Error fetching messages:", fetchError);
      return;
    }
  
    // Update conversation locally
    setActiveConversation((prev) => ({
      ...prev,
      lastMessage: insertedMsg.text,
      lastMessageTime: insertedMsg.timestamp,
      messages: updatedMessages, // Ensure messages are updated
    }));
  
    setNewMessage("");
  };  
  

  // Faire défiler jusqu'au dernier message lorsqu'une conversation est ouverte
  useEffect(() => {
    if (activeConversation) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [activeConversation]);

  // Marquer les messages comme lus lorsqu'une conversation est ouverte
  useEffect(() => {
    if (activeConversation) {
      const updatedConversation = {
        ...activeConversation,
        unreadCount: 0,
        messages: activeConversation?.messages?.map(msg => ({
          ...msg,
          read: true
        }))
      };
      
      setConversations(prevConversations => 
        prevConversations?.map(conv => 
          conv.id === activeConversation.id ? updatedConversation : conv
        )
      );
      
      setActiveConversation(updatedConversation);
    }
  }, [activeConversation?.id]);

  // Rendu d'un élément de conversation dans la liste
  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const business = getBusinessDetails(item.businessId);
    if (!business) return null;
    
    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onPress={() => setActiveConversation(item)}
      >
        <Image 
          source={{ uri: business.image }} 
          style={styles.conversationAvatar}
        />
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
          </View>
        )}
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName}>{business.name}</Text>
            <Text style={styles.conversationTime}>{formatMessageTime(item.lastMessageTime)}</Text>
          </View>
          <Text 
            style={[
              styles.conversationLastMessage,
              item.unreadCount > 0 && styles.unreadMessage
            ]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Rendu d'un message dans la conversation active
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.businessMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userMessageBubble : styles.businessMessageBubble
        ]}>
          {item.attachment && item.attachment.type === 'image' && (
            <Image 
              source={{ uri: item.attachment.url }} 
              style={styles.attachmentImage} 
              resizeMode="cover"
            />
          )}
          
          {item.attachment && item.attachment.type === 'document' && (
            <View style={styles.documentContainer}>
              <Paperclip size={16} color={isUser ? "#fff" : "#222222"} />
              <Text style={[
                styles.documentText,
                isUser ? styles.userMessageText : styles.businessMessageText
              ]}>
                {item.attachment.name}
              </Text>
            </View>
          )}
          
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.businessMessageText
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isUser ? styles.userMessageTimeText : styles.businessMessageTimeText
          ]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
        {isUser && (
          <View style={styles.messageStatus}>
            {item.read ? (
              <View style={styles.readIndicator} />
            ) : (
              <View style={styles.unreadIndicator} />
            )}
          </View>
        )}
      </View>
    );
  };

  // Si aucune conversation n'est active, afficher la liste des conversations
  if (!activeConversation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une conversation"
            placeholderTextColor="#8e8e93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.searchIconContainer}>
            <View style={styles.searchIconButton}>
              <Search size={16} color="#fff" />
            </View>
          </View>
        </View>
        
        {filteredConversations.length > 0 ? (
          <FlatList
            data={filteredConversations}
            renderItem={renderConversationItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.conversationsList}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? "Aucun résultat trouvé" : "Aucune conversation"}
            </Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Afficher la conversation active
  const activeBusiness = getBusinessDetails(activeConversation.businessId);
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.chatHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setActiveConversation(null)}
        >
          <ArrowLeft size={20} color="#222222" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.businessInfo}
          onPress={() => {
            setActiveConversation(null);
            router.push(`/(tabs)/${activeBusiness?.id}`);
          }}
        >
          {activeBusiness?.image && (
            <Image 
              source={{ uri: activeBusiness.image }} 
              style={styles.businessAvatar}
            />
          )}
          <View>
            <Text style={styles.businessName}>{activeBusiness?.name}</Text>
            <Text style={styles.businessType}>{activeBusiness?.type}</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.moreButton}>
          <MoreVertical size={20} color="#222222" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={activeConversation.messages}
        renderItem={renderMessageItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.inputContainer}
      >
        <TouchableOpacity 
          style={styles.attachButton}
          onPress={handleAttachment}
        >
          <Paperclip size={20} color="#8e8e93" />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          placeholder="Message"
          placeholderTextColor="#8e8e93"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxHeight={100}
        />
        
        {newMessage.trim() ? (
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.micButton}>
            <Mic size={20} color="#8e8e93" />
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: '#222222',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    margin: 16,
    paddingLeft: 16,
    paddingRight: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#222222',
    paddingVertical: 10,
    height: 40,
  },
  searchIconContainer: {
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  searchIconButton: {
    backgroundColor: '#f46d63',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationsList: {
    paddingBottom: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  unreadBadge: {
    position: 'absolute',
    top: 16,
    left: 50,
    backgroundColor: '#f46d63',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 6,
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  conversationTime: {
    fontSize: 12,
    color: '#8e8e93',
  },
  conversationLastMessage: {
    fontSize: 14,
    color: '#8e8e93',
  },
  unreadMessage: {
    color: '#222222',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  businessInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  businessAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  businessName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  businessType: {
    fontSize: 12,
    color: '#8e8e93',
  },
  moreButton: {
    padding: 4,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '75%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  businessMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    paddingBottom: 8,
    flexShrink: 1,
  },
  userMessageBubble: {
    backgroundColor: '#f46d63',
  },
  businessMessageBubble: {
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 14,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  userMessageText: {
    color: '#fff',
  },
  businessMessageText: {
    color: '#222222',
  },
  messageTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  userMessageTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  businessMessageTimeText: {
    color: '#8e8e93',
  },
  messageStatus: {
    marginLeft: 4,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  readIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  unreadIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8e8e93',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    color: '#222222',
  },
  sendButton: {
    backgroundColor: '#f46d63',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  micButton: {
    padding: 8,
    marginLeft: 8,
  },
  attachmentImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentText: {
    marginLeft: 6,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});