// ========================================
// Arduino 4WD + Su Pompası Kontrol Sistemi
// PS Kontrolcü Mantığı + Basılı Tutma
// 2 Motor Sürücü Yapılandırması
// ========================================

#include <Arduino.h>

// ========================================
// PS KONTROLCÜ KOMUT TANIMLARI
// ========================================
#define FORWARD    'F'   // İleri basılı = git, bırakılı = dur
#define BACKWARD   'B'   // Geri basılı = git, bırakılı = dur
#define LEFT       'L'   // Sol basılı = dön, bırakılı = dur
#define RIGHT      'R'   // Sağ basılı = dön, bırakılı = dur
#define CIRCLE     'C'   // Park Sensörü Aç/Kapat
#define CROSS      'X'   // Acil Dur
#define TRIANGLE   'T'   // Farlar Aç/Kapat Toggle
#define SQUARE     'S'   // Status Bilgisi Göster
#define START      'A'   // Sistem Başlat
#define PAUSE      'P'   // Su Pompası

// ========================================
// PIN TANIMLARI
// ========================================
#define trigPin          3
#define echoPin          4
#define buzzerPin        8
#define buzzer2Pin       2
#define whiteLedPin      13
#define redLedPin        7
#define waterLevelPin    A0

// MOTOR SÜRÜCÜ 1 (Sol ve Sağ Motorlar)
#define solIN1           5    // Sol motorlar ileri
#define solIN2           6    // Sol motorlar geri
#define sagIN1           9    // Sağ motorlar ileri
#define sagIN2           10   // Sağ motorlar geri

// MOTOR SÜRÜCÜ 2 (Su Pompası)
#define pompaIN1         11   // Pompa ileri
#define pompaIN2         12   // Pompa geri

// RGB LED
#define rgbRed           A1
#define rgbGreen         A2
#define rgbBlue          A3

// ========================================
// TIMEOUT AYARI (milisaniye)
// Uygulama buton basılı tutarken her 50-100ms'de
// komut gönderiyorsa, bu değer 150-200 olmalı
// ========================================
#define MOTOR_TIMEOUT_MS 200

// ========================================
// GLOBAL DEĞİŞKENLER
// ========================================
bool parkSensorActive = false;
bool farlariAcik      = false;
bool sistemAktif      = false;
bool pompaBasla       = false;

// Motor durumları
bool ileriGidiyor     = false;
bool geriGidiyor      = false;
bool solaDonuyor      = false;
bool sagaDonuyor      = false;

// Son motor komutunun alındığı zaman (timeout için)
unsigned long sonMotorKomutZamani = 0;

// ========================================
// SETUP
// ========================================
void setup() {
  Serial.begin(9600);

  // Sensör pinleri
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(buzzer2Pin, OUTPUT);
  pinMode(whiteLedPin, OUTPUT);
  pinMode(redLedPin, OUTPUT);
  pinMode(waterLevelPin, INPUT);
  
  // Motor Sürücü 1 pinleri
  pinMode(solIN1, OUTPUT);
  pinMode(solIN2, OUTPUT);
  pinMode(sagIN1, OUTPUT);
  pinMode(sagIN2, OUTPUT);
  
  // Motor Sürücü 2 pinleri
  pinMode(pompaIN1, OUTPUT);
  pinMode(pompaIN2, OUTPUT);
  
  // RGB LED pinleri
  pinMode(rgbRed, OUTPUT);
  pinMode(rgbGreen, OUTPUT);
  pinMode(rgbBlue, OUTPUT);

  // Başlangıç ayarları
  tumMotorlariDurdur();
  pompayiDurdur();
  farlariKapat();
  kornaKapat();
  setRGB(0, 0, 0);

  Serial.println("========================================");
  Serial.println("  4WD ARABA - PS KONTROLCÜ SİSTEMİ");
  Serial.println("  BASILI TUTMA MOD - TIMEOUT KORUMASIZ");
  Serial.println("========================================");
  Serial.println("  F = İleri (basılı = git)");
  Serial.println("  B = Geri (basılı = git)");
  Serial.println("  L = Sol (basılı = dön)");
  Serial.println("  R = Sağ (basılı = dön)");
  Serial.println("  X = Acil Dur");
  Serial.println("  P = Su Pompası (basılı = çalış)");
  Serial.println("  A = Sistem Başlat");
  Serial.println("  ? = Yardım");
  Serial.println("========================================\n");
}

// ========================================
// RGB LED KONTROL
// ========================================
void setRGB(int r, int g, int b) {
  analogWrite(rgbRed, r);
  analogWrite(rgbGreen, g);
  analogWrite(rgbBlue, b);
}

// ========================================
// MESAFE ÖLÇÜMÜ
// ========================================
long getMesafe() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  return pulseIn(echoPin, HIGH) * 0.034 / 2;
}

// ========================================
// BİP SESİ
// ========================================
void bip(int beklemeSuresi) {
  digitalWrite(buzzerPin, HIGH);
  delay(60);
  digitalWrite(buzzerPin, LOW);
  delay(beklemeSuresi);
}

// ========================================
// MOTOR KONTROL - TÜM MOTORLARI DURDUR
// ========================================
void tumMotorlariDurdur() {
  digitalWrite(solIN1, LOW);
  digitalWrite(solIN2, LOW);
  digitalWrite(sagIN1, LOW);
  digitalWrite(sagIN2, LOW);
  
  ileriGidiyor = false;
  geriGidiyor = false;
  solaDonuyor = false;
  sagaDonuyor = false;
}

// Timeout kontrolü - son komuttan bu yana MOTOR_TIMEOUT_MS geçtiyse durdur
void checkMotorTimeout() {
  if (ileriGidiyor || geriGidiyor || solaDonuyor || sagaDonuyor) {
    unsigned long gecenSure = millis() - sonMotorKomutZamani;
    if (gecenSure >= MOTOR_TIMEOUT_MS) {
      tumMotorlariDurdur();
    }
  }
}

// Motor komutları çalışır - timeout için zaman kaydı
void motorKomutAlindi() {
  sonMotorKomutZamani = millis();
}

// ========================================
// İLERİ KONTROL
// ========================================
void ileriBasla() {
  digitalWrite(solIN1, HIGH);
  digitalWrite(solIN2, LOW);
  digitalWrite(sagIN1, HIGH);
  digitalWrite(sagIN2, LOW);
  
  ileriGidiyor = true;
  geriGidiyor = false;
  solaDonuyor = false;
  sagaDonuyor = false;
  
  motorKomutAlindi();
  Serial.println("→ İLERİ");
}

void ileriDurdur() {
  if (ileriGidiyor) {
    tumMotorlariDurdur();
    Serial.println("→ İLERİ DURDU");
  }
}

// ========================================
// GERİ KONTROL
// ========================================
void geriBasla() {
  digitalWrite(solIN1, LOW);
  digitalWrite(solIN2, HIGH);
  digitalWrite(sagIN1, LOW);
  digitalWrite(sagIN2, HIGH);
  
  geriGidiyor = true;
  ileriGidiyor = false;
  solaDonuyor = false;
  sagaDonuyor = false;
  
  motorKomutAlindi();
  Serial.println("← GERİ");
}

void geriDurdur() {
  if (geriGidiyor) {
    tumMotorlariDurdur();
    Serial.println("← GERİ DURDU");
  }
}

// ========================================
// SOL DÖN KONTROL
// ========================================
void solaBasla() {
  // Sol motorlar dur, sağ motorlar ileri
  digitalWrite(solIN1, LOW);
  digitalWrite(solIN2, LOW);
  digitalWrite(sagIN1, HIGH);
  digitalWrite(sagIN2, LOW);
  
  solaDonuyor = true;
  sagaDonuyor = false;
  ileriGidiyor = false;
  geriGidiyor = false;
  
  motorKomutAlindi();
  Serial.println("↶ SOL");
}

void solaDurdur() {
  if (solaDonuyor) {
    tumMotorlariDurdur();
    Serial.println("↶ SOL DURDU");
  }
}

// ========================================
// SAĞ DÖN KONTROL
// ========================================
void sagaBasla() {
  // Sol motorlar ileri, sağ motorlar dur
  digitalWrite(solIN1, HIGH);
  digitalWrite(solIN2, LOW);
  digitalWrite(sagIN1, LOW);
  digitalWrite(sagIN2, LOW);
  
  sagaDonuyor = true;
  solaDonuyor = false;
  ileriGidiyor = false;
  geriGidiyor = false;
  
  motorKomutAlindi();
  Serial.println("↷ SAĞ");
}

void sagaDurdur() {
  if (sagaDonuyor) {
    tumMotorlariDurdur();
    Serial.println("↷ SAĞ DURDU");
  }
}

// ========================================
// SU POMPASI KONTROL
// ========================================
void pompaAc() {
  digitalWrite(pompaIN1, HIGH);
  digitalWrite(pompaIN2, LOW);
  pompaBasla = true;
  Serial.println("💧 POMPA BAŞLADI");
}

void pompayiDurdur() {
  digitalWrite(pompaIN1, LOW);
  digitalWrite(pompaIN2, LOW);
  pompaBasla = false;
  Serial.println("💧 POMPA DURDU");
}

// ========================================
// ACİL DUR (CROSS Butonu)
// ========================================
void acilDur() {
  tumMotorlariDurdur();
  pompayiDurdur();
  noTone(buzzerPin);
  parkSensorActive = false;
  setRGB(255, 0, 0);
  Serial.println("⚠️ ACİL DUR!");
  
  for (int i = 0; i < 3; i++) {
    tone(buzzerPin, 1500);
    delay(150);
    noTone(buzzerPin);
    delay(100);
  }
  setRGB(0, 0, 0);
}

// ========================================
// IŞIKLAR (TRIANGLE Butonu - Toggle)
// ========================================
void farlariAc() {
  digitalWrite(whiteLedPin, HIGH);
  digitalWrite(redLedPin, HIGH);
  farlariAcik = true;
  Serial.println("💡 Farlar AÇ");
}

void farlariKapat() {
  digitalWrite(whiteLedPin, LOW);
  digitalWrite(redLedPin, LOW);
  farlariAcik = false;
  Serial.println("💡 Farlar KAPAT");
}

void farlariToggle() {
  if (farlariAcik) farlariKapat();
  else farlariAc();
}

// ========================================
// KORNA
// ========================================
void kornaAc()    { digitalWrite(buzzer2Pin, HIGH); }
void kornaKapat() { digitalWrite(buzzer2Pin, LOW);  }

// ========================================
// PARK SENSÖRÜ (CIRCLE Butonu - Toggle)
// ========================================
void processParkSensor() {
  if (!parkSensorActive) {
    noTone(buzzerPin);
    digitalWrite(buzzerPin, LOW);
    setRGB(0, 0, 0);
    return;
  }
  
  long mesafe = getMesafe();
  
  if (mesafe < 5) {
    setRGB(255, 0, 0);
    tone(buzzerPin, 1000);
  } else if (mesafe < 25) {
    noTone(buzzerPin); setRGB(255, 127, 0); bip(100);
  } else if (mesafe < 35) {
    noTone(buzzerPin); setRGB(255, 255, 0); bip(200);
  } else if (mesafe < 45) {
    noTone(buzzerPin); setRGB(0, 255, 0);   bip(300);
  } else if (mesafe < 55) {
    noTone(buzzerPin); setRGB(0, 255, 255); bip(500);
  } else {
    noTone(buzzerPin); setRGB(0, 0, 255);   bip(800);
  }
  delay(200);
}

// ========================================
// STATUS BİLGİSİ (SQUARE Butonu)
// ========================================
void statusBilgisi() {
  int sv = analogRead(waterLevelPin);
  long mesafe = getMesafe();
  
  Serial.println("\n╔════════════════════════════════════╗");
  Serial.println("║         DURUM BİLGİSİ              ║");
  Serial.println("╠════════════════════════════════════╣");
  Serial.print("║ Sistem      : "); 
  Serial.print(sistemAktif ? "AKTİF  " : "PASİF  ");
  Serial.println("          ║");
  
  Serial.print("║ Farlar      : "); 
  Serial.print(farlariAcik ? "AÇ     " : "KAPALI ");
  Serial.println("          ║");
  
  Serial.print("║ Park Sensör : "); 
  Serial.print(parkSensorActive ? "AÇ     " : "KAPALI ");
  Serial.println("          ║");
  
  Serial.print("║ Pompa       : "); 
  Serial.print(pompaBasla ? "ÇALIŞIYOR" : "DURDU    ");
  Serial.println("   ║");
  
  Serial.print("║ Su Seviyesi : ");
  Serial.print(sv);
  Serial.print("      ");
  Serial.println("  ║");
  
  Serial.print("║ Mesafe      : ");
  Serial.print(mesafe);
  Serial.print(" cm");
  Serial.println("            ║");
  Serial.println("╚════════════════════════════════════╝\n");
}

// ========================================
// YARDIM EKRANI
// ========================================
void printYardim() {
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║      PS KONTROLCÜ KOMUT LİSTESİ       ║");
  Serial.println("╠════════════════════════════════════════╣");
  Serial.println("║  YÖN KONTROL (BASILI TUTMA):            ║");
  Serial.println("║  F = İleri Git (basılı = harekete)     ║");
  Serial.println("║  B = Geri Git (basılı = harekete)      ║");
  Serial.println("║  L = Sol Dön (basılı = harekete)        ║");
  Serial.println("║  R = Sağ Dön (basılı = harekete)        ║");
  Serial.println("╠════════════════════════════════════════╣");
  Serial.println("║  SU POMPASI:                            ║");
  Serial.println("║  P = Pompa (basılı = çalış)             ║");
  Serial.println("╠════════════════════════════════════════╣");
  Serial.println("║  PS BUTONLARI:                          ║");
  Serial.println("║  X = Acil Dur (Çarpı)                  ║");
  Serial.println("║  T = Farlar Aç/Kapat (Üçgen)           ║");
  Serial.println("║  C = Park Sensörü Aç/Kapat (Daire)    ║");
  Serial.println("║  S = Durum Bilgisi (Kare)              ║");
  Serial.println("║  A = Sistem Başlat (Start)              ║");
  Serial.println("╠════════════════════════════════════════╣");
  Serial.println("║  MANUEL:                                ║");
  Serial.println("║  H = Korna Aç                          ║");
  Serial.println("║  h = Korna Kapat                       ║");
  Serial.println("║  M = Su Seviyesi Oku                   ║");
  Serial.println("║  D = Mesafe Oku                        ║");
  Serial.println("║  ? = Bu Yardım Ekranı                   ║");
  Serial.println("╚════════════════════════════════════════╝\n");
}

// ========================================
// KOMUT İŞLEYİCİ (ANA FONKSİYON)
// ========================================
void executeCommand(char command) {
  switch (command) {
    
    // ══════════════════════════════════════
    // YÖN KONTROL - BASILI TUTMA
    // ══════════════════════════════════════
    
    case FORWARD:   // 'F'
      if (!sistemAktif) {
        Serial.println("⚠️ Sistem kapalı! 'A' ile başlat.");
        break;
      }
      ileriBasla();
      break;
    
    case BACKWARD:  // 'B'
      if (!sistemAktif) {
        Serial.println("⚠️ Sistem kapalı! 'A' ile başlat.");
        break;
      }
      geriBasla();
      break;
    
    case LEFT:      // 'L'
      if (!sistemAktif) {
        Serial.println("⚠️ Sistem kapalı! 'A' ile başlat.");
        break;
      }
      solaBasla();
      break;
    
    case RIGHT:     // 'R'
      if (!sistemAktif) {
        Serial.println("⚠️ Sistem kapalı! 'A' ile başlat.");
        break;
      }
      sagaBasla();
      break;
    
    // ══════════════════════════════════════
    // SU POMPASI - BASILI TUTMA
    // ══════════════════════════════════════
    
    case PAUSE:     // 'P'
      pompaAc();
      break;
    
    // ══════════════════════════════════════
    // PS BUTONLARI
    // ══════════════════════════════════════
    
    case CROSS:     // 'X'
      acilDur();
      break;
    
    case TRIANGLE:  // 'T'
      farlariToggle();
      break;
    
    case CIRCLE:    // 'C'
      parkSensorActive = !parkSensorActive;
      if (!parkSensorActive) {
        noTone(buzzerPin);
        setRGB(0, 0, 0);
      }
      Serial.println(parkSensorActive ? "🅿️ Park Sensörü AÇ" : "🅿️ Park Sensörü KAPAT");
      break;
    
    case SQUARE:    // 'S'
      statusBilgisi();
      break;
    
    case START:     // 'A'
      sistemAktif = true;
      Serial.println("▶️ SİSTEM BAŞLATILDI!");
      setRGB(0, 255, 0);
      delay(300);
      setRGB(0, 0, 0);
      break;
    
    // ══════════════════════════════════════
    // MANUEL KOMUTLAR
    // ══════════════════════════════════════
    
    case 'H': kornaAc();    break;
    case 'h': kornaKapat(); break;
    case 'W': farlariAc();  break;
    case 'w': farlariKapat(); break;
    
    case 'M': case 'm': {
      int sv = analogRead(waterLevelPin);
      Serial.print("💧 Su Seviyesi: ");
      Serial.print(sv);
      Serial.println("/1023");
      break;
    }
    
    case 'D': case 'd': {
      long m = getMesafe();
      Serial.print("📏 Mesafe: ");
      Serial.print(m);
      Serial.println(" cm");
      break;
    }
    
    case '?':
      printYardim();
      break;
    
    default:
      break;
  }
}

// ========================================
// MAIN LOOP
// ========================================
void loop() {
  // Serial komut oku ve işle
  if (Serial.available()) {
    char command = Serial.read();
    executeCommand(command);
  }
  
  // Motor timeout kontrolü
  checkMotorTimeout();
  
  // Park sensörü
  processParkSensor();
  
  delay(10);
}
