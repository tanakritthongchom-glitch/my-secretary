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
          if (OneSignal.Slidedown) {
            await OneSignal.Slidedown.promptPush();
          }
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

  async scheduleCloudPushNotification(timeStr, title, body) {
    try {
      const [hrs, mins] = timeStr.split(':').map(Number);
      const now = new Date();
      const target = new Date();
      target.setHours(hrs, mins, 0, 0);

      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const year = target.getFullYear();
      const month = String(target.getMonth() + 1).padStart(2, '0');
      const day = String(target.getDate()).padStart(2, '0');
      const hStr = String(target.getHours()).padStart(2, '0');
      const mStr = String(target.getMinutes()).padStart(2, '0');
      const sendAfterStr = `${year}-${month}-${day} ${hStr}:${mStr}:00 GMT+0700`;

      const payload = {
        app_id: "e998a77d-d6c4-4409-b243-671fb7279f86",
        included_segments: ["Subscribed Users"],
        target_channel: "push",
        headings: { th: `⏰ เตือนความจำเวลา (${timeStr} น.)`, en: `⏰ Alarm (${timeStr})` },
        contents: { th: body || `ถึงเวลา ${title} แล้วครับ!`, en: body || `Time for ${title}` },
        send_after: sendAfterStr
      };

      fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': 'Basic ' + atob('b3NfdjJfYXBwXzVnbWtvN293eXJjYXRtc2RtNHAzb2o0N3F5ZHJidm1xYXVlZWNhdjV1dXVqNWgyeDU1N2l4a2J4cWtvcXRlbGJoa2kzcWl3cnVmZXhiNmtzNW96emZ0M3RrNjVyd3NicmZldWY0Z3E=')
        },
        body: JSON.stringify(payload)
      }).then(res => res.json()).then(data => {
        console.log('OneSignal Cloud Push Scheduled:', data);
      }).catch(err => console.log('OneSignal Schedule Error:', err));
    } catch(e) {
      console.log('Cloud push error:', e);
    }
  }
}

window.notificationEngine = new NotificationEngine();
