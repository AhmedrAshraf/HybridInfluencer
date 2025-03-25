// Fonction pour formater la date
export const formatMessageTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    // Aujourd'hui : afficher l'heure
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    // Hier
    return 'Hier';
  } else if (diffDays < 7) {
    // Cette semaine : afficher le jour
    const days = [
      'Dimanche',
      'Lundi',
      'Mardi',
      'Mercredi',
      'Jeudi',
      'Vendredi',
      'Samedi',
    ];
    return days[date.getDay()];
  } else {
    // Plus d'une semaine : afficher la date
    return date.toLocaleDateString();
  }
};
