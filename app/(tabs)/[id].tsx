import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Heart,
  MapPin,
  Calendar,
  Users,
  Clock,
  X,
  CircleAlert as AlertCircle,
  Check,
} from 'lucide-react-native';
import Map from 'react-map-gl';
import { useState, useMemo, useEffect } from 'react';
import { useReservations } from '../../hooks/useReservations';
import { useApp } from '../context/useContext';
import { supabase } from '@/utils/supabase';
import { sendPushNotification } from '@/hooks/NotificationProvider';

const ACCENT_COLOR = '#f46d63';
const ICON_COLOR = '#8e8e93';
const TEXT_COLOR = '#222222';
const MAPBOX_TOKEN =
  'pk.eyJ1Ijoic2lyaXVzbWF0aCIsImEiOiJjbTV6bjBjN3cwNGYzMm5yMThqcHd6cmJuIn0.jIamAzv1vVhvLFDVxPc0tQ';

const days = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];
const hours = {
  Lundi: '12:00-14:30, 19:00-22:30',
  Mardi: 'Fermé',
  Mercredi: '12:00-14:30, 19:00-22:30',
  Jeudi: '12:00-14:30, 19:00-22:30',
  Vendredi: '12:00-14:30, 19:00-23:00',
  Samedi: '12:00-14:30, 19:00-23:00',
  Dimanche: 'Fermé',
};

// Options pour le formulaire de réservation
const contentTypeOptions = [
  '3/4 Stories',
  '5 Stories ou plus',
  '1 Réel',
  '1 Carrousel',
  '1 Post',
  '1 Réel TikTok',
];

const timeframeOptions = [
  'Entre 1 et 3 jours',
  'Entre 3 et 7 jours',
  'Entre 7 et 15 jours',
];

const guestOptions = ['Seul(e)', 'Avec un +1'];

// Fonction pour analyser les heures d'ouverture
const parseOpeningHours = (hoursString) => {
  if (hoursString === 'Fermé') return [];

  const periods = hoursString.split(', ');
  return periods.map((period) => {
    const [start, end] = period.split('-');
    return { start, end };
  });
};

// Fonction pour obtenir le jour de la semaine français à partir d'une date
const getFrenchDayOfWeek = (date) => {
  const dayIndex = date.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
  // Réorganiser pour que 0 = Lundi, 6 = Dimanche
  const frenchDayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  return days[frenchDayIndex];
};

// Générer les heures disponibles en fonction du jour
const generateAvailableHours = (dayOfWeek) => {
  const dayHours = hours[dayOfWeek];
  if (dayHours === 'Fermé') return [];

  const periods = parseOpeningHours(dayHours);
  const availableHours = [];

  periods.forEach((period) => {
    const [startHour, startMinute] = period.start.split(':').map(Number);
    const [endHour, endMinute] = period.end.split(':').map(Number);

    // Générer des créneaux de 30 minutes
    let currentHour = startHour;
    let currentMinute = startMinute;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMinute < endMinute - 30) // Laisser 30 minutes avant la fermeture
    ) {
      const formattedHour = `${currentHour
        .toString()
        .padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      availableHours.push(formattedHour);

      // Avancer de 30 minutes
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }
  });

  return availableHours;
};

export default function PlaceDetails() {
  const { id } = useLocalSearchParams();
  const { establishers, user, favoriteIds, toggleFavorite } = useApp();
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addReservation } = useReservations();
  const [reservationModalVisible, setReservationModalVisible] = useState(false);
  const [reservationSuccess, setReservationSuccess] = useState(false);

  const [coordinates, setCoordinates] = useState({
    latitude: 43.2965, // Default location: Marseille
    longitude: 5.3698,
  });

  // États pour le formulaire de réservation
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedGuests, setSelectedGuests] = useState('');
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>(
    []
  );
  const [selectedTimeframe, setSelectedTimeframe] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  // États pour afficher les sélecteurs
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Fonction pour formater la date
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Fonction pour gérer la sélection multiple des types de contenu
  const toggleContentType = (contentType: string) => {
    setSelectedContentTypes((prev) => {
      if (prev.includes(contentType)) {
        return prev.filter((type) => type !== contentType);
      } else {
        return [...prev, contentType];
      }
    });
  };

  // Générer les dates disponibles (prochains 90 jours)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();

    for (let i = 1; i <= 90; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);

      // Vérifier si le restaurant est ouvert ce jour-là
      const dayOfWeek = getFrenchDayOfWeek(date);
      if (hours[dayOfWeek] !== 'Fermé') {
        dates.push(date);
      }
    }

    return dates;
  };

  const availableDates = getAvailableDates();

  // Obtenir les heures disponibles pour la date sélectionnée
  const availableHours = useMemo(() => {
    if (!selectedDate) return [];

    // Convertir la date sélectionnée en objet Date
    const [day, month, year] = selectedDate.split('/').map(Number);
    const date = new Date(year, month - 1, day);

    // Obtenir le jour de la semaine
    const dayOfWeek = getFrenchDayOfWeek(date);

    // Générer les heures disponibles
    return generateAvailableHours(dayOfWeek);
  }, [selectedDate]);

  // Fonction pour soumettre la réservation
  const submitReservation = async () => {
    console.log(selectedDate, 'data');
    console.log(selectedTime, 'time');
    // Créer un objet de réservation
    const newReservation = {
      id: Date.now(),
      placeId: id as string,
      userId: user?.uuid,
      influencerName: user?.name,
      influencerAvatar: user?.avatar,
      date: selectedDate,
      time: selectedTime,
      guests: selectedGuests as 'Seul(e)' | 'Avec un +1',
      contentTypes: selectedContentTypes,
      timeframe: selectedTimeframe,
      specialRequest: specialRequest || undefined,
      status: 'pending',
    };

    try {
      // Insert into Supabase
      const { data, error } = await supabase
        .from('reservations')
        .insert([newReservation]);

      if (error) {
        console.error('Error adding reservation:', error.message);
        return;
      }

      const { data: ownerData, error: ownerError } = await supabase
        .from('establishers')
        .select('token')
        .eq('id', id)
        .single();

      if (ownerError) {
        console.error(
          'Error fetching establishment owner:',
          ownerError.message
        );
        return;
      }

      // Check if the owner has a push token
      const ownerPushToken = ownerData?.token;
      if (ownerPushToken) {
        await sendPushNotification(
          ownerPushToken,
          'Nouvelle réservation 🏨',
          `${user?.name} a réservé une place pour ${selectedDate} à ${selectedTime}`,
          { reservationId: newReservation.id }
        );
      } else {
        console.warn('Establishment owner does not have a push token.');
      }

      // Add the reservation to Zustand state
      addReservation(newReservation);

      // Show success message
      setReservationSuccess(true);

      // Close the modal after 2 seconds
      setTimeout(() => {
        setReservationSuccess(false);
        setReservationModalVisible(false);

        // Reset the form
        setSelectedDate('');
        setSelectedTime('');
        setSelectedGuests('');
        setSelectedContentTypes([]);
        setSelectedTimeframe('');
        setSpecialRequest('');

        // Redirect to reservations page
        router.push('/(tabs)/bookings');
      }, 2000);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const place: any = establishers.find((p) => p.id == id);

  useEffect(() => {
    if (!place?.location) return;

    const fetchCoordinates = async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            place?.location
          )}.json?access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();

        if (data?.features?.length > 0) {
          const [lng, lat] = data.features[0].center;
          setCoordinates({ latitude: lat, longitude: lng });
        }
      } catch (error) {
        console.error('Error fetching coordinates:', error);
      }
    };

    fetchCoordinates();
  }, [place?.location]);

  if (!place) return null;

  // const images = [
  //   place.image,
  //   'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
  //   'https://images.unsplash.com/photo-1559339352-11d035aa65de',
  //   'https://images.unsplash.com/photo-1544148103-0773bf10d330'
  // ];

  // Vérifier si tous les champs obligatoires sont remplis
  const isFormValid =
    selectedDate &&
    selectedTime &&
    selectedGuests &&
    selectedContentTypes.length > 0 &&
    selectedTimeframe;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.imageContainer}>
            {!!place?.photos?.[0] && (
              <Image
                source={{ uri: place?.photos[currentImageIndex] }}
                style={styles.image}
              />
            )}
            <View style={styles.dots}>
              {place?.photos?.map((_: any, index: any) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentImageIndex(index)}
                  style={styles.dotButton}
                >
                  <View
                    style={[
                      styles.dot,
                      currentImageIndex === index && styles.activeDot,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color={TEXT_COLOR} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(place)}
          >
            <Heart
              size={20}
              color={favoriteIds.includes(place.id) ? ACCENT_COLOR : TEXT_COLOR}
              fill={
                favoriteIds.includes(place.id) ? ACCENT_COLOR : 'transparent'
              }
              strokeWidth={1.5}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.details}>
          <Text style={styles.name}>{place.name}</Text>
          <Text style={styles.type}>{place.type}</Text>

          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{place.type}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{place.category}</Text>
            </View>
          </View>

          <Text style={styles.description}>{place.offer}</Text>

          <View style={styles.socialButtons}>
            <TouchableOpacity style={styles.socialButton}>
              <Image
                source={{
                  uri: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Instagram_logo_2022.svg',
                }}
                style={styles.socialIcon}
              />
              <Text style={styles.socialButtonText}>Instagram</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Image
                source={{
                  uri: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg',
                }}
                style={styles.socialIcon}
              />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Où se situe l'établissement</Text>
            <View style={styles.addressContainer}>
              <MapPin size={20} color={ICON_COLOR} />
              <Text style={styles.address}>{place?.location}</Text>
            </View>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: coordinates.latitude,
                  longitude: coordinates.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                <Marker coordinate={coordinates} title={place?.location} />
              </MapView>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Horaires</Text>
            <View style={styles.hours}>
              {place?.openingHours?.map((item, index) => {
                const parsedItem = JSON.parse(item);
                return (
                  <View key={index} style={styles.hourRow}>
                    <Text style={styles.day}>{parsedItem.day}</Text>
                    <Text
                      style={[
                        styles.time,
                        parsedItem.isClosed && styles.closed,
                      ]}
                    >
                      {parsedItem.isClosed
                        ? 'Fermé'
                        : parsedItem.timeSlots
                            .map((slot) => `${slot.open} - ${slot.close}`)
                            .join(', ')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.reserveButton}
          onPress={() => setReservationModalVisible(true)}
        >
          <Text style={styles.reserveButtonText}>Réserver</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de réservation */}
      <Modal
        visible={reservationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReservationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {reservationSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <Check size={40} color="#4CAF50" />
                </View>
                <Text style={styles.successTitle}>Demande envoyée !</Text>
                <Text style={styles.successText}>
                  Votre demande de réservation a été envoyée avec succès. Vous
                  serez redirigé vers vos réservations.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Réservation</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setReservationModalVisible(false)}
                  >
                    <X size={20} color={TEXT_COLOR} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.formContainer}>
                  {/* Sélection de la date */}
                  <Text style={styles.formLabel}>Date de la réservation</Text>
                  <TouchableOpacity
                    style={styles.formInput}
                    onPress={() => {
                      setShowDatePicker(!showDatePicker);
                      setShowTimePicker(false);
                    }}
                  >
                    <Calendar
                      size={18}
                      color={ICON_COLOR}
                      style={styles.inputIcon}
                    />
                    <Text
                      style={
                        selectedDate ? styles.inputText : styles.placeholderText
                      }
                    >
                      {selectedDate || 'Sélectionner une date'}
                    </Text>
                  </TouchableOpacity>

                  {/* Calendrier simplifié */}
                  {showDatePicker && (
                    <View style={styles.datePickerContainer}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.datePickerContent}
                      >
                        <View style={styles.datesRow}>
                          {availableDates.map((date, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.dateOption,
                                selectedDate === formatDate(date) &&
                                  styles.selectedDateOption,
                              ]}
                              onPress={() => {
                                setSelectedDate(formatDate(date));
                                setSelectedTime(''); // Réinitialiser l'heure quand on change de date
                                setShowDatePicker(false);
                                setShowTimePicker(true); // Afficher le sélecteur d'heure après avoir choisi une date
                              }}
                            >
                              <Text
                                style={[
                                  styles.dateDay,
                                  selectedDate === formatDate(date) &&
                                    styles.selectedDateText,
                                ]}
                              >
                                {date.getDate()}
                              </Text>
                              <Text
                                style={[
                                  styles.dateMonth,
                                  selectedDate === formatDate(date) &&
                                    styles.selectedDateText,
                                ]}
                              >
                                {date.toLocaleString('fr-FR', {
                                  month: 'short',
                                })}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Sélection de l'heure */}
                  <Text style={styles.formLabel}>Heure de la réservation</Text>
                  <TouchableOpacity
                    style={styles.formInput}
                    onPress={() => {
                      if (selectedDate) {
                        setShowTimePicker(!showTimePicker);
                        setShowDatePicker(false);
                      } else {
                        // Si aucune date n'est sélectionnée, afficher le sélecteur de date d'abord
                        setShowDatePicker(true);
                      }
                    }}
                  >
                    <Clock
                      size={18}
                      color={ICON_COLOR}
                      style={styles.inputIcon}
                    />
                    <Text
                      style={
                        selectedTime ? styles.inputText : styles.placeholderText
                      }
                    >
                      {selectedTime || 'Sélectionner une heure'}
                    </Text>
                  </TouchableOpacity>

                  {/* Sélecteur d'heure */}
                  {showTimePicker && (
                    <View style={styles.timePickerContainer}>
                      {availableHours.length > 0 ? (
                        <View style={styles.timeOptionsContainer}>
                          {availableHours.map((time, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.timeOption,
                                selectedTime === time &&
                                  styles.selectedTimeOption,
                              ]}
                              onPress={() => {
                                setSelectedTime(time);
                                setShowTimePicker(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.timeText,
                                  selectedTime === time &&
                                    styles.selectedTimeText,
                                ]}
                              >
                                {time}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.noTimesAvailable}>
                          <AlertCircle size={20} color={ICON_COLOR} />
                          <Text style={styles.noTimesText}>
                            Aucun créneau disponible pour cette date
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Sélection du nombre de personnes */}
                  <Text style={styles.formLabel}>Nombre de personnes</Text>
                  <View style={styles.optionsContainer}>
                    {guestOptions.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.optionButton,
                          selectedGuests === option && styles.selectedOption,
                        ]}
                        onPress={() => setSelectedGuests(option)}
                      >
                        <Users
                          size={16}
                          color={
                            selectedGuests === option ? '#fff' : ICON_COLOR
                          }
                          style={styles.optionIcon}
                        />
                        <Text
                          style={[
                            styles.optionText,
                            selectedGuests === option &&
                              styles.selectedOptionText,
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Type de contenu (sélection multiple) */}
                  <Text style={styles.formLabel}>
                    Type de contenu (plusieurs choix possibles)
                  </Text>
                  <View style={styles.contentTypeContainer}>
                    {contentTypeOptions.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.contentTypeButton,
                          selectedContentTypes.includes(option) &&
                            styles.selectedContentType,
                        ]}
                        onPress={() => toggleContentType(option)}
                      >
                        <View style={styles.contentTypeInner}>
                          {selectedContentTypes.includes(option) && (
                            <Check
                              size={14}
                              color="#fff"
                              style={styles.checkIcon}
                            />
                          )}
                          <Text
                            style={[
                              styles.contentTypeText,
                              selectedContentTypes.includes(option) &&
                                styles.selectedContentTypeText,
                            ]}
                          >
                            {option}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Afficher les types de contenu sélectionnés */}
                  {selectedContentTypes.length > 0 && (
                    <View style={styles.selectedTypesContainer}>
                      <Text style={styles.selectedTypesLabel}>
                        {selectedContentTypes.length}{' '}
                        {selectedContentTypes.length > 1
                          ? 'types sélectionnés'
                          : 'type sélectionné'}
                      </Text>
                    </View>
                  )}

                  {/* Délai de publication */}
                  <Text style={styles.formLabel}>Délai de publication</Text>
                  <View style={styles.timeframeContainer}>
                    {timeframeOptions.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.timeframeButton,
                          selectedTimeframe === option &&
                            styles.selectedTimeframe,
                        ]}
                        onPress={() => setSelectedTimeframe(option)}
                      >
                        <Clock
                          size={16}
                          color={
                            selectedTimeframe === option ? '#fff' : ICON_COLOR
                          }
                          style={styles.optionIcon}
                        />
                        <Text
                          style={[
                            styles.timeframeText,
                            selectedTimeframe === option &&
                              styles.selectedTimeframeText,
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Demande spéciale */}
                  <Text style={styles.formLabel}>
                    Demande spéciale (optionnel)
                  </Text>
                  <TextInput
                    style={styles.specialRequestInput}
                    placeholder="Précisez votre demande ici..."
                    placeholderTextColor="#999"
                    multiline={true}
                    numberOfLines={4}
                    value={specialRequest}
                    onChangeText={setSpecialRequest}
                  />

                  {/* Bouton de soumission */}
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      !isFormValid && styles.disabledButton,
                    ]}
                    onPress={submitReservation}
                    disabled={!isFormValid}
                  >
                    <Text style={styles.submitButtonText}>
                      Confirmer la réservation
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  header: {
    position: 'relative',
    height: 300,
  },
  imageContainer: {
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dotButton: {
    padding: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  details: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: TEXT_COLOR,
    marginBottom: 4,
  },
  type: {
    fontSize: 16,
    color: ICON_COLOR,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  tagText: {
    fontSize: 13,
    color: TEXT_COLOR,
  },
  description: {
    fontSize: 15,
    color: TEXT_COLOR,
    lineHeight: 22,
    marginBottom: 16,
  },
  socialButtons: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  socialButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: TEXT_COLOR,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_COLOR,
    marginBottom: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  address: {
    marginLeft: 8,
    fontSize: 15,
    color: TEXT_COLOR,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  hours: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  day: {
    fontSize: 15,
    color: TEXT_COLOR,
  },
  time: {
    fontSize: 15,
    color: TEXT_COLOR,
  },
  closed: {
    color: ICON_COLOR,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  reserveButton: {
    backgroundColor: ACCENT_COLOR,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  reserveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Styles pour le modal de réservation
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
    color: TEXT_COLOR,
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    padding: 16,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_COLOR,
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputText: {
    fontSize: 14,
    color: TEXT_COLOR,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  datePickerContent: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  datesRow: {
    flexDirection: 'row',
  },
  dateOption: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  selectedDateOption: {
    backgroundColor: ACCENT_COLOR,
  },
  dateDay: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_COLOR,
  },
  dateMonth: {
    fontSize: 12,
    color: ICON_COLOR,
    textTransform: 'capitalize',
  },
  selectedDateText: {
    color: '#fff',
  },
  timePickerContainer: {
    marginBottom: 16,
  },
  timeOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTimeOption: {
    backgroundColor: ACCENT_COLOR,
  },
  timeText: {
    fontSize: 14,
    color: TEXT_COLOR,
  },
  selectedTimeText: {
    color: '#fff',
  },
  noTimesAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  noTimesText: {
    marginLeft: 8,
    fontSize: 14,
    color: ICON_COLOR,
  },
  optionsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  selectedOption: {
    backgroundColor: ACCENT_COLOR,
  },
  optionIcon: {
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    color: TEXT_COLOR,
  },
  selectedOptionText: {
    color: '#fff',
  },
  contentTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  contentTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedContentType: {
    backgroundColor: ACCENT_COLOR,
    borderColor: ACCENT_COLOR,
  },
  contentTypeInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    marginRight: 4,
  },
  contentTypeText: {
    fontSize: 14,
    color: TEXT_COLOR,
  },
  selectedContentTypeText: {
    color: '#fff',
  },
  selectedTypesContainer: {
    marginBottom: 16,
  },
  selectedTypesLabel: {
    fontSize: 13,
    color: ACCENT_COLOR,
    fontWeight: '500',
  },
  timeframeContainer: {
    marginBottom: 16,
  },
  timeframeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  selectedTimeframe: {
    backgroundColor: ACCENT_COLOR,
  },
  timeframeText: {
    fontSize: 14,
    color: TEXT_COLOR,
  },
  selectedTimeframeText: {
    color: '#fff',
  },
  specialRequestInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: TEXT_COLOR,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: ACCENT_COLOR,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: '#f0f0f0',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Styles pour le message de succès
  successContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: TEXT_COLOR,
    textAlign: 'center',
    lineHeight: 24,
  },
});
