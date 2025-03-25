import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MapPin } from 'lucide-react-native';
import { useApp } from '../context/useContext';

export default function FavoritesScreen() {
  const { toggleFavorite, favoriteIds, establishers } = useApp();

  const favoriteEstablishers = establishers.filter((est) =>
    favoriteIds.includes(est.id)
  );

  if (favoriteEstablishers?.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Favoris</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.emptyText}>Aucun favori pour le moment</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favoris</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.placesContainer}>
          {favoriteEstablishers?.map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.placeCard}
              activeOpacity={0.8}
            >
              <Image source={{ uri: place?.photos[0] }} style={styles.placeImage} />
              <View style={styles.placeInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <TouchableOpacity onPress={() => toggleFavorite(place)}>
                    <Heart size={16} color="#f46d63" fill="#f46d63" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.placeType}>{place.type}</Text>
                <View style={styles.locationRow}>
                  <MapPin
                    size={13}
                    color="#8e8e93"
                    style={styles.locationIcon}
                  />
                  <Text style={styles.placeLocation}>{place.location}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
  content: {
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  placesContainer: {
    padding: 16,
  },
  placeCard: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  placeImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
  },
  placeInfo: {
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
    color: '#222222',
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
});
