import { formatMessageTime } from '@/utils/helper';
import { Message } from '@/utils/types';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import {
  Search,
  ArrowLeft,
  Send,
  Paperclip,
  Mic,
  MoveVertical as MoreVertical,
} from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { styles } from '@/styles/Messages.style';
import { useApp } from '../context/useContext';
import { sendPushNotification } from '@/hooks/NotificationProvider';

export default function MessagesScreen() {
  const [activeEstablisher, setActiveEstablisher] = useState<any | null>(null);
  const [messages, setMessages] = useState<any>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { establishers, fetchEstablishments } = useApp();

  const flatListRef = useRef<FlatList>(null);

  // Fetch the current influencer user from Supabase Auth.
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching current user:', error.message);
        return;
      }
      setCurrentUser(data.user);
    };
    fetchCurrentUser();
    if (!establishers.length) {
      fetchEstablishments();
    }
  }, []);

  const filteredEstablishers = establishers.filter((establisher: any) =>
    establisher.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!currentUser || !activeEstablisher) return;

    let subscription: any;

    const fetchAndSubscribe = async () => {
      // Initial fetch
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(influencer_id.eq.${currentUser.id},establisher_id.eq.${activeEstablisher.id}),and(influencer_id.eq.${activeEstablisher.id},establisher_id.eq.${currentUser.id})`
        )
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data || []);
      }

      // Realtime subscription
      subscription = supabase
        .channel('realtime-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const newMsg = payload.new;
            const isRelevant =
              (newMsg.influencer_id === currentUser.id &&
                newMsg.establisher_id === activeEstablisher.id) ||
              (newMsg.influencer_id === activeEstablisher.id &&
                newMsg.establisher_id === currentUser.id);

            if (isRelevant) {
              setMessages((prev: any) => [...prev, newMsg]);
            }
          }
        )
        .subscribe();
    };

    fetchAndSubscribe();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [currentUser, activeEstablisher]);

  // When the influencer taps an establisher, open the chat by setting activeEstablisher and fetching messages.
  const openChat = (establisher: any) => {
    setActiveEstablisher(establisher);
  };

  // Handle sending an attachment (the flow is similar to sending a text message).
  const handleAttachment = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            'Annuler',
            'Photo de la galerie',
            'Prendre une photo',
            'Document',
          ],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) return;
          if (buttonIndex === 1) {
            sendAttachment(
              'image',
              'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
              'Photo'
            );
          } else if (buttonIndex === 2) {
            sendAttachment(
              'image',
              'https://images.unsplash.com/photo-1559339352-11d035aa65de',
              'Photo'
            );
          } else if (buttonIndex === 3) {
            sendAttachment(
              'document',
              'https://example.com/document.pdf',
              'Menu.pdf'
            );
          }
        }
      );
    } else {
      Alert.alert(
        'Ajouter une pièce jointe',
        'Choisissez un type de pièce jointe',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Photo',
            onPress: () =>
              sendAttachment(
                'image',
                'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
                'Photo'
              ),
          },
          {
            text: 'Document',
            onPress: () =>
              sendAttachment(
                'document',
                'https://example.com/document.pdf',
                'Menu.pdf'
              ),
          },
        ]
      );
    }
  };

  // Send an attachment message by inserting it into the Supabase "messages" table.
  const sendAttachment = async (
    type: 'image' | 'document',
    url: string,
    name?: string
  ) => {
    if (!activeEstablisher || !currentUser) return;
    const newMsg: Message = {
      id: `${Date.now()}`, // Simple generated id
      text: type === 'image' ? 'Photo' : `Document: ${name}`,
      sender: 'influencer', // In the influencer app, the sender is "influencer"
      timestamp: Date.now(),
      read: false,
      attachment: { type, url, name },
    };
    const { error } = await supabase.from('messages').insert({
      influencer_id: currentUser.id,
      establisher_id: activeEstablisher.id,
      text: newMsg.text,
      sender: newMsg.sender,
      timestamp: newMsg.timestamp,
      attachment: newMsg.attachment, // Ensure your column supports JSON if needed
    });

    if (error) {
      console.error('Error sending attachment message:', error.message);
    } else {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeEstablisher || !currentUser) return;
    const newMsg = {
      text: newMessage.trim(),
      sender: 'influencer',
      timestamp: new Date().toISOString(), // or let the DB default handle it
      read: false,
    };

    const { error } = await supabase.from('messages').insert({
      influencer_id: currentUser.id,
      establisher_id: activeEstablisher.id,
      text: newMsg.text,
      sender: newMsg.sender,
      timestamp: newMsg.timestamp,
    });

    const { data: ownerData, error: ownerError } = await supabase
      .from('establishers')
      .select('token')
      .eq('uid', activeEstablisher.id)
      .single();

    if (ownerError) {
      console.error('Error fetching establishment owner:', ownerError.message);
      return;
    }

    // Check if the owner has a push token
    const ownerPushToken = ownerData?.token;
    if (ownerPushToken) {
      await sendPushNotification(
        ownerPushToken,
        'Nouveau message 📩',
        `${currentUser?.name} vous a envoyé un nouveau message.`,
        { chatId: activeEstablisher.id }
      );
    } else {
      console.warn('Establishment owner does not have a push token.');
    }

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Scroll to the bottom of the chat whenever messages update.
  useEffect(() => {
    if (activeEstablisher) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages]);

  // Render an establisher in the conversation list.
  const renderEstablisherItem = ({ item }: { item: any }) => {
    // Use the first photo if available, or a placeholder image.
    const imageUrl =
      item.photos && item.photos.length > 0
        ? item.photos[0]
        : 'https://via.placeholder.com/150';
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => openChat(item)}
      >
        <Image source={{ uri: imageUrl }} style={styles.conversationAvatar} />
        <View style={styles.conversationInfo}>
          <Text style={styles.conversationName}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render each chat message.
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'influencer';
    return (
      <View
        style={[
          styles.messageContainer,
          isUser
            ? styles.userMessageContainer
            : styles.businessMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userMessageBubble : styles.businessMessageBubble,
          ]}
        >
          {item.attachment && item.attachment.type === 'image' && (
            <Image
              source={{ uri: item.attachment.url }}
              style={styles.attachmentImage}
              resizeMode="cover"
            />
          )}
          {item.attachment && item.attachment.type === 'document' && (
            <View style={styles.documentContainer}>
              <Paperclip size={16} color={isUser ? '#fff' : '#222222'} />
              <Text
                style={[
                  styles.documentText,
                  isUser ? styles.userMessageText : styles.businessMessageText,
                ]}
              >
                {item.attachment.name}
              </Text>
            </View>
          )}
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.businessMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isUser
                ? styles.userMessageTimeText
                : styles.businessMessageTimeText,
            ]}
          >
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  // If no chat is open, display the list of establishers.
  if (!activeEstablisher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un utilisateur"
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
        {filteredEstablishers.length > 0 ? (
          <FlatList
            data={filteredEstablishers}
            renderItem={renderEstablisherItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.conversationsList}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Aucun résultat trouvé'
                : 'Aucun utilisateur trouvé'}
            </Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Chat screen: show the active chat partner's header and the list of messages.
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setActiveEstablisher(null);
            setMessages([]);
          }}
        >
          <ArrowLeft size={20} color="#222222" />
        </TouchableOpacity>
        <View style={styles.businessInfo}>
          {activeEstablisher.photos && activeEstablisher.photos.length > 0 && (
            <Image
              source={{ uri: activeEstablisher.photos[0] }}
              style={styles.businessAvatar}
            />
          )}
          <View>
            <Text style={styles.businessName}>{activeEstablisher.name}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <MoreVertical size={20} color="#222222" />
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item, idx) => idx.toString()}
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
