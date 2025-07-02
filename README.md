# VelaMare - İnteraktif Okyanus Macerası 🌊

Three.js ve TypeScript ile geliştirilmiş sürükleyici 3D okyanus keşif deneyimi. Gerçekçi speedboat fiziği ile geniş sularda gezinin, zengin deniz yaşamını keşfedin ve göksel unsurlarla dinamik gündüz/gece döngülerini yaşayın.

## ✨ Özellikler

### 🚤 **Gerçekçi Tekne Fiziği**
- **İtki tabanlı tahrik sistemi** - Motor gücü ile ileri/geri hareket kontrolü
- **Hıza bağlı direksiyon sistemi** - Gerçekçi dönüş fiziği (düşük hızda zor, yüksek hızda duyarlı)
- **Dinamik su direnci** - Yüksek hızlarda gövde direnci ve dalga etkileri
- **Fizik tabanlı animasyonlar** - Dönüşlerde yatma, hızlanma/frenleme sırasında sallanma
- **256x256 keşif alanı** - Keşfedilecek geniş okyanus

### 🌅 **Dinamik Gün/Gece Sistemi**
- **Gerçek zamanlı ışık geçişleri** - Pürüzsüz gün/gece döngüsü değişimi
- **Uyarlanabilir gökyüzü yönetimi** - Dinamik gökyüzü renkleri ve atmosfer
- **Göksel unsurlar** - Kendi etrafında dönen gerçekçi ay ve 2000+ yıldız
- **Otomatik materyal ayarları** - Tekne ve deniz yaşamı ışık koşullarına uyum sağlar

### 🐠 **Zengin Deniz Ekosistemi**
- **110+ balık örneği** 3 tür boyunca benzersiz davranışlarla
- **Akıllı AI hareketi** - Balıklar tekneden kaçınır, gerçekçi yüzme kalıpları izler
- **Derinlik tabanlı dağılım** - Farklı türler çeşitli su derinliklerinde
- **Çarpışma kaçınma** - Balıklar çevreyle doğal etkileşim kurar

### 🎮 **Sezgisel Kontroller**
- **WASD/Yön Tuşları** - Gerçekçi fizikle tekne hareketi
- **Pürüzsüz kamera sistemi** - Organik sallanmalı dinamik takip
- **Sınır zorlaması** - Görünmez bariyerler oyun alanını korur
- **Hız göstergesi** - Gerçek zamanlı hareket geribildirimi ve debug bilgisi

### 🌊 **Gelişmiş Su Simülasyonu**
- **Gerçekçi yüzme hareketi** - Tekne suda doğal olarak sallanır
- **Su yüzeyi etkileşimleri** - Doğru derinlik hesaplamaları
- **Dalga direnci etkileri** - Yüksek hızda dalga dinamikleri

### 🎨 **Modern UI/UX**
- **Karanlık mod değiştirici** - Sorunsuz gün/gece geçişi
- **Kontrol bilgi gösterimi** - Otomatik solan talimat kaplamı
- **Duyarlı tasarım** - Farklı ekran boyutlarına uyum sağlar
- **Temiz, minimal arayüz** - Deneyime odaklanma

## 🚀 Hızlı Başlangıç

### Ön Gereksinimler
- Node.js (v18 veya üzeri)
- npm veya yarn
- WebGL destekli modern tarayıcı

### Kurulum

1. Depoyu klonlayın:
```bash
git clone <https://github.com/Efe184/VelaMare.git>
cd VelaMare
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

4. Tarayıcınızı açın ve `http://localhost:3000` adresine gidin

## 🎮 Kontroller

### Tekne Navigasyonu
- **W / ↑** - İleri 
- **S / ↓** - Geri   
- **A / ←** - Sola dönüş (hıza bağlı etkinlik)
- **D / →** - Sağa dönüş (hıza bağlı etkinlik)
- **Kombinasyonlar** - Hareket halindeyken gerçekçi dönüş için W+A/D

### Arayüz
- **Karanlık Mod Değiştirici** - Sağ üst köşe düğmesi
- **Otomatik Solan Kontroller** - Talimatlar alışkanlık sonrası kaybolur

## 🛠️ Geliştirme

### Mevcut Komutlar

- `npm run dev` - Hot reload ile geliştirme sunucusunu başlat
- `npm run build` - Üretim için derle
- `npm run preview` - Üretim derlemesini önizle
- `npm run lint` - ESLint çalıştır
- `npm run lint:fix` - ESLint hatalarını otomatik düzelt  
- `npm run format` - Prettier ile kodu formatla
- `npm run type-check` - TypeScript tip kontrolü çalıştır

### Proje Yapısı

```
src/
├── core/              # Uygulama başlatma ve ana sahne
│   ├── app.ts         # Uygulama giriş noktası
│   └── main-scene.ts  # Merkezi sahne yönetimi ve güncelleme döngüsü
├── managers/          # Three.js bileşen yapılandırması
│   ├── camera-manager.ts    # Kamera kurulumu ve kontrolleri
│   ├── light-manager.ts     # Dinamik ışık sistemi
│   ├── renderer-manager.ts  # WebGL renderer yapılandırması
│   ├── sky-manager.ts       # Gökyüzü ve atmosfer yönetimi
│   └── water-manager.ts     # Su yüzeyi simülasyonu
├── services/          # Oyun mantığı ve davranışları
│   ├── boat-service.ts      # Gerçekçi tekne fiziği ve animasyonu
│   ├── celestial-service.ts # Ay ve yıldız sistemi
│   ├── dark-mode-service.ts # Gün/gece döngüsü yönetimi
│   ├── interaction-service.ts # Girdi işleme ve kontroller
│   └── marine-life-service.ts # Balık AI'sı ve ekosisteM
├── loaders/           # Asset yükleme yardımcıları
│   ├── gltf-loader-service.ts # 3D model yükleme
│   └── hdri-loader-service.ts # Çevre haritası yükleme
├── ui/               # Kullanıcı arayüzü bileşenleri
│   ├── controls-info.ts      # Kontrol talimatları kaplamı
│   └── dark-mode-toggle.ts   # Gün/gece değiştirici düğmesi
├── shaders/          # GLSL shader programları
└── assets/           # 3D modeller, dokular ve kaynaklar
    ├── models/       # GLB/GLTF 3D modelleri
    │   ├── boat.glb
    │   ├── balık.glb
    │   ├── gold_fish.glb
    │   └── 07fish.glb
    └── textures/     # Görüntü varlıkları ve materyaller
```

### Mimari İlkeler

- **Endişelerin Ayrılması** - Her servis belirli işlevselliği ele alır
- **Tip Güvenliği** - Tam TypeScript implementasyonu
- **Performans Optimizasyonu** - Deniz yaşamı için instanced mesh'ler
- **Modüler Tasarım** - Genişletmesi ve bakımı kolay
- **Temiz Kod** - Belirlenen adlandırma kurallarını takip eder

### Kodlama Standartları

- **Sadece TypeScript** - JavaScript dosyası yok
- **Dosya başına maksimum 300 satır** - Okunabilirliği korur
- **Adlandırma kuralları:**
  - Klasörler/dosyalar: `kebab-case`
  - Sınıflar: `PascalCase`  
  - Fonksiyonlar/Değişkenler: `camelCase`
  - Sabitler: `UPPER_SNAKE_CASE`
- **Sahne Yönetimi** - Nesneler sadece manager/servisler aracılığıyla eklenir
- **Kaynak Yönetimi** - Doğru disposal kalıpları uygulanmış

## 🔧 Teknoloji Yığını

### Temel Teknolojiler
- **Three.js r158+** - WebGL tabanlı 3D grafik motoru
- **TypeScript 5.0+** - Modern özelliklerle tip güvenli JavaScript
- **Vite 4.0+** - Şimşek hızında derleme aracı ve geliştirme sunucusu

### Geliştirme Araçları
- **ESLint** - Kod kalitesi ve tutarlılığı
- **Prettier** - Otomatik kod formatlama
- **Git Hooks** - Commit öncesi kalite kontrolleri

### Performans Özellikleri
- **InstancedMesh** - Çoklu balık için verimli render
- **Dinamik LOD** - Mesafeye dayalı performans ölçeklendirmesi
- **Kaynak Disposal** - Bellek sızıntısı önleme
- **Frame Rate Optimizasyonu** - Pürüzsüz 60fps hedefi

## 🎯 Teknik Başarılar

### Fizik Sistemi
✅ **Gerçekçi tekne dinamikleri** itki tabanlı tahrik ile  
✅ **Hıza bağlı direksiyon mekaniği**  
✅ **Su direnci simülasyonu** gövde ve dalga etkileriyle  
✅ **Momentum korunumu** ve pürüzsüz yavaşlama  

### Deniz Yaşamı AI'sı
✅ **110+ balık örneği** bireysel davranışlarla  
✅ **Çarpışma kaçınma** balık ve tekne arasında  
✅ **Derinlik katmanlı ekosistem** (3 tür farklı seviyelerde)  
✅ **Homojen dağılım** 256x256 alan boyunca  

### Çevresel Sistemler
✅ **Dinamik gün/gece geçişleri** pürüzsüz ışıklandırmayla  
✅ **Göksel mekanik** - dönen ay ve yıldız alanı  
✅ **Uyarlanabilir materyal sistemi** farklı ışık koşulları için  
✅ **Gerçekçi su yüzeyi** yüzen tekne fiziğiyle  

### Kullanıcı Deneyimi
✅ **Sezgisel kontrol şeması** otomatik solan talimatlarla  
✅ **Duyarlı kamera sistemi** organik hareketle  
✅ **Performans optimizasyonu** pürüzsüz oynanış için  
✅ **Çapraz tarayıcı uyumluluğu** WebGL fallback'leriyle  

## 🌊 Okyanus Simülasyonu Detayları

### Su Fiziği
- **Yüzey seviyesi yönetimi** - Y=0'da tutarlı su düzlemi
- **Tekne yüzdürme** - Dalga hareketiyle doğal yüzme
- **Derinlik hesaplamaları** - Deniz yaşamı için uygun sualtı konumlandırması
- **Sınır zorlaması** - Görünmez duvarlar oyun alanını korur

### Deniz Ekosistemi
- **Tür Çeşitliliği:**
  - 60 Standart Balık (orta su sütunu)
  - 20 Altın Balık (daha derin sular, daha aktif)
  - 30 Büyük Balık (yüzeyden orta derinliğe, daha yavaş hareket)
- **Davranışsal AI:**
  - Pürüzsüz geçişlerle hedef arama hareketi
  - Doğal davranış için durma/yüzme döngüleri
  - Tür aralıkları içinde hız varyasyonu
  - Minimum güvenli mesafeyle tekneden kaçınma

## 🎨 Görsel Özellikler

### Işık Sistemi
- **Yönlü ışıklandırma** gün/gece yoğunluk değişimleriyle
- **Ortam ışığı** gerçekçi gölgelendirme için
- **Ay spot ışığı** gece tekne aydınlatması için
- **Emissive materyaller** karanlık mod görünürlüğü için

### Animasyon Sistemi
- **Tekne yatması** dönüşler sırasında (gerçekçi roll fiziği)
- **Pitch dinamikleri** hızlanma/yavaşlama sırasında
- **Yüzme hareketi** doğal dalga simülasyonuyla
- **Pürüzsüz kamera takibi** organik sallanmayla

## 🚧 Gelecek Geliştirmeler

### Planlanan Özellikler
- [ ] Hava durumu sistemi (yağmur, fırtına, sis)
- [ ] Sualtı dalış modu
- [ ] Balık yakalama/etkileşim mekanikleri
- [ ] Ses tasarımı ve audio sistemi
- [ ] Prosedürel ada üretimi
- [ ] Gelişmiş parçacık efektleri (kabarcıklar, sprey)

### Teknik İyileştirmeler
- [ ] VR/AR için WebXR desteği
- [ ] Gelişmiş su shader'ları
- [ ] Prosedürel balık AI iyileştirmeleri
- [ ] Performans profilleme araçları
- [ ] Daha büyük dünyalar için asset streaming

## 📊 Performans Metrikleri

- **Hedef Frame Rate:** 60 FPS
- **Balık Sayısı:** Verimli InstancedMesh render ile 110 örnek
- **Keşif Alanı:** 256x256 birim (65.536 kare birim)
- **Bellek Yönetimi:** Otomatik kaynak disposal ve temizlik
- **Yükleme Süresi:** İlk sahne kurulumu için < 3 saniye

## 🤝 Katkıda Bulunma

1. Depoyu fork edin
2. Özellik dalınızı oluşturun (`git checkout -b feature/harika-ozellik`)
3. Yukarıda belirtilen kodlama standartlarını takip edin
4. Değişikliklerinizi commit edin (`git commit -m 'feat: harika özellik ekle'`)
5. Dalı push edin (`git push origin feature/harika-ozellik`)
6. Bir Pull Request açın



## 🙏 Teşekkürler

- Mükemmel 3D web grafik kütüphanesi için Three.js topluluğu
- Sağlam tip sistemi için TypeScript ekibi
- Şimşek hızında geliştirme deneyimi için Vite ekibi
- Gerçekçi balık davranışı modellemesi için deniz biyolojisi referansları

---

**Geniş okyanusları deneyimleyin. Fizikle gezinin. Deniz yaşamını keşfedin. 🌊🚤🐠**
