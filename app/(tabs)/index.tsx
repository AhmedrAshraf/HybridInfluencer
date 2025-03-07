import { View, Text, StyleSheet, TextInput, ScrollView, Image, TouchableOpacity, Modal } from 'react-native';
import { Bell, Search, Heart, MapPin, X, Navigation } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useState } from 'react';
import { allPlaces } from '../../data/places';
import { useFavorites } from '../../hooks/useFavorites';
import { useRouter } from 'expo-router';

const ACCENT_COLOR = '#f46d63';
const ICON_COLOR = '#8e8e93';
const TEXT_COLOR = '#222222';

const CategoryIcon = ({ path, color }: { path: string; color: string }) => (
  <Svg viewBox="0 0 24 24" width={20} height={20} fill={color}>
    <Path d={path} />
  </Svg>
);

const categories = [
  { 
    id: 'restaurants', 
    name: 'Restaurants',
    path: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z'
  },
  { 
    id: 'hotels', 
    name: 'Hôtels',
    path: 'M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12-3h-8v8H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4zm2 8h-8V9h6c1.1 0 2 .9 2 2v4z'
  },
  { 
    id: 'airbnb', 
    name: 'Airbnb',
    path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'
  },
  { 
    id: 'wellness', 
    name: 'Bien-être',
    path: 'M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zM12 20c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2zm-4.17-6c.37 0 .67.26.74.62.41 2.22 2.28 2.98 3.64 2.87.43-.02.79.32.79.75 0 .4-.32.73-.72.75-2.13.13-4.62-1.09-5.19-4.12-.08-.45.28-.87.74-.87z'
  },
  { 
    id: 'activities', 
    name: 'Activités',
    path: 'M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z'
  }
];

const LocationModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Choisir une localisation</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={20} color={TEXT_COLOR} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.locationOption}>
          <Navigation size={20} color={ACCENT_COLOR} />
          <Text style={styles.locationOptionText}>Me géolocaliser</Text>
        </TouchableOpacity>

        <View style={styles.searchLocationContainer}>
          <Search color={TEXT_COLOR} size={16} style={styles.searchIcon} />
          <TextInput
            style={styles.searchLocationInput}
            placeholder="Rechercher une ville"
            placeholderTextColor="#666666"
          />
        </View>

        <Text style={styles.sectionTitle}>Villes populaires</Text>
        {['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse'].map((city) => (
          <TouchableOpacity key={city} style={styles.cityOption}>
            <Text style={styles.cityText}>{city}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  </Modal>
);

const NotificationsModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Notifications</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={20} color={TEXT_COLOR} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyNotifications}>
          <Bell size={40} color={ICON_COLOR} />
          <Text style={styles.emptyNotificationsText}>Aucune notification</Text>
          <Text style={styles.emptyNotificationsSubtext}>
            Vous recevrez des notifications sur les nouveaux établissements et vos réservations
          </Text>
        </View>
      </View>
    </View>
  </Modal>
);

const PlaceList = ({ title, data, isLastSection = false, fullWidth = false }: { 
  title: string; 
  data: typeof allPlaces;
  isLastSection?: boolean;
  fullWidth?: boolean;
}) => {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const router = useRouter();

  return (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>

        {fullWidth ? (
          <View style={styles.fullWidthContainer}>
            {data.map((place) => (
              <TouchableOpacity
                key={place.id}
                style={styles.fullWidthCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/(tabs)/${place.id}`)}
              >
                <Image source={{ uri: place.image }} style={styles.fullWidthImage} />
                <View style={styles.fullWidthInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleFavorite(place);
                      }}
                    >
                      <Heart 
                        size={16} 
                        color={favoriteIds.includes(place.id) ? ACCENT_COLOR : ICON_COLOR}
                        fill={favoriteIds.includes(place.id) ? ACCENT_COLOR : 'transparent'}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.placeType}>{place.type}</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={13} color={ICON_COLOR} style={styles.locationIcon} />
                    <Text style={styles.placeLocation}>{place.location}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.trendingContainer}
          >
            {data.map((place) => (
              <TouchableOpacity
                key={place.id}
                style={styles.trendingCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/(tabs)/${place.id}`)}
              >
                <Image source={{ uri: place.image }} style={styles.trendingImage} />
                <View style={styles.trendingInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleFavorite(place);
                      }}
                    >
                      <Heart 
                        size={16} 
                        color={favoriteIds.includes(place.id) ? ACCENT_COLOR : ICON_COLOR}
                        fill={favoriteIds.includes(place.id) ? ACCENT_COLOR : 'transparent'}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.placeType}>{place.type}</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={13} color={ICON_COLOR} style={styles.locationIcon} />
                    <Text style={styles.placeLocation}>{place.location}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      {!isLastSection && <View style={styles.sectionSeparator} />}
    </>
  );
};

export default function ExploreScreen() {
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('restaurants');

  const filteredPlaces = allPlaces.filter(place => place.category === selectedCategory);
  const trendingPlaces = filteredPlaces.filter(place => place.trending);
  const newPlaces = filteredPlaces.filter(place => place.isNew);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.locationContainer}
          onPress={() => setLocationModalVisible(true)}
        >
          <View style={styles.locationWrapper}>
            <View style={styles.locationRow}>
              <MapPin size={18} color={TEXT_COLOR} />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationTitle}>Votre localisation</Text>
                <Text style={styles.locationLabel}>Marseille</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => setNotificationsModalVisible(true)}>
            <Bell color={TEXT_COLOR} size={18} />
          </TouchableOpacity>
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un établissement"
            placeholderTextColor="#666666"
          />
          <View style={styles.searchIconContainer}>
            <View style={styles.searchIconButton}>
              <Search size={16} color="#fff" />
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.categoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonSelected
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(category.id)}
              >
                <View style={styles.categoryIcon}>
                  <CategoryIcon 
                    path={category.path} 
                    color={selectedCategory === category.id ? ACCENT_COLOR : ICON_COLOR} 
                  />
                </View>
                <Text style={[
                  styles.categoryLabel,
                  selectedCategory === category.id && styles.categoryLabelSelected
                ]}>{category.name}</Text>
                {selectedCategory === category.id && <View style={styles.categorySelectedBar} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <PlaceList title="Tendances" data={trendingPlaces} />
        <PlaceList title="Nouveautés" data={newPlaces} />
        <PlaceList title="Tous les établissements" data={filteredPlaces} isLastSection fullWidth />
      </ScrollView>

      <LocationModal 
        visible={locationModalVisible} 
        onClose={() => setLocationModalVisible(false)} 
      />
      <NotificationsModal 
        visible={notificationsModalVisible} 
        onClose={() => setNotificationsModalVisible(false)} 
      />
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
    paddingBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationWrapper: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTextContainer: {
    marginLeft: 8,
  },
  locationTitle: {
    fontSize: 11,
    color: '#8e8e93',
  },
  locationLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_COLOR,
    marginTop: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 24,
    paddingVertical: 0,
    paddingLeft: 16,
    paddingRight: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_COLOR,
    fontWeight: '400',
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
  content: {
    flex: 1,
  },
  categoriesWrapper: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoriesContainer: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    alignItems: 'center',
    marginRight: 28,
    position: 'relative',
  },
  categoryButtonSelected: {
    opacity: 1,
  },
  categoryIcon: {
    marginBottom: 6,
    height: 20,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 11,
    color: '#8e8e93',
    marginBottom: 6,
  },
  categoryLabelSelected: {
    color: ACCENT_COLOR,
    fontWeight: '500',
  },
  categorySelectedBar: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    width: 16,
    height: 2,
    backgroundColor: ACCENT_COLOR,
    transform: [{ translateX: -8 }],
  },
  section: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_COLOR,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  trendingContainer: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  trendingCard: {
    width: 240,
    marginRight: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  trendingImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  trendingInfo: {
    paddingVertical: 8,
  },
  fullWidthContainer: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  fullWidthCard: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  fullWidthImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
  },
  fullWidthInfo: {
    paddingVertical: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_COLOR,
    flex: 1,
    marginRight: 8,
  },
  placeType: {
    fontSize: 13,
    color: '#8e8e93',
    marginBottom: 2,
    fontWeight: '300',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 4,
  },
  placeLocation: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_COLOR,
  },
  closeButton: {
     padding: 4,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationOptionText: {
    marginLeft: 12,
    fontSize: 15,
    color: TEXT_COLOR,
  },
  searchLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchLocationInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_COLOR,
    marginLeft: 8,
  },
  cityOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cityText: {
    fontSize: 15,
    color: TEXT_COLOR,
  },
  emptyNotifications: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyNotificationsText: {
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_COLOR,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyNotificationsSubtext: {
    fontSize: 13,
    color: '#8e8e93',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 18,
  },
});