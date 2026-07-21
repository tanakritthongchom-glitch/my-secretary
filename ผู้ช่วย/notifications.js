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
    if (window.OneSignal && window.OneSignal.Notifications) {
      try {
        await window.OneSignal.Notifications.requestPermission();
        await window.OneSignal.User.pushSubscription.optIn();
      } catch(e) {}
    } else if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async function(OneSignal) {
        try {
          await OneSignal.Notifications.requestPermission();
          await OneSignal.User.pushSubscription.optIn();
        } catch(e) {}
      });
    }

    if (!('Notification' in window)) {
      alert('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน Push Notification ครับ');
      return false;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      this.permissionGranted = true;
      return true;
    } else {
      alert('กรุณาอนุญาตการแจ้งเตือนในการตั้งค่าเบราว์เซอร์เพื่อให้ผู้ช่วยเด้งเตือนได้ครับ');
      return false;
    }
  }

  sendNotification(title, body, taskId = null) {
    if (Notification.permission !== 'granted') {
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

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      }).catch(() => {
        try { new Notification(title, options); } catch(e) {}
      });
    } else {
      try { new Notification(title, options); } catch(e) {}
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

  async sendInstantCloudPush(title, body) {
    try {
      let subId = null;
      try {
        if (window.OneSignal && window.OneSignal.User && window.OneSignal.User.pushSubscription) {
          subId = window.OneSignal.User.pushSubscription.id;
        }
      } catch(e) {}

      const payload = {
        app_id: "e998a77d-d6c4-4409-b243-671fb7279f86",
        target_channel: "push",
        headings: { th: title, en: title },
        contents: { th: body, en: body }
      };

      if (subId) {
        payload.include_subscription_ids = [subId];
      } else {
        payload.included_segments = ["Subscribed Users", "Total Subscriptions", "All"];
      }

      const res = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': 'Basic ' + atob('b3NfdjJfYXBwXzVnbWtvN293eXJjYXRtc2RtNHAzb2o0N3F5ZHJidm1xYXVlZWNhdjV1dXVqNWgyeDU1N2l4a2J4cWtvcXRlbGJoa2kzcWl3cnVmZXhiNmtzNW96emZ0M3RrNjVyd3NicmZldWY0Z3E=')
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('OneSignal Instant Push Response:', data);
      if (data.id) {
        alert('⚡ สั่งยิงคลาวด์ลง iPad สำเร็จ! (ส่งตรงลงอุปกรณ์เรียบร้อยแล้ว)\n\nลองกดพับปิดหน้าจอ iPad ภายใน 3 วินาที เพื่อรอดูป้ายเตือนเด้งขึ้นมาได้เลยครับ!');
      } else {
        alert('⚠️ OneSignal แจ้งเตือน: ' + JSON.stringify(data));
      }
    } catch(e) {
      alert('Error: ' + e.message);
    }
  }

  async sendLineNotify(message, customToken = null) {
    const token = customToken || localStorage.getItem('secretary_line_token');
    if (!token) {
      alert('กรุณากรอกและบันทึก LINE Notify Token ก่อนครับ');
      return;
    }

    try {
      const response = await fetch('https://corsproxy.io/?https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        body: new URLSearchParams({ message: message })
      });
      const data = await response.json();
      console.log('LINE Notify Response:', data);
      if (data.status === 200) {
        alert('💬 สั่งยิงข้อความเข้าแอป LINE บน iPad สำเร็จ! เช็คป้ายเด้งในแอป LINE ได้เลยครับ!');
      } else {
        alert('⚠️ LINE Notify ตอบกลับ: ' + data.message);
      }
      return data;
    } catch(err) {
      alert('⚠️ เกิดข้อผิดพลาดส่ง LINE: ' + err.message);
    }
  }
}

window.notificationEngine = new NotificationEngine();
