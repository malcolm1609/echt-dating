// Echt nutzt nur lokale Erinnerungen (Date-Check), keine Push-Nachrichten vom Server.
// expo-notifications trägt trotzdem „aps-environment“ ein; das Apple-Profil der App hat aber keine
// Push-Berechtigung, und der iPhone-Build bricht dann ab. Kommt Push später, diesen Plugin entfernen
// und Push Notifications für app.echt.dating bei Apple einschalten.
// Steht in app.json vor expo-notifications: Plugins verändern die Dateien in umgekehrter Reihenfolge.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = (config) =>
  withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
