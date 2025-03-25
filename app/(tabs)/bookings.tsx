import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, Users, MessageCircle, CircleCheck as CheckCircle, Clock as ClockIcon, Circle as XCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../context/useContext';

// Fonction pour déterminer si une réservation est passée ou à venir
const isReservationPast = (dateString: string, status: string) => {
  // Si le statut est "completed", la réservation est toujours considérée comme passée
  if (status === 'completed') return true;
  
  const [day, month, year] = dateString.split('/').map(Number);
  const reservationDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return reservationDate < today;
};

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  // const { reservations, updateReservationStatus } = useReservations();
  const router = useRouter();
  const { establishers, reservations, fetchReservations } = useApp();

  useEffect(() => {
    fetchReservations();
  }, []);

  // Filtrer les réservations en fonction de l'onglet actif
  const filteredReservations = reservations?.filter(reservation => {
    const isPast = isReservationPast(reservation.date, reservation.status);
    return (activeTab === 'upcoming' && !isPast) || (activeTab === 'past' && isPast);
  });

  // Fonction pour obtenir les détails d'un lieu à partir de son ID
  const getPlaceDetails = (placeId: string) => {
    return establishers.find(place => place.id == placeId);
  };

  // Fonction pour naviguer vers la page de messages avec l'établissement spécifique
  const navigateToMessages = (placeId: string) => {
    // Naviguer vers la page de messages et ouvrir la conversation avec l'établissement spécifié
    router.push({
      pathname: '/(tabs)/messages',
      params: { businessId: placeId }
    });
  };
  
  // Fonction pour naviguer vers la fiche d'un établissement
  const navigateToPlace = (placeId: string) => {
    router.push(`/(tabs)/${placeId}`);
  };

  // Fonction pour obtenir l'icône et la couleur du statut
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { 
          icon: <CheckCircle size={16} color="#4CAF50" />, 
          color: '#4CAF50',
          text: 'Confirmé'
        };
      case 'pending':
        return { 
          icon: <ClockIcon size={16} color="#FF9800" />, 
          color: '#FF9800',
          text: 'En attente'
        };
      case 'completed':
        return { 
          icon: <CheckCircle size={16} color="#2196F3" />, 
          color: '#2196F3',
          text: 'Terminé'
        };
      case 'cancelled':
        return { 
          icon: <XCircle size={16} color="#F44336" />, 
          color: '#F44336',
          text: 'Annulé'
        };
      default:
        return { 
          icon: null, 
          color: '#8e8e93',
          text: 'Inconnu'
        };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Réservations</Text>
      </View>
      
      {/* Onglets */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            À venir
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Passé
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Contenu des réservations */}
      {filteredReservations?.length > 0 ? (
        <ScrollView style={styles.content}>
          {filteredReservations?.map(reservation => {
            const place = getPlaceDetails(reservation.placeId);
            if (!place) return null;
            
            const statusInfo = getStatusInfo(reservation.status);
            
            return (
              <View key={reservation.id} style={styles.reservationCard}>
                <TouchableOpacity 
                  style={styles.cardHeader}
                  onPress={() => navigateToPlace(place.id)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: place?.photos[0] }} style={styles.placeImage} />
                  <View style={styles.placeInfo}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    <Text style={styles.placeType}>{place.type}</Text>
                    <View style={styles.locationContainer}>
                      <MapPin size={12} color="#8e8e93" />
                      <Text style={styles.locationText}>{place.location}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                
                <View style={styles.divider} />
                
                {/* Statut de la réservation - Affiché en haut et de manière plus visible */}
                <View style={[styles.statusBanner, { backgroundColor: `${statusInfo.color}10` }]}>
                  {statusInfo.icon}
                  <Text style={[styles.statusBannerText, { color: statusInfo.color }]}>
                    {statusInfo.text}
                  </Text>
                </View>
                
                <View style={styles.reservationDetails}>
                  <View style={styles.detailRow}>
                    <Calendar size={16} color="#8e8e93" />
                    <Text style={styles.detailText}>
                      {reservation.date} à {reservation.time}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Users size={16} color="#8e8e93" />
                    <Text style={styles.detailText}>{reservation.guests}</Text>
                  </View>
                  
                  <View style={styles.contentTypesContainer}>
                    <Text style={styles.detailLabel}>Type de contenu:</Text>
                    {/* <View style={styles.tagsContainer}>
                      {reservation.contentTypes.map((type, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{type}</Text>
                        </View>
                      ))}
                    </View> */}
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Clock size={16} color="#8e8e93" />
                    <Text style={styles.detailText}>{reservation.timeframe}</Text>
                  </View>
                  
                  {reservation.specialRequest && (
                    <View style={styles.specialRequest}>
                      <Text style={styles.detailLabel}>Demande spéciale:</Text>
                      <Text style={styles.specialRequestText}>{reservation.specialRequest}</Text>
                    </View>
                  )}
                </View>
                
                {/* Afficher le bouton de contact pour toutes les réservations, pas seulement celles confirmées */}
                <TouchableOpacity 
                  style={styles.messageButton}
                  onPress={() => navigateToMessages(place.id)}
                >
                  <MessageCircle size={16} color="#fff" style={styles.messageIcon} />
                  <Text style={styles.messageButtonText}>Contacter l'établissement</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {activeTab === 'upcoming' 
              ? 'Aucune réservation à venir' 
              : 'Aucune réservation passée'}
          </Text>
        </View>
      )}
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
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#f46d63',
  },
  tabText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  activeTabText: {
    color: '#f46d63',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
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
  reservationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 12,
  },
  placeImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  placeInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
    marginBottom: 2,
  },
  placeType: {
    fontSize: 13,
    color: '#8e8e93',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#8e8e93',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 12,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
    marginHorizontal: 12,
    borderRadius: 8,
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  reservationDetails: {
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#222222',
    marginLeft: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#222222',
    fontWeight: '500',
    marginBottom: 4,
  },
  contentTypesContainer: {
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#222222',
  },
  specialRequest: {
    marginTop: 4,
    marginBottom: 8,
  },
  specialRequestText: {
    fontSize: 14,
    color: '#222222',
    fontStyle: 'italic',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  confirmedBadge: {
    backgroundColor: '#e8f5e9',
  },
  pendingBadge: {
    backgroundColor: '#fff8e1',
  },
  completedBadge: {
    backgroundColor: '#e3f2fd',
  },
  cancelledBadge: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#222222',
  },
  messageButton: {
    backgroundColor: '#f46d63',
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  messageIcon: {
    marginRight: 8,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});