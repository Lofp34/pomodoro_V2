const notificationService = {
  /**
   * Checks if notification permission has been granted.
   */
  hasPermission(): boolean {
    if (!('Notification' in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  },

  /**
   * Checks for notification support and requests permission if needed.
   * This should be called from a user-initiated event (e.g., a button click).
   * @returns {Promise<boolean>} A promise that resolves to true if permission is granted, false otherwise.
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.error('This browser does not support desktop notification.');
      return false;
    }

    // If permission is already granted or denied, do nothing.
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission === 'granted';
    }

    // Otherwise, request permission.
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  /**
   * Shows a notification if permission is granted.
   * @param {string} title - The title of the notification.
   * @param {string} body - The body text of the notification.
   */
  showNotification(title: string, body: string): void {
    if (this.hasPermission()) {
      // Use a service worker to display the notification for better background reliability, if available.
      // For now, we use the simpler direct notification.
      new Notification(title, { 
        body,
        icon: '/pwa-192x192.png' // Optional: adds the app icon to the notification
      });
    }
  }
};

export { notificationService }; 