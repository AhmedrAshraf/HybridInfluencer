import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, TextInput, Modal, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Instagram, Eye, Users, Briefcase, Camera, X, Check, Link, Plus, Trash2 } from 'lucide-react-native';
import { useState, useRef, useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';
import { useApp } from '../context/useContext';

// Type pour les contenus créés
interface Content {
  id: string;
  type: 'post' | 'story' | 'reel' | 'carousel' | 'tiktok';
  image: string;
}

// Type pour le profil
interface Profile {
  name: string;
  username: string;
  bio: string;
  avatar: string;
  instagramUrl: string;
  tiktokUrl: string;
  collaborations: number;
  views: number;
  followers: number;
  contents: Content[];
}

// Fonction pour formater les nombres
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num;
  }
};

// Composant pour le logo TikTok
const TikTokLogo = ({ size = 18, color = '#fff' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"
        fill={color}
      />
    </Svg>
  );
};

export default function ProfileScreen() {
  const { user } = useApp();
  const [profile, setProfile] = useState<Profile>(user);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  // États pour l'édition directe
  const [nameInput, setNameInput] = useState(profile?.name || '');
  const [usernameInput, setUsernameInput] = useState(profile?.username || '');
  const [bioInput, setBioInput] = useState(profile?.bio || '');
  const [instagramInput, setInstagramInput] = useState(profile?.instagramUrl || '');
  const [tiktokInput, setTiktokInput] = useState(profile?.tiktokUrl || '');
  const [collaborationsInput, setCollaborationsInput] = useState(0);
  const [viewsInput, setViewsInput] = useState(0);
  const [followersInput, setFollowersInput] = useState(0);
  
  // État pour l'ajout de contenu
  const [addContentModalVisible, setAddContentModalVisible] = useState(false);
  const [newContent, setNewContent] = useState<Partial<Content>>({
    type: 'post',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
  });
  
  // Référence pour le scroll
  const scrollViewRef = useRef<ScrollView>(null);

  // Fonction pour activer le mode édition
  const enableEditing = () => {
    setIsEditing(true);
    setNameInput(profile?.name);
    setUsernameInput(profile?.username);
    setBioInput(profile?.bio);
    setInstagramInput(profile?.instagramUrl);
    setTiktokInput(profile?.tiktokUrl);
    // setCollaborationsInput(profile?.collaborations.toString());
    // setViewsInput(profile?.views?.toString());
    // setFollowersInput(profile?.followers?.toString());
  };

  // Fonction pour sauvegarder les modifications
  const saveProfile = async () => {
    if (!profile) return;
  
    const updatedProfile = {
      ...profile,
      name: nameInput,
      username: usernameInput,
      bio: bioInput,
      instagramUrl: instagramInput,
      tiktokUrl: tiktokInput,
      // collaborations: parseInt(collaborationsInput) || 0,
      // views: parseInt(viewsInput) || 0,
      // followers: parseInt(followersInput) || 0
    };
  
    try {
      const { error } = await supabase
        .from("influencers")
        .update(updatedProfile)
        .eq("uuid", profile.uuid); // Make sure to use the correct user ID field
  
      if (error) throw error;
  
      setProfile(updatedProfile); // Update local state after successful update
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating profile:", error.message);
    }
  };  

  // Fonction pour annuler les modifications
  const cancelEditing = () => {
    setIsEditing(false);
  };

  // Fonction pour sélectionner une image depuis la galerie
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
  
        const formData = new FormData();
        formData.append("file", {
          uri: imageUri,
          type: "image/jpeg", // Adjust based on file type
          name: "upload.jpg",
        });
        formData.append("upload_preset", 'ml_default');
  
        const response = await fetch('https://api.cloudinary.com/v1_1/dqzknasup/image/upload', {
          method: "POST",
          body: formData,
        });
  
        const data = await response.json();
  
        if (data.secure_url) {
          setProfile(prev => ({
            ...prev,
            avatar: data.secure_url, // Save Cloudinary URL
          }));
        } else {
          throw new Error("Upload failed");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Image upload failed");
      console.error(error);
    }
  };

  // Fonction pour ajouter un nouveau contenu directement depuis la galerie
  const addNewContent = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Permet de sélectionner des images et des vidéos
        allowsEditing: true,
        aspect: [9, 16],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Créer un nouveau contenu avec l'image/vidéo sélectionnée
        const content: Content = {
          id: Date.now().toString(),
          type: result.assets[0].type === 'video' ? 'reel' : 'post',
          image: result.assets[0].uri
        };

        // Ajouter le contenu au profil
        setProfile(prev => ({
          ...prev,
          contents: [content, ...prev.contents]
        }));
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner un média');
    }
  };

  // Fonction pour supprimer un contenu immédiatement
  const deleteContent = (id: string) => {
    setProfile(prev => ({
      ...prev,
      contents: prev.contents.filter(content => content.id !== id)
    }));
  };

  // Fonction pour obtenir l'icône du type de contenu
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'post':
        return '📷';
      case 'story':
        return '⭕';
      case 'reel':
        return '📱';
      case 'carousel':
        return '🔄';
      case 'tiktok':
        return '🎵';
      default:
        return '📷';
    }
  };

  // Fonction pour formater les entrées numériques
  const formatNumberInput = (text: string, setter: (value: string) => void) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setter(numericValue);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        ref={scrollViewRef}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Profil</Text>
            {!isEditing ? (
              <>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={enableEditing}
              >
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity 
              style={styles.editButton}
              onPress={() => {
                supabase.auth.signOut()
                router.push('/auth/login')
              }}
            >
              <Text style={styles.editButtonText}>Logout</Text>
            </TouchableOpacity></>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={cancelEditing}
                >
                  <X size={18} color="#f46d63" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={saveProfile}
                >
                  <Check size={18} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {profile?.avatar && (
                <Image 
                  source={{ uri: profile?.avatar }} 
                  style={styles.avatar} 
                />
              )}
              {isEditing && (
                <TouchableOpacity 
                  style={styles.changeAvatarButton}
                  onPress={pickImage}
                >
                  <Camera size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.profileInfo}>
              {isEditing ? (
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Votre nom"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.profileName}>{profile?.name}</Text>
              )}
              
              {isEditing ? (
                <TextInput
                  style={styles.usernameInput}
                  value={usernameInput}
                  onChangeText={setUsernameInput}
                  placeholder="username"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.profileUsername}>{profile?.username}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.socialLinksContainer}>
            {isEditing ? (
              <View style={styles.socialInputsContainer}>
                <View style={styles.socialInputWrapper}>
                  <Instagram size={18} color="#E1306C" style={styles.socialInputIcon} />
                  <TextInput
                    style={styles.socialInput}
                    value={instagramInput}
                    onChangeText={setInstagramInput}
                    placeholder="instagram.com/username"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.socialInputWrapper}>
                  <TikTokLogo size={18} color="#000" style={styles.socialInputIcon} />
                  <TextInput
                    style={styles.socialInput}
                    value={tiktokInput}
                    onChangeText={setTiktokInput}
                    placeholder="tiktok.com/username"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.instagramButton}
                  onPress={() => Alert.alert('Instagram', 'Redirection vers Instagram')}
                >
                  <Instagram size={18} color="#fff" style={styles.socialIcon} />
                  <Text style={styles.instagramText}>Instagram</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.tiktokButton}
                  onPress={() => Alert.alert('TikTok', 'Redirection vers TikTok')}
                >
                  <TikTokLogo size={18} color="#fff" style={styles.socialIcon} />
                  <Text style={styles.tiktokText}>TikTok</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Briefcase size={18} color="#8e8e93" />
              {isEditing ? (
                <TextInput
                  style={styles.statInput}
                  value={collaborationsInput}
                  onChangeText={(text) => formatNumberInput(text, setCollaborationsInput)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.statValue}>{formatNumber(profile?.collaborations)}</Text>
              )}
              <Text style={styles.statLabel}>Collaborations</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Eye size={18} color="#8e8e93" />
              {isEditing ? (
                <TextInput
                  style={styles.statInput}
                  value={viewsInput}
                  onChangeText={(text) => formatNumberInput(text, setViewsInput)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.statValue}>{formatNumber(profile?.views)}</Text>
              )}
              <Text style={styles.statLabel}>Vues</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Users size={18} color="#8e8e93" />
              {isEditing ? (
                <TextInput
                  style={styles.statInput}
                  value={followersInput}
                  onChangeText={(text) => formatNumberInput(text, setFollowersInput)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.statValue}>{formatNumber(profile?.followers)}</Text>
              )}
              <Text style={styles.statLabel}>Abonnés</Text>
            </View>
          </View>
          
          <View style={styles.bioSection}>
            <Text style={styles.sectionTitle}>À propos de moi</Text>
            {isEditing ? (
              <TextInput
                style={styles.bioInput}
                multiline
                numberOfLines={4}
                value={bioInput}
                onChangeText={setBioInput}
                placeholder="Parlez de vous..."
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.bioText}>{profile?.bio}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.contentsSection}>
          <View style={styles.contentsSectionHeader}>
            <Text style={styles.sectionTitle}>Contenus créés</Text>
            {isEditing && (
              <TouchableOpacity 
                style={styles.addContentButton}
                onPress={addNewContent}
              >
                <Plus size={16} color="#f46d63" />
                <Text style={styles.addContentText}>Ajouter</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.contentsList}>
            {profile?.contents?.map(content => (
              <TouchableOpacity 
                key={content.id} 
                style={styles.contentItemWrapper}
                onPress={() => Alert.alert('Vidéo', 'Lecture de la vidéo')}
              >
                <View style={styles.contentItem}>
                  {content.image && (
                    <Image 
                      source={{ uri: content.image }} 
                      style={styles.contentImage} 
                    />
                  )}
                  <View style={styles.playIconOverlay}>
                    <View style={styles.playIconCircle}>
                      <View style={styles.playIcon} />
                    </View>
                  </View>
                  {isEditing && (
                    <TouchableOpacity 
                      style={styles.deleteContentButton}
                      onPress={() => deleteContent(content.id)}
                    >
                      <Trash2 size={16} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#222222',
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 14,
    color: '#222222',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    padding: 8,
    marginRight: 8,
  },
  saveButton: {
    padding: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  changeAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#f46d63',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 2,
  },
  profileUsername: {
    fontSize: 14,
    color: '#8e8e93',
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 2,
    paddingBottom: 2,
  },
  usernameInput: {
    fontSize: 14,
    color: '#8e8e93',
    paddingBottom: 2,
  },
  socialLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  socialInputsContainer: {
    width: '100%',
  },
  socialInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  socialInputIcon: {
    marginRight: 8,
  },
  socialInput: {
    flex: 1,
    fontSize: 14,
    color: '#222222',
  },
  instagramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E1306C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  tiktokButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  socialIcon: {
    marginRight: 8,
  },
  instagramText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  tiktokText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    marginTop: 4,
    marginBottom: 2,
  },
  statInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'center',
    minWidth: 50,
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e93',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  bioSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: '#222222',
    lineHeight: 20,
  },
  bioInput: {
    fontSize: 14,
    color: '#222222',
    lineHeight: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
  },
  contentsSection: {
    padding: 16,
    paddingTop: 0,
  },
  contentsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addContentButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addContentText: {
    fontSize: 14,
    color: '#f46d63',
    marginLeft: 4,
  },
  contentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  contentItemWrapper: {
    width: '32%',
    marginBottom: 8,
  },
  contentItem: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    aspectRatio: 9/16,
  },
  contentImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 0,
    borderBottomWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: '#fff',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
    marginLeft: 3,
  },
  deleteContentButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
    marginBottom: 8,
    marginTop: 8,
  },
  contentTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  contentTypeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedContentTypeOption: {
    backgroundColor: '#f46d63',
  },
  contentTypeOptionText: {
    fontSize: 14,
    color: '#222222',
  },
  selectedContentTypeOptionText: {
    color: '#fff',
  },
  contentImagePreviewContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  contentImagePreview: {
    width: 150,
    height: 267, // 9:16 ratio
    borderRadius: 8,
    marginBottom: 8,
  },
  changeContentImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f46d63',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeContentImageText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  saveModalButton: {
    backgroundColor: '#f46d63',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});