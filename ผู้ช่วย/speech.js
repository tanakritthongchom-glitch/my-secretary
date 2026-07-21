// Speech & Audio Engine for Secretary Assistant

class AudioSecretary {
  constructor() {
    this.synth = window.speechSynthesis;
    this.gender = localStorage.getItem('secretary_gender') || 'female'; // Default to female
    this.audioCtx = null;
    this.currentAudio = null;
    this.isSpeakingState = false;
    this.activeUtterance = null;
    this.onStateChange = null;
    this.keepAliveAudio = null;
    this.initVoices();
  }

  enableBackgroundKeepAlive() {
    try {
      if (!this.keepAliveAudio) {
        // 1-second Silent WAV base64 loop
        const silentUri = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        this.keepAliveAudio = new Audio(silentUri);
        this.keepAliveAudio.loop = true;
      }
      
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: '🔒 ผู้ช่วยส่วนตัว (โหมดเตือนขณะพับจอ)',
          artist: 'Personal Secretary Master Alarm',
          album: 'Discipline Secretary'
        });
        navigator.mediaSession.setActionHandler('play', () => { this.keepAliveAudio.play(); });
        navigator.mediaSession.setActionHandler('pause', () => { this.keepAliveAudio.pause(); });
      }

      this.keepAliveAudio.play().then(() => {
        console.log('Background Keep-Alive Audio active for lock screen alarms');
      }).catch(err => console.log('Keep-alive play error (needs user interaction):', err));
    } catch (e) {
      console.log('Keep-alive error:', e);
    }
  }

  disableBackgroundKeepAlive() {
    if (this.keepAliveAudio) {
      this.keepAliveAudio.pause();
    }
  }

  setGender(gender) {
    this.gender = gender;
    localStorage.setItem('secretary_gender', gender);
  }

  formatTextForGender(text) {
    if (this.gender === 'male') {
      return text
        .replace(/นะคะ/g, 'นะครับ')
        .replace(/ค่ะ/g, 'ครับ')
        .replace(/เจ้านายคะ/g, 'เจ้านายครับ');
    } else {
      return text
        .replace(/นะครับ/g, 'นะคะ')
        .replace(/ครับ/g, 'ค่ะ')
        .replace(/เจ้านายครับ/g, 'เจ้านายคะ');
    }
  }

  initVoices() {
    if (!this.synth) return;
    const findVoices = () => {
      const allVoices = this.synth.getVoices();
      const thaiVoices = allVoices.filter(v => 
        (v.lang && (v.lang.toLowerCase().includes('th') || v.lang.toLowerCase().includes('th-th'))) ||
        (v.name && (v.name.includes('Thai') || v.name.includes('Premwadee') || v.name.includes('Pattara') || v.name.includes('Kanya')))
      );
      
      this.maleVoice = thaiVoices.find(v => v.name.includes('Pattara') || v.name.toLowerCase().includes('male'));
      this.femaleVoice = thaiVoices.find(v => v.name.includes('Premwadee') || v.name.includes('Kanya') || v.name.toLowerCase().includes('female'));
      this.defaultVoice = thaiVoices[0] || null;
    };

    findVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findVoices;
    }
  }

  playChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      const freq1 = this.gender === 'male' ? 523.25 : 659.25;
      const freq2 = this.gender === 'male' ? 783.99 : 987.77;

      osc1.frequency.setValueAtTime(freq1, now);
      osc2.frequency.setValueAtTime(freq2, now + 0.12);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.12);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.log('Audio Context error:', e);
    }
  }

  isSpeaking() {
    return this.isSpeakingState || (this.synth && this.synth.speaking) || (this.currentAudio && !this.currentAudio.paused);
  }

  stop() {
    this.isSpeakingState = false;
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (this.onStateChange) {
      this.onStateChange(false);
    }
  }

  speak(text, onEndCallback = null) {
    this.stop();
    this.playChime();
    const formattedText = this.formatTextForGender(text);
    this.isSpeakingState = true;

    if (this.onStateChange) {
      this.onStateChange(true);
    }

    const finish = () => {
      this.isSpeakingState = false;
      if (this.onStateChange) this.onStateChange(false);
      if (onEndCallback) onEndCallback();
    };

    setTimeout(() => {
      if (!this.isSpeakingState) return;

      if (this.synth) {
        const allVoices = this.synth.getVoices();
        const thaiVoices = allVoices.filter(v => 
          (v.lang && (v.lang.toLowerCase().includes('th') || v.lang.toLowerCase().includes('th-th'))) ||
          (v.name && (v.name.includes('Thai') || v.name.includes('Premwadee') || v.name.includes('Pattara') || v.name.includes('Kanya')))
        );

        const male = thaiVoices.find(v => v.name.includes('Pattara') || v.name.toLowerCase().includes('male'));
        const female = thaiVoices.find(v => v.name.includes('Premwadee') || v.name.includes('Kanya') || v.name.toLowerCase().includes('female'));
        const targetVoice = this.gender === 'male' ? (male || thaiVoices[0]) : (female || thaiVoices[0]);

        if (targetVoice) {
          this.synth.cancel();
          const utterance = new SpeechSynthesisUtterance(formattedText);
          utterance.lang = 'th-TH';
          utterance.voice = targetVoice;
          utterance.rate = 1.0;
          utterance.pitch = this.gender === 'male' ? (male ? 0.8 : 0.4) : 1.0;

          utterance.onend = finish;
          utterance.onerror = finish;
          this.activeUtterance = utterance;
          this.synth.speak(utterance);
          return;
        }
      }

      // Online High-Quality Fallback
      const cleanText = formattedText.substring(0, 200);
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=th&client=tw-ob`;
      this.currentAudio = new Audio(ttsUrl);
      this.currentAudio.playbackRate = 1.0;
      this.currentAudio.onended = finish;
      this.currentAudio.onerror = finish;
      this.currentAudio.play().catch(err => {
        console.log('Fallback audio error:', err);
        finish();
      });
    }, 300);
  }

  toggleSpeak(text, onEndCallback = null) {
    if (this.isSpeaking()) {
      this.stop();
      return false; // Stopped
    } else {
      this.speak(text, onEndCallback);
      return true; // Started
    }
  }
}

window.secretaryAudio = new AudioSecretary();


