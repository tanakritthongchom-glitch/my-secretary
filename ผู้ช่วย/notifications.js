// Notification Engine for Web Push & Local Alarms

class NotificationEngine {
  constructor() {
    this.permissionGranted = false;
    this.checkPermission();
  }

  async checkPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
    }
  }

  async requestPermission() {
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async function(OneSignal) {
        try {
          await OneSignal.Notifications.requestPermission();
        } catch(e) { console.log('OneSignal permission error:', e); }
      });
    }

    if (!('Notification' in window)) {
      alert('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน Push Notification ครับ');
      return false;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      this.permissionGranted = true;
      this.sendNotification('เปิดใช้งานระบบแจ้งเตือนสำเร็จ!', 'ผู้ช่วยจะคอยเด้งเตือนคุณตามตารางเวลาสร้างวินัยนะคะ');
      if (window.secretaryAudio) {
        window.secretaryAudio.speak('เปิดการแจ้งเตือนเรียบร้อยแล้วค่ะ ผู้ช่วยพร้อมดูแลตารางเวลาของคุณแล้วนะคะ');
      }
      return true;
    } else {
      alert('กรุณาอนุญาตการแจ้งเตือนในการตั้งค่าเบราว์เซอร์เพื่อให้ผู้ช่วยเด้งเตือนได้ครับ');
      return false;
    }
  }

  sendNotification(title, body, taskId = null) {
    if (!this.permissionGranted && Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    const options = {
      body: body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: taskId || 'secretary-alert',
      renotify: true,
      data: { taskId: taskId }
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      });
    } else {
      new Notification(title, options);
    }
  }
}

window.notificationEngine = new NotificationEngine();
