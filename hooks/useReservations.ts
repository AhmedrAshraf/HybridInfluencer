import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types pour les réservations
type ContentType = string;
type Timeframe = string;
type GuestOption = 'Seul(e)' | 'Avec un +1';

export interface Reservation {
  id: string;
  placeId: string;
  date: string;
  time: string;
  guests: GuestOption;
  contentTypes: ContentType[];
  timeframe: Timeframe;
  specialRequest?: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
}

interface ReservationsStore {
  reservations: Reservation[];
  addReservation: (reservation: Reservation) => void;
  updateReservationStatus: (id: string, status: Reservation['status']) => void;
  deleteReservation: (id: string) => void;
}

// Données de réservation fictives initiales
const initialReservations: Reservation[] = [
  {
    id: '1',
    placeId: '1',
    date: '15/06/2025',
    time: '19:30',
    guests: 'Avec un +1',
    contentTypes: ['3/4 Stories', '1 Post'],
    timeframe: 'Entre 3 et 7 jours',
    status: 'confirmed'
  },
  {
    id: '2',
    placeId: '2',
    date: '22/06/2025',
    time: '12:30',
    guests: 'Seul(e)',
    contentTypes: ['1 Réel'],
    timeframe: 'Entre 1 et 3 jours',
    specialRequest: 'Table près de la fenêtre si possible',
    status: 'pending'
  },
  {
    id: '3',
    placeId: '4',
    date: '10/05/2023',
    time: '20:00',
    guests: 'Avec un +1',
    contentTypes: ['5 Stories ou plus', '1 Carrousel'],
    timeframe: 'Entre 7 et 15 jours',
    status: 'completed'
  },
  {
    id: '4',
    placeId: '8',
    date: '01/05/2023',
    time: '14:00',
    guests: 'Seul(e)',
    contentTypes: ['1 Réel TikTok'],
    timeframe: 'Entre 3 et 7 jours',
    status: 'completed'
  }
];

export const useReservations = create<ReservationsStore>((set) => ({
  reservations: initialReservations,
  
  addReservation: (reservation) => 
    set((state) => ({
      reservations: [...state.reservations, reservation]
    })),
  
  updateReservationStatus: (id, status) =>
    set((state) => ({
      reservations: state.reservations.map(reservation => 
        reservation.id === id 
          ? { ...reservation, status } 
          : reservation
      )
    })),
  
  deleteReservation: (id) =>
    set((state) => ({
      reservations: state.reservations.filter(reservation => reservation.id !== id)
    })),
}));