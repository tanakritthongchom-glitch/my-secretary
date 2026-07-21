// Main App Logic & Discipline Scheduler

class DisciplineApp {
  constructor() {
    this.tasks = JSON.parse(localStorage.getItem('secretary_tasks')) || [];
    this.streakDays = parseInt(localStorage.getItem('secretary_streak') || '0');
    this.masterNotifEnabled = JSON.parse(localStorage.getItem('secretary_master_notif') ?? 'true');
    this.backgroundModeEnabled = JSON.parse(localStorage.getItem('secretary_background_mode') ?? 'false');
    this.notifMode = localStorage.getItem('secretary_notif_mode') || 'silent'; // 'silent' or 'both'
    this.secretaryStyle = localStorage.getItem('secretary_style') || 'polite'; // 'polite' or 'savage'
    this.lastTriggeredTime = '';
    this.init();
  }

  init() {
    window.secretaryAudio.onStateChange = () => this.updateAudioButtonsUI();
    if (this.backgroundModeEnabled) {
      window.secretaryAudio.enableBackgroundKeepAlive();
    }
    this.updateVoiceUI();
    this.updateSettingsUI();
    this.renderHeaderGreeting();
    this.renderStats();
    this.renderTimeline();
    this.startScheduler();
    this.bindEvents();
    this.registerServiceWorker();
    this.syncTasksWithServiceWorker();
  }

  saveData() {
    localStorage.setItem('secretary_tasks', JSON.stringify(this.tasks));
    localStorage.setItem('secretary_streak', this.streakDays.toString());
    localStorage.setItem('secretary_master_notif', JSON.stringify(this.masterNotifEnabled));
    localStorage.setItem('secretary_background_mode', JSON.stringify(this.backgroundModeEnabled));
    localStorage.setItem('secretary_notif_mode', this.notifMode);
    localStorage.setItem('secretary_style', this.secretaryStyle);
    this.syncTasksWithServiceWorker();
  }

  syncTasksWithServiceWorker() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_TASKS',
        tasks: this.tasks
      });
    }

    // Schedule OneSignal Cloud Push for active tasks
    if (window.notificationEngine && window.notificationEngine.scheduleCloudPushNotification) {
      this.tasks.forEach(task => {
        if (task.time && !task.done && task.active !== false) {
          window.notificationEngine.scheduleCloudPushNotification(
            task.time,
            task.title,
            task.customAlert
          );
        }
      });
    }
  }

  updateVoiceUI() {
    const gender = window.secretaryAudio.gender || 'female';
    const avatarEl = document.getElementById('secretaryAvatar');
    const nameEl = document.getElementById('secretaryName');
    const toggleBtn = document.getElementById('toggleVoiceBtn');

    if (gender === 'male') {
      if (avatarEl) avatarEl.innerText = this.secretaryStyle === 'savage' ? '🔥' : '👨‍💼';
      if (nameEl) nameEl.innerText = this.secretaryStyle === 'savage' ? 'เลขาอาร์ม (สายเพื่อน)' : 'เลขาอาร์ม (ARM)';
      if (toggleBtn) toggleBtn.innerText = '👨‍💼 เสียงชาย';
    } else {
      if (avatarEl) avatarEl.innerText = this.secretaryStyle === 'savage' ? '😈' : '👩‍💼';
      if (nameEl) nameEl.innerText = this.secretaryStyle === 'savage' ? 'เลขาเอวา (สายเพื่อน)' : 'เลขาเอวา (EVA)';
      if (toggleBtn) toggleBtn.innerText = '👩‍💼 เสียงหญิง';
    }
  }

  updateSettingsUI() {
    const switchEl = document.getElementById('masterNotifSwitch');
    if (switchEl) switchEl.checked = this.masterNotifEnabled;

    const bgSwitchEl = document.getElementById('backgroundModeSwitch');
    if (bgSwitchEl) bgSwitchEl.checked = this.backgroundModeEnabled;

    const silentBtn = document.getElementById('modeSilentBtn');
    const bothBtn = document.getElementById('modeBothBtn');

    if (this.notifMode === 'silent') {
      silentBtn?.classList.add('active');
      bothBtn?.classList.remove('active');
    } else {
      bothBtn?.classList.add('active');
      silentBtn?.classList.remove('active');
    }

    const politeBtn = document.getElementById('stylePoliteBtn');
    const savageBtn = document.getElementById('styleSavageBtn');

    if (this.secretaryStyle === 'polite') {
      politeBtn?.classList.add('active');
      savageBtn?.classList.remove('savage-active');
      savageBtn?.classList.remove('active');
    } else {
      savageBtn?.classList.add('savage-active');
      politeBtn?.classList.remove('active');
    }
  }

  generateAlertText(title, style = this.secretaryStyle) {
    if (style === 'savage') {
      const savageTemplates = [
        `เฮ้ยไอ้สัส! ได้เวลา ${title} แล้วว้อย อย่าอู้!`,
        `ลุกไป ${title} ได้แล้วมึง มัวแต่นั่งทำเหี้ยอะไร!`,
        `อย่าลืมไป ${title} นะเว้ย ไอ้เวร!`,
        `ได้เวลา ${title} แล้วไอ้สัส ตั้งใจสร้างวินัยดิ!`
      ];
      return savageTemplates[Math.floor(Math.random() * savageTemplates.length)];
    } else {
      const politeTemplates = [
        `ครับเจ้านาย! ได้เวลา ${title} แล้วครับเจ้านาย`,
        `รับทราบครับเจ้านาย ถึงเวลา ${title} เพื่อสร้างวินัยครับเจ้านาย`,
        `อย่าลืม ${title} นะครับเจ้านาย`,
        `เรียนเจ้านายครับ ได้เวลา ${title} เรียบร้อยแล้วครับเจ้านาย`
      ];
      return politeTemplates[Math.floor(Math.random() * politeTemplates.length)];
    }
  }

  fillPresetAlert(style) {
    const titleVal = document.getElementById('taskTitle')?.value || 'ทำกิจกรรม';
    const inputAlert = document.getElementById('taskCustomAlert');
    if (inputAlert) {
      inputAlert.value = this.generateAlertText(titleVal, style);
    }
  }

  getGreeting() {
    const hour = new Date().getHours();
    const isMale = window.secretaryAudio.gender === 'male';

    if (this.secretaryStyle === 'savage') {
      if (hour >= 5 && hour < 12) return 'ตื่นได้แล้วมั้งไอ้สัส! วันนี้กี่โมงกี่ยามแล้ว ห้ามอู้เด็ดขาดนะมึง 🔥';
      if (hour >= 12 && hour < 17) return 'บ่ายแล้วไอ้เวร! มัวแต่นั่งง่วง ลุยงานต่อได้แล้วว้อย! 💥';
      if (hour >= 17 && hour < 21) return 'เย็นแล้วนะมึง! มาดูดิว่าวันนี้มึงสำเร็จภารกิจไปกี่อย่าง ไอ้สัส 🌆';
      return 'ดึกแล้วไอ้สัส! ลุกไปนอนได้แล้ว มัวแต่เล่นมือถืออยู่ได้ 🌙';
    } else {
      const polite = isMale ? 'ครับเจ้านาย' : 'ค่ะเจ้านาย';
      const politeSoft = isMale ? 'นะครับเจ้านาย' : 'นะคะเจ้านาย';

      if (hour >= 5 && hour < 12) return `สวัสดีตอนเช้า${polite}! วันนี้พร้อมสร้างวินัยที่ดีไปด้วยกัน${politeSoft} ☀️`;
      if (hour >= 12 && hour < 17) return `สวัสดีตอนบ่าย${polite}! ลุยภารกิจช่วงบ่ายต่ออย่างมีสมาธิกัน${politeSoft} 💪`;
      if (hour >= 17 && hour < 21) return `สวัสดีตอนเย็น${polite}! มาเช็คความสำเร็จของภารกิจวันนี้กัน${politeSoft} 🌆`;
      return `ราตรีสวัสดิ์${polite}! อย่าลืมพักผ่อนให้เพียงพอ${politeSoft} 🌙`;
    }
  }

  renderHeaderGreeting() {
    const bubble = document.getElementById('secretarySpeech');
    if (bubble) {
      bubble.innerText = this.getGreeting();
    }
  }

  renderStats() {
    const completedCount = this.tasks.filter(t => t.done).length;
    const totalCount = this.tasks.length;
    const score = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    document.getElementById('disciplineScore').innerText = `${score}%`;
    document.getElementById('taskCompletedStat').innerText = `${completedCount}/${totalCount}`;
    document.getElementById('streakDaysStat').innerText = `${this.streakDays} วัน`;
    this.renderRankEvaluation();
  }

  renderRankEvaluation() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.done).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    const iconEl = document.getElementById('rankIcon');
    const titleEl = document.getElementById('rankTitle');
    const subtitleEl = document.getElementById('rankSubtitle');
    const percentText = document.getElementById('rankPercentText');
    const fillEl = document.getElementById('rankProgressFill');
    const praiseEl = document.getElementById('rankPraiseText');
    const benefitsEl = document.getElementById('rankBenefitsText');
    const adviceEl = document.getElementById('rankAdviceText');

    if (percentText) percentText.innerText = `${percent}% (${completed}/${total})`;
    if (fillEl) fillEl.style.width = `${percent}%`;

    let icon = '👑';
    let title = '';
    let subtitle = '';
    let praise = '';
    let benefits = '';
    let advice = '';

    const isSavage = this.secretaryStyle === 'savage';

    if (total === 0 || completed === 0) {
      icon = '🔥';
      title = '🔥 Unranked: พร้อมปลุกพลังยักษ์ใหญ่';
      subtitle = 'โอกาสทองในการสร้างวินัยและความสำเร็จใหม่วันนี้';
      praise = isSavage
        ? 'ยัง 0% อยู่เลยนะมึง! มัวแต่นั่งส่อง ลุกไปกดทำภารกิจแรกได้แล้วไอ้สัส!'
        : 'ได้เวลาตื่นขึ้นมาพิสูจน์ตัวเองแล้วครับเจ้านาย! วันนี้คือโอกาสทองที่จะสร้างวินัยใหม่ให้เกรียงไกร!';
      benefits = 'ปลุกไฟในตัว, เตรียมสมองให้ตื่นตัวสดชื่น';
      advice = 'กดทำภารกิจแรกตอนนี้เพื่อจุดไฟวินัยทันที!';
    } else if (percent === 100) {
      icon = '👑';
      title = '👑 S+ Rank: ระดับมหาเทพโลก (World-Class Titan)';
      subtitle = 'สถิติมหัศจรรย์เทียบชั้น Kobe Bryant & Elon Musk';
      praise = isSavage
        ? 'เชี่ยแม่งสุดยอดว่ะ! มึงทำครบ 100% เลยเหรอวะเนี่ย! วินัยระดับมหาเทพโลกตัวจริง ร่างทองถอดจิตไปเลยมึง!'
        : 'สุดยอดมากๆ ครับเจ้านาย! คุณมีสมาธิและวินัยที่ไร้เทียมทานแบบเดียวกับ Kobe Bryant และ Elon Musk! ไม่มีสิ่งใดในโลกหยุดยั้งคุณได้แล้วครับ!';
      benefits = 'สมองทรงพลังสูงสุด, โดพามีนสมดุล 100%, ประสิทธิภาพเพิ่ม 300%, ไร้ความเครียดสะสม';
      advice = 'รักษาจังหวะนี้ไว้ คุณกำลังอยู่ในสภาวะ Top 1% ของโลกอย่างแท้จริง!';
    } else if (percent >= 70) {
      icon = '🥇';
      title = '🥇 A Rank: ผู้พิชิตวินัยชั้นนำ (Discipline Master)';
      subtitle = 'ผลงานยอดเยี่ยมเกณฑ์เดียวกับนักกีฬามืออาชีพ';
      praise = isSavage
        ? 'เกือบแตก 100% แล้วไอ้เสือ! ทำได้ขนาดนี้กูก็ยอมรับในหัวใจมึงเลยว่ะ ลุยต่ออีกนิดให้สุด!'
        : 'ยอดเยี่ยมมากครับเจ้านาย! วินัยในวันนี้ของคุณเฉียบคมระดับผู้บริหารระดับสูงและนักกีฬามืออาชีพ!';
      benefits = 'ความมั่นใจสูงสุด, สมองปลอดโปร่งโฟกัสเป้าหมายใหญ่สบาย';
      advice = 'เคลียร์ภารกิจที่เหลืออีกเพียงเล็กน้อย คุณจะก้าวเข้าสู่สภาวะมหาเทพโลก S+ ทันที!';
    } else if (percent >= 50) {
      icon = '🥈';
      title = '🥈 B Rank: นักสู้ผู้มุ่งมั่น (Determined Achiever)';
      subtitle = 'ก้าวผ่านความอู้ เข้าสู่วิถีคนสำเร็จ';
      praise = isSavage
        ? 'เออดีขึ้นเยอะ! มาเกินครึ่งทางแล้วมึง อย่าเพิ่งแผ่ว ดันต่ออีกนิดดิวะ!'
        : 'ทำได้ดีมากครับเจ้านาย! เกินครึ่งทางแล้ว ความพยายามในวันนี้คือนิสัยของผู้ที่จะประสบความสำเร็จยิ่งใหญ่!';
      benefits = 'สร้างแรงเหวี่ยงความมั่นใจ, ร่างกายตื่นตัวรับพลังใหม่';
      advice = 'เพิ่มความเร่งอีกนิด เก็บภารกิจที่เหลือเพื่อยกระดับสู่เกรด A+';
    } else {
      icon = '🥉';
      title = '🥉 C Rank: ผู้เริ่มต้นปลุกพลัง (Rising Champion)';
      subtitle = 'จุดเริ่มต้นของทุกตำนานความสำเร็จ';
      praise = isSavage
        ? 'ขยับทำได้บ้างแล้วถือว่ายังดี! แต่ยังอู้เหลืออีกเยอะนะมึง ลุกขึ้นมาลุยต่อเดี๋ยวนี้!'
        : 'ก้าวแรกสำเร็จแล้วครับเจ้านาย! ก้าวเล็กๆ ที่สม่ำเสมอคือจุดเริ่มต้นของตำนานยิ่งใหญ่ทุกคน!';
      benefits = 'กระตุ้นพลังงานบวก, เริ่มเอาชนะใจตัวเอง';
      advice = 'สลัดความอู้แล้วลงมือทำภารกิจต่อไปทันทีครับ!';
    }

    if (iconEl) iconEl.innerText = icon;
    if (titleEl) titleEl.innerText = title;
    if (subtitleEl) subtitleEl.innerText = subtitle;
    if (praiseEl) praiseEl.innerText = praise;
    if (benefitsEl) benefitsEl.innerText = benefits;
    if (adviceEl) adviceEl.innerText = advice;
  }

  renderTimeline() {
    const container = document.getElementById('timelineContainer');
    if (!container) return;

    container.innerHTML = '';

    if (this.tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div style="font-weight: 600; color: #fff; margin-bottom: 6px;">ยังไม่มีรายการตารางเวลา</div>
          <div style="font-size: 13px;">กดปุ่ม <b>➕ เพิ่มภารกิจ</b> หรือ <b>📄 สรุปตาราง</b> ด้านล่างเพื่อเริ่มสร้างตารางของคุณได้เลยครับ</div>
        </div>
      `;
      this.renderStats();
      return;
    }

    const nowStr = this.getCurrentTimeString();
    const sorted = [...this.tasks].sort((a, b) => a.time.localeCompare(b.time));

    sorted.forEach(task => {
      const card = document.createElement('div');
      const isActive = task.time === nowStr && !task.done;
      const isAlarmOff = task.active === false;

      card.className = `task-card ${task.done ? 'completed' : ''} ${isActive ? 'active-now' : ''} ${isAlarmOff ? 'alarm-off' : ''}`;
      card.dataset.id = task.id;

      let tagClass = 'tag-routine';
      let tagLabel = 'ประจำวัน';
      if (task.tag === 'work') { tagClass = 'tag-work'; tagLabel = 'การงาน'; }
      else if (task.tag === 'health') { tagClass = 'tag-health'; tagLabel = 'สุขภาพ'; }
      else if (task.tag === 'discipline') { tagClass = 'tag-discipline'; tagLabel = 'วินัย'; }

      card.innerHTML = `
        <div class="time-box">
          <span class="time-val">${task.time}</span>
          <span class="time-period">น.</span>
        </div>
        <div class="task-details">
          <div class="task-title">${this.escapeHtml(task.title)}</div>
          ${task.customAlert ? `<div class="task-desc" style="color: var(--cyan);">💬 ${this.escapeHtml(task.customAlert)}</div>` : (task.desc ? `<div class="task-desc">${this.escapeHtml(task.desc)}</div>` : '')}
          <span class="task-tag ${tagClass}">${tagLabel}</span>
        </div>
        <div class="task-actions">
          <label class="switch" title="เปิด/ปิดการเตือนภารกิจนี้" style="transform: scale(0.85);">
            <input type="checkbox" ${task.active !== false ? 'checked' : ''} onchange="app.toggleTaskActive('${task.id}')">
            <span class="slider"></span>
          </label>
          <button class="icon-btn" title="แก้ไขภารกิจตลอดเวลา" style="color: #f59e0b;" onclick="app.openEditTaskModal('${task.id}')">
            ✏️
          </button>
          <button class="icon-btn speak-task-btn" title="ฟังเสียงผู้ช่วย" onclick="app.speakTask('${task.id}')">
            🗣️
          </button>
          <button class="icon-btn done-btn" title="${task.done ? 'ยกเลิก' : 'ทำเสร็จแล้ว'}" onclick="app.toggleTaskDone('${task.id}')">
            ${task.done ? '↩️' : '✅'}
          </button>
          <button class="icon-btn" title="ลบภารกิจ" style="color: var(--rose);" onclick="app.deleteTask('${task.id}')">
            🗑️
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    this.renderStats();
  }

  openEditTaskModal(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskTime').value = task.time;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskCustomAlert').value = task.customAlert || '';
    document.getElementById('editTaskDesc').value = task.desc || '';
    document.getElementById('editTaskTag').value = task.tag || 'routine';

    document.getElementById('editModal').classList.add('active');
  }

  fillEditPresetAlert(style = 'polite') {
    const title = document.getElementById('editTaskTitle').value || 'ภารกิจ';
    const alertInput = document.getElementById('editTaskCustomAlert');
    if (alertInput) {
      alertInput.value = this.generateAlertText(title, style);
    }
  }

  getCurrentTimeString() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  }

  updateLiveClock() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    
    const digitsEl = document.getElementById('liveClockDigits');
    if (digitsEl) {
      digitsEl.innerText = `${hrs}:${mins}:${secs}`;
    }

    const dateEl = document.getElementById('liveClockDate');
    if (dateEl) {
      const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      
      const dayName = days[now.getDay()];
      const dayNum = now.getDate();
      const monthName = months[now.getMonth()];
      const yearBE = now.getFullYear() + 543;
      
      dateEl.innerText = `วัน${dayName}ที่ ${dayNum} ${monthName} พ.ศ. ${yearBE}`;
    }
  }

  startScheduler() {
    this.updateLiveClock();
    setInterval(() => {
      this.updateLiveClock();

      const nowStr = this.getCurrentTimeString();
      if (nowStr !== this.lastTriggeredTime) {
        this.checkScheduleAlarms(nowStr);
        this.lastTriggeredTime = nowStr;
      }
    }, 1000);
  }

  checkScheduleAlarms(currentTimeStr) {
    if (!this.masterNotifEnabled) return;

    const matchingTasks = this.tasks.filter(t => t.time === currentTimeStr && !t.done && t.active !== false);
    matchingTasks.forEach(task => {
      const alertMessage = task.customAlert || this.generateAlertText(task.title);

      // Always send Pop-up Notification safely
      try {
        window.notificationEngine.sendNotification(
          `⏰ เตือนความจำเวลา (${task.time} น.)`,
          alertMessage,
          task.id
        );
      } catch (err) {
        console.log('Notification send error:', err);
      }

      // Trigger Thai Voice Speech ONLY if mode is 'both'
      if (this.notifMode === 'both') {
        window.secretaryAudio.speak(alertMessage);
      }

      this.renderTimeline();
    });
  }

  toggleTaskDone(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.done = !task.done;
      this.saveData();
      this.renderTimeline();

      if (task.done) {
        window.secretaryAudio.playChime();
        let doneMsg = '';
        if (this.secretaryStyle === 'savage') {
          doneMsg = `เออทำเสร็จสักทีนะมึง! ภารกิจ ${task.title} เรียบร้อยแล้ว!`;
        } else {
          const isMale = window.secretaryAudio.gender === 'male';
          const polite = isMale ? 'ครับ' : 'ค่ะ';
          doneMsg = `เยี่ยมมาก${polite}! สำเร็จภารกิจ ${task.title} เรียบร้อยแล้ว${polite}`;
        }
        const bubble = document.getElementById('secretarySpeech');
        if (bubble) bubble.innerText = doneMsg;
      }
    }
  }

  toggleTaskActive(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.active = task.active === false ? true : false;
      this.saveData();
      this.renderTimeline();
    }
  }

  deleteTask(id) {
    if (confirm('คุณต้องการลบภารกิจนี้ใช่หรือไม่?')) {
      this.tasks = this.tasks.filter(t => t.id !== id);
      this.saveData();
      this.renderTimeline();
    }
  }

  speakTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      const msg = task.customAlert || this.generateAlertText(task.title);
      this.activeSpeakingTaskId = id;
      const started = window.secretaryAudio.toggleSpeak(msg, () => {
        this.activeSpeakingTaskId = null;
        this.updateAudioButtonsUI();
      });
      if (!started) {
        this.activeSpeakingTaskId = null;
      }
      this.updateAudioButtonsUI();
    }
  }

  speakCurrentGreeting() {
    const text = document.getElementById('secretarySpeech')?.innerText || this.getGreeting();
    window.secretaryAudio.toggleSpeak(text, () => {
      this.updateAudioButtonsUI();
    });
    this.updateAudioButtonsUI();
  }

  updateAudioButtonsUI() {
    const isSpeaking = window.secretaryAudio.isSpeaking();
    
    // Greeting speak button
    const greetingBtn = document.getElementById('speakGreetingBtn');
    if (greetingBtn) {
      greetingBtn.innerText = isSpeaking && !this.activeSpeakingTaskId ? '⏹️' : '🔊';
      greetingBtn.title = isSpeaking ? 'หยุดพูดทันที' : 'ฟังเสียงผู้ช่วย';
    }

    // Rank speak button
    const rankBtn = document.getElementById('speakRankBtn');
    if (rankBtn) {
      rankBtn.innerText = isSpeaking ? '⏹️ หยุดพูด' : '🔊 ฟังผลประเมิน';
    }

    // Task card buttons
    document.querySelectorAll('.speak-task-btn').forEach(btn => {
      const card = btn.closest('.task-card');
      const taskId = card ? card.dataset.id : null;
      if (isSpeaking && this.activeSpeakingTaskId && taskId === this.activeSpeakingTaskId) {
        btn.innerText = '⏹️';
        btn.style.color = '#ef4444';
      } else {
        btn.innerText = '🗣️';
        btn.style.color = '';
      }
    });
  }

  addTask(time, title, desc, customAlert, tag) {
    const alertMsg = customAlert || this.generateAlertText(title);
    const newTask = {
      id: Date.now().toString(),
      time,
      title,
      desc,
      customAlert: alertMsg,
      active: true,
      tag: tag || 'routine',
      done: false
    };
    this.tasks.push(newTask);
    this.saveData();
    this.renderTimeline();
  }

  cleanTitleWithAI(rawSegment) {
    if (!rawSegment) return 'กิจกรรมประจำวัน';

    let cleaned = rawSegment
      .replace(/(?:อย่าลืม|อย่าอู้|ลืม|ต้อง|ให้|ช่วย|มา|ไป|อย่า|ห้าม|สาย|เด็ดขาด|สัก|หน่อย|ด้วยนะ|นะครับ|นะคะ|ครับ|ค่ะ|ว่ะ|เว้ย|สู้ๆ|อิอิ|555|เออ|อ้อ|จากนั้น|แล้วค่อย|แล้ว|ค่อย|พร้อมกับ|หลังจากนั้น)[\s]*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Intent & Keyword Extraction
    if (/ตื่น/i.test(rawSegment)) return 'ตื่นนอน';
    if (/ออกกำลังกาย|วิ่ง|ฟิตเนส|โยคะ|คาร์ดิโอ/i.test(rawSegment)) {
      if (/วิ่ง/i.test(rawSegment)) return 'ออกกำลังกาย (วิ่ง)';
      return 'ออกกำลังกาย';
    }
    if (/กินข้าว|ทานข้าว|อาหารกลางวัน|อาหารเช้า|อาหารเย็น|ทานอาหาร/i.test(rawSegment)) {
      if (/เช้า/i.test(rawSegment)) return 'ทานอาหารเช้า';
      if (/กลางวัน|เที่ยง/i.test(rawSegment)) return 'ทานอาหารกลางวัน';
      if (/เย็น|ค่ำ/i.test(rawSegment)) return 'ทานอาหารเย็น';
      return 'ทานอาหาร';
    }
    if (/ประชุม|meeting|บรีฟ|คุยงาน|มีตติ้ง/i.test(rawSegment)) {
      const topic = cleaned.replace(/ประชุม|meeting|บรีฟ|คุยงาน|มีตติ้ง|เรื่อง|กับ/gi, '').trim();
      return topic ? `ประชุม (${topic.substring(0, 18)})` : 'ประชุมงาน';
    }
    if (/ทำงาน|ปั่นงาน|ลุยงาน|เคลียร์งาน|work/i.test(rawSegment)) {
      const job = cleaned.replace(/ทำงาน|ปั่นงาน|ลุยงาน|เคลียร์งาน|work|เรื่อง/gi, '').trim();
      return job ? `ทำงาน (${job.substring(0, 18)})` : 'ทำงานประจำวัน';
    }
    if (/อ่านหนังสือ|ทบทวน|เรียน|ทำการบ้าน/i.test(rawSegment)) return 'ทบทวนบทเรียน/อ่านหนังสือ';
    if (/อาบน้ำ|แต่งตัว/i.test(rawSegment)) return 'อาบน้ำแต่งตัว';
    if (/ดื่มน้ำ|จิบน้ำ/i.test(rawSegment)) return 'ดื่มน้ำประจำวัน';
    if (/นอน|เข้านอน|พักผ่อน/i.test(rawSegment)) return 'เข้านอนพักผ่อน';
    if (/ส่งงาน|ส่งเอกสาร/i.test(rawSegment)) return 'ส่งงาน/เอกสาร';

    if (cleaned.length > 30) {
      cleaned = cleaned.substring(0, 30) + '...';
    }
    return cleaned || 'กิจกรรมประจำวัน';
  }

  summarizeTextToTable(rawText, style = this.secretaryStyle) {
    const text = rawText.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');

    const timeRegex = /(?:(\d{1,2})[:.](\d{2}))|(?:(ตี|เช้า|สาย|เที่ยง|บ่าย|เย็น|ค่ำ|ทุ่ม|ดึก)?\s*(\d{1,2})\s*(โมงเช้า|โมงเย็น|โมง|ทุ่ม|นาที|ครึ่ง)?)|(?:บ่ายโมง|เที่ยงคืน|เที่ยงวัน|เที่ยง)/g;

    let match;
    const matches = [];

    while ((match = timeRegex.exec(text)) !== null) {
      let hrs = -1;
      let mins = 0;
      const fullMatch = match[0];
      const index = match.index;

      if (match[1] !== undefined && match[2] !== undefined) {
        hrs = parseInt(match[1]);
        mins = parseInt(match[2]);
      } else if (fullMatch.includes('เที่ยงวัน') || fullMatch === 'เที่ยง') {
        hrs = 12; mins = 0;
      } else if (fullMatch.includes('เที่ยงคืน')) {
        hrs = 0; mins = 0;
      } else if (fullMatch.includes('บ่ายโมง')) {
        hrs = 13; mins = 0;
      } else if (match[4] !== undefined) {
        let num = parseInt(match[4]);
        let prefix = match[3] || '';
        let suffix = match[5] || '';
        let minsVal = fullMatch.includes('ครึ่ง') ? 30 : 0;

        if (prefix === 'ตี') {
          hrs = num;
        } else if (prefix === 'บ่าย' || suffix === 'โมงเย็น' || prefix === 'เย็น') {
          hrs = num < 12 ? num + 12 : num;
        } else if (prefix === 'ทุ่ม' || suffix === 'ทุ่ม') {
          hrs = num < 12 ? num + 18 : num;
          if (hrs >= 24) hrs = 0;
        } else if (prefix === 'ดึก') {
          hrs = num === 12 ? 0 : num;
        } else {
          hrs = num;
        }
        mins = minsVal;
      }

      if (hrs >= 0 && hrs < 24 && mins >= 0 && mins < 60) {
        const formattedTime = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        matches.push({
          time: formattedTime,
          index: index,
          endIndex: index + fullMatch.length
        });
      }
    }

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const nextIndex = (i + 1 < matches.length) ? matches[i + 1].index : text.length;

        let rawTitleSegment = text.substring(current.endIndex, nextIndex);
        
        if (!rawTitleSegment.trim() && i === 0) {
          rawTitleSegment = text.substring(0, current.index).trim();
        }

        // Apply AI Smart Intent Extraction & Cleaning
        const aiCleanTitle = this.cleanTitleWithAI(rawTitleSegment);
        const customAlert = this.generateAlertText(aiCleanTitle, style);

        this.tasks.push({
          id: (Date.now() + i).toString(),
          time: current.time,
          title: aiCleanTitle,
          desc: rawTitleSegment.trim().substring(0, 60),
          customAlert: customAlert,
          active: true,
          tag: 'discipline',
          done: false
        });
      }

      this.saveData();
      this.renderTimeline();
      alert(`✨ ระบบ AI สกัดกิจกรรมหลักเป็นตารางสำเร็จ ${matches.length} รายการเรียบร้อยครับ!`);
    } else {
      const cleanTitle = this.cleanTitleWithAI(rawText);
      this.addTask('08:00', cleanTitle, rawText, this.generateAlertText(cleanTitle, style), 'discipline');
      alert('จัดใส่ตารางเวลา 08:00 น. เรียบร้อยแล้วครับ!');
    }
  }

  renderSummaryTable() {
    const container = document.getElementById('summaryTableContainer');
    if (!container) return;

    if (this.tasks.length === 0) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
          ยังไม่มีตารางเวลาในระบบ วางข้อความด้านล่างเพื่อแปลงเป็นตารางสรุปได้เลยครับ
        </div>
      `;
      return;
    }

    const sorted = [...this.tasks].sort((a, b) => a.time.localeCompare(b.time));
    let rowsHtml = sorted.map(t => `
      <tr>
        <td style="font-weight: 700; color: var(--cyan); width: 75px;">${t.time} น.</td>
        <td style="font-weight: 600;">${this.escapeHtml(t.title)}</td>
        <td style="font-size: 12px; color: #cbd5e1;">${this.escapeHtml(t.customAlert || 'ได้เวลา ' + t.title)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="summary-table">
        <thead>
          <tr>
            <th>เวลา</th>
            <th>กิจกรรมหลัก</th>
            <th>คำพูดเตือนผู้ช่วย</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  analyzeTextToPreview(rawText, style = this.secretaryStyle) {
    const text = rawText.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
    const timeRegex = /(?:(\d{1,2})[:.](\d{2}))|(?:(ตี|เช้า|สาย|เที่ยง|บ่าย|เย็น|ค่ำ|ทุ่ม|ดึก)?\s*(\d{1,2})\s*(โมงเช้า|โมงเย็น|โมง|ทุ่ม|นาที|ครึ่ง)?)|(?:บ่ายโมง|เที่ยงคืน|เที่ยงวัน|เที่ยง)/g;

    let match;
    const matches = [];

    while ((match = timeRegex.exec(text)) !== null) {
      let hrs = -1;
      let mins = 0;
      const fullMatch = match[0];
      const index = match.index;

      if (match[1] !== undefined && match[2] !== undefined) {
        hrs = parseInt(match[1]);
        mins = parseInt(match[2]);
      } else if (fullMatch.includes('เที่ยงวัน') || fullMatch === 'เที่ยง') {
        hrs = 12; mins = 0;
      } else if (fullMatch.includes('เที่ยงคืน')) {
        hrs = 0; mins = 0;
      } else if (fullMatch.includes('บ่ายโมง')) {
        hrs = 13; mins = 0;
      } else if (match[4] !== undefined) {
        let num = parseInt(match[4]);
        let prefix = match[3] || '';
        let suffix = match[5] || '';
        let minsVal = fullMatch.includes('ครึ่ง') ? 30 : 0;

        if (prefix === 'ตี') hrs = num;
        else if (prefix === 'บ่าย' || suffix === 'โมงเย็น' || prefix === 'เย็น') hrs = num < 12 ? num + 12 : num;
        else if (prefix === 'ทุ่ม' || suffix === 'ทุ่ม') { hrs = num < 12 ? num + 18 : num; if (hrs >= 24) hrs = 0; }
        else if (prefix === 'ดึก') hrs = num === 12 ? 0 : num;
        else hrs = num;
        mins = minsVal;
      }

      if (hrs >= 0 && hrs < 24 && mins >= 0 && mins < 60) {
        matches.push({
          time: `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
          index: index,
          endIndex: index + fullMatch.length
        });
      }
    }

    this.currentPreviewItems = [];

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const nextIndex = (i + 1 < matches.length) ? matches[i + 1].index : text.length;

        let rawTitleSegment = text.substring(current.endIndex, nextIndex);
        if (!rawTitleSegment.trim() && i === 0) {
          rawTitleSegment = text.substring(0, current.index).trim();
        }

        const aiCleanTitle = this.cleanTitleWithAI(rawTitleSegment);
        const customAlert = this.generateAlertText(aiCleanTitle, style);

        this.currentPreviewItems.push({
          id: (Date.now() + i).toString(),
          time: current.time,
          title: aiCleanTitle,
          alert: customAlert
        });
      }
    } else {
      const cleanTitle = this.cleanTitleWithAI(rawText);
      this.currentPreviewItems.push({
        id: Date.now().toString(),
        time: '08:00',
        title: cleanTitle,
        alert: this.generateAlertText(cleanTitle, style)
      });
    }

    this.renderAIPreviewList();
    document.getElementById('aiInputSection').style.display = 'none';
    document.getElementById('aiPreviewSection').style.display = 'block';
  }

  renderAIPreviewList() {
    const listContainer = document.getElementById('aiPreviewList');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    this.currentPreviewItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'preview-item-card';
      card.dataset.id = item.id;
      card.innerHTML = `
        <div class="preview-item-header">
          <input type="time" class="form-input p-time" value="${item.time}">
          <input type="text" class="form-input p-title" value="${this.escapeHtml(item.title)}" placeholder="ชื่อกิจกรรม">
          <button type="button" class="del-preview-btn" onclick="app.removePreviewItem('${item.id}')" title="ลบข้อนี้">🗑️</button>
        </div>
        <div>
          <input type="text" class="form-input p-alert" value="${this.escapeHtml(item.alert)}" placeholder="คำพูดเตือนความจำ">
        </div>
      `;
      listContainer.appendChild(card);
    });
  }

  removePreviewItem(id) {
    this.currentPreviewItems = this.currentPreviewItems.filter(i => i.id !== id);
    this.renderAIPreviewList();
  }

  confirmSavePreviewAll() {
    const cards = document.querySelectorAll('#aiPreviewList .preview-item-card');
    let count = 0;

    cards.forEach(card => {
      const id = card.dataset.id;
      const timeVal = card.querySelector('.p-time')?.value;
      const titleVal = card.querySelector('.p-title')?.value;
      const alertVal = card.querySelector('.p-alert')?.value;

      if (timeVal && titleVal) {
        this.tasks.push({
          id: (Date.now() + Math.random()).toString(),
          time: timeVal,
          title: titleVal,
          desc: '',
          customAlert: alertVal || `ได้เวลา ${titleVal} แล้วครับ!`,
          active: true,
          tag: 'discipline',
          done: false
        });
        count++;
      }
    });

    if (count > 0) {
      this.saveData();
      this.renderTimeline();
      document.getElementById('importModal').classList.remove('active');
      alert(`✅ บันทึกกิจกรรมวิเคราะห์แล้ว ${count} รายการเข้าตารางเรียบร้อยครับ!`);
    } else {
      alert('ไม่มีรายการกิจกรรมสำหรับบันทึก');
    }
  }

  clearAllData() {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลตารางเตือนทั้งหมดเป็น 0 เพื่อเริ่มใส่ข้อมูลใหม่?')) {
      this.tasks = [];
      this.streakDays = 0;
      this.saveData();
      this.renderTimeline();
      alert('ล้างข้อมูลเป็น 0 เรียบร้อยแล้ว พร้อมให้คุณทดสอบใช้งานได้เลยครับ!');
    }
  }

  bindEvents() {
    // Master Switch Toggle
    document.getElementById('masterNotifSwitch')?.addEventListener('change', (e) => {
      this.masterNotifEnabled = e.target.checked;
      this.saveData();
      if (this.masterNotifEnabled) {
        window.notificationEngine.requestPermission();
        window.secretaryAudio.enableBackgroundKeepAlive();
      }
    });

    // Enable/Disable Background Lock Screen Mode Switch
    document.getElementById('backgroundModeSwitch')?.addEventListener('change', (e) => {
      this.backgroundModeEnabled = e.target.checked;
      this.saveData();
      if (this.backgroundModeEnabled) {
        window.notificationEngine.requestPermission();
        window.secretaryAudio.enableBackgroundKeepAlive();
        alert('🔒 เปิดโหมดเด้งเตือนตอนปิดจอสำเร็จ!\n\n💡 คำแนะนำสำหรับมือถือ & iPad:\n1. อนุญาต Notification แล้ว\n2. สวิตช์เสียงข้างเครื่องต้องไม่ Mute อยู่\n3. เพิ่มแอปเข้าหน้าจอหลัก (Add to Home Screen)');
      } else {
        window.secretaryAudio.disableBackgroundKeepAlive();
      }
    });

    // Step 1: Subscribe OneSignal Cloud Push Button
    document.getElementById('subscribeOneSignalBtn')?.addEventListener('click', async () => {
      try {
        if (window.OneSignal && window.OneSignal.Notifications) {
          const perm = await window.OneSignal.Notifications.requestPermission();
          await window.OneSignal.User.pushSubscription.optIn();
          const subId = window.OneSignal.User.pushSubscription.id;
          alert('✅ ลงทะเบียน iPad เข้าสู่คลาวด์สำเร็จเรียบร้อยครับ!\n\n(ID เครื่องของคุณ: ' + (subId || 'อนุมัติเรียบร้อย') + ')\n\nจากนั้นกดปุ่ม Step 2 ด้านล่างเพื่อทดสอบได้เลยครับ!');
        } else if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(async function(OneSignal) {
            const perm = await OneSignal.Notifications.requestPermission();
            await OneSignal.User.pushSubscription.optIn();
            const subId = OneSignal.User.pushSubscription.id;
            alert('✅ ลงทะเบียน iPad เข้าสู่คลาวด์สำเร็จเรียบร้อยครับ!\n\n(ID เครื่องของคุณ: ' + (subId || 'อนุมัติเรียบร้อย') + ')\n\nจากนั้นกดปุ่ม Step 2 ด้านล่างเพื่อทดสอบได้เลยครับ!');
          });
        } else {
          alert('OneSignal SDK กำลังโหลด กรุณาลองใหม่อีกครั้งใน 3 วินาที');
        }
      } catch(err) {
        alert('⚠️ เกิดข้อผิดพลาดในการลงทะเบียน: ' + err.message);
      }
    });

    // Step 2: Instant Cloud Push Test Button
    document.getElementById('testCloudPushBtn')?.addEventListener('click', () => {
      window.notificationEngine.sendInstantCloudPush(
        '🔔 ทดสอบเด้งเตือนคลาวด์ลง iPad!',
        'สัญญาณเตือนทดสอบยิงตรงลงหน้าจอ iPad ขณะพับปิดหน้าจอครับ'
      );
    });

    // Auto-sync & trigger alarms when waking up screen / unlocking phone
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateLiveClock();
        const nowStr = this.getCurrentTimeString();
        this.checkScheduleAlarms(nowStr);
      }
    });

    // Notif Mode Toggle Buttons
    document.getElementById('modeSilentBtn')?.addEventListener('click', () => {
      this.notifMode = 'silent';
      this.saveData();
      this.updateSettingsUI();
    });

    document.getElementById('modeBothBtn')?.addEventListener('click', () => {
      this.notifMode = 'both';
      this.saveData();
      this.updateSettingsUI();
      window.notificationEngine.requestPermission();
      window.secretaryAudio.speak('เปิดโหมดเด้งการแจ้งเตือนพร้อมเสียงพูดเรียบร้อยแล้วครับ');
    });

    // Style Selector Buttons
    document.getElementById('stylePoliteBtn')?.addEventListener('click', () => {
      this.secretaryStyle = 'polite';
      this.saveData();
      this.updateVoiceUI();
      this.updateSettingsUI();
      this.renderHeaderGreeting();
      this.speakCurrentGreeting();
    });

    document.getElementById('styleSavageBtn')?.addEventListener('click', () => {
      this.secretaryStyle = 'savage';
      this.saveData();
      this.updateVoiceUI();
      this.updateSettingsUI();
      this.renderHeaderGreeting();
      this.speakCurrentGreeting();
    });

    // Toggle Voice Gender (Male / Female)
    document.getElementById('toggleVoiceBtn')?.addEventListener('click', () => {
      const newGender = window.secretaryAudio.gender === 'male' ? 'female' : 'male';
      window.secretaryAudio.setGender(newGender);
      this.updateVoiceUI();
      this.renderHeaderGreeting();
      this.speakCurrentGreeting();
    });

    // Speak Greeting Button
    document.getElementById('speakGreetingBtn')?.addEventListener('click', () => {
      this.speakCurrentGreeting();
    });

    // Speak Rank Evaluation Button
    document.getElementById('speakRankBtn')?.addEventListener('click', () => {
      const title = document.getElementById('rankTitle')?.innerText || '';
      const praise = document.getElementById('rankPraiseText')?.innerText || '';
      const advice = document.getElementById('rankAdviceText')?.innerText || '';
      const fullSpeech = `${title} ... ${praise} ... คำแนะนำระดับโลก: ${advice}`;
      window.secretaryAudio.toggleSpeak(fullSpeech, () => {
        this.updateAudioButtonsUI();
      });
      this.updateAudioButtonsUI();
    });

    // Modal Triggers
    document.getElementById('openAddModalBtn')?.addEventListener('click', () => {
      document.getElementById('addModal').classList.add('active');
    });

    document.getElementById('closeAddModalBtn')?.addEventListener('click', () => {
      document.getElementById('addModal').classList.remove('active');
    });

    document.getElementById('openRankModalBtn')?.addEventListener('click', () => {
      this.renderRankEvaluation();
      document.getElementById('rankModal').classList.add('active');
    });

    document.getElementById('closeRankModalBtn')?.addEventListener('click', () => {
      document.getElementById('rankModal').classList.remove('active');
    });

    document.getElementById('closeEditModalBtn')?.addEventListener('click', () => {
      document.getElementById('editModal').classList.remove('active');
    });

    // Edit Task Form Submit
    document.getElementById('editTaskForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('editTaskId').value;
      const time = document.getElementById('editTaskTime').value;
      const title = document.getElementById('editTaskTitle').value;
      const customAlert = document.getElementById('editTaskCustomAlert').value;
      const desc = document.getElementById('editTaskDesc').value;
      const tag = document.getElementById('editTaskTag').value;

      const task = this.tasks.find(t => t.id === id);
      if (task) {
        task.time = time;
        task.title = title;
        task.customAlert = customAlert || this.generateAlertText(title);
        task.desc = desc;
        task.tag = tag;
        
        this.saveData();
        this.renderTimeline();
        document.getElementById('editModal').classList.remove('active');
        alert('✏️ บันทึกการแก้ไขภารกิจเรียบร้อยแล้วครับ!');
      }
    });

    document.getElementById('openSummarizerModalBtn')?.addEventListener('click', () => {
      this.renderSummaryTable();
      document.getElementById('summarizerModal').classList.add('active');
    });

    document.getElementById('closeSummarizerModalBtn')?.addEventListener('click', () => {
      document.getElementById('summarizerModal').classList.remove('active');
    });

    document.getElementById('openImportModalBtn')?.addEventListener('click', () => {
      document.getElementById('aiInputSection').style.display = 'block';
      document.getElementById('aiPreviewSection').style.display = 'none';
      document.getElementById('importModal').classList.add('active');
    });

    document.getElementById('closeImportModalBtn')?.addEventListener('click', () => {
      document.getElementById('importModal').classList.remove('active');
    });

    // Generate Visual Summary Table Button in Modal 1
    document.getElementById('generateVisualSummaryBtn')?.addEventListener('click', () => {
      const text = document.getElementById('summarizerText')?.value;
      if (text) {
        this.summarizeTextToTable(text);
        document.getElementById('summarizerText').value = '';
      }
      this.renderSummaryTable();
    });

    // AI Start Analyze Button in Modal 2
    document.getElementById('startAnalyzeBtn')?.addEventListener('click', () => {
      const rawText = document.getElementById('importRawText')?.value;
      const style = document.getElementById('importStyleSelect')?.value || this.secretaryStyle;
      if (rawText) {
        this.analyzeTextToPreview(rawText, style);
      } else {
        alert('กรุณาวางข้อความก่อนกดวิเคราะห์สกัดครับ');
      }
    });

    // Back to Input Button in Modal 2
    document.getElementById('backToInputBtn')?.addEventListener('click', () => {
      document.getElementById('aiInputSection').style.display = 'block';
      document.getElementById('aiPreviewSection').style.display = 'none';
    });

    // Confirm Save All Button in Modal 2
    document.getElementById('confirmSaveAllBtn')?.addEventListener('click', () => {
      this.confirmSavePreviewAll();
    });

    // Add Task Form Submit
    document.getElementById('addTaskForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const time = document.getElementById('taskTime').value;
      const title = document.getElementById('taskTitle').value;
      const desc = document.getElementById('taskDesc').value;
      const customAlert = document.getElementById('taskCustomAlert').value;
      const tag = document.getElementById('taskTag').value;

      if (time && title) {
        this.addTask(time, title, desc, customAlert, tag);
        document.getElementById('addTaskForm').reset();
        document.getElementById('addModal').classList.remove('active');
      }
    });

    // Clear All Data Button
    document.getElementById('clearAllDataBtn')?.addEventListener('click', () => {
      this.clearAllData();
    });
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(reg => {
        console.log('Service Worker Registered:', reg);
      }).catch(err => console.log('Service Worker Error:', err));
    }
  }

  escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new DisciplineApp();
});

