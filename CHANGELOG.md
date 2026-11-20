# Değişiklik günlüğü

## v2.2 · Kasım 2026

Oynanış, sahneler, adres ve kayıt verisi (`arena.karagoz.*`) aynı; eski kayıtla oyun olduğu gibi açılır.

### Yenilikler
- **Sahne rekorları:** her sahnede en az hamle sayın yerelde saklanır (`arena.karagoz.rec`). Sahne çözülünce sonuç ekranında "rekor" ya da "yeni rekor! (önceki N)" yazar, Perde Haritası'nda sahne düğmesinin ipucunda görünür. Günün Meydan Okuması rekora yazılmaz.
- **Titreşim:** telefonda sahne çözülünce kısa bir titreşim; Erişilebilirlik ayarındaki titreşim anahtarına uyar.
- **Yenilikler penceresi ve sürüm etiketi:** ana ekranda "v2.2 · Kasım 2026" düğmesi, Türkçe ve İngilizce yenilikler listesi; `Esc` ile kapanır.
- **"Diğer oyunlar" bağlantısı** ana ekranda (daha önce yalnız final ekranındaydı).

### Düzeltmeler
- Sayfada sekme simgesi (favicon) yoktu; eklendi.
- Tarayıcı çubuğu rengi (`theme-color`) eklendi.
- Sayfa açıklaması, Open Graph ve Twitter kartı İngilizceydi ve `lang="tr"` ile uyuşmuyordu; Türkçe yapıldı, paylaşım görseli için `twitter:image` ve görsel açıklaması eklendi.
- Kayıp adres için Türkçe `404.html` eklendi (oyuna ve merkez sayfaya bağlantılı).
- Dar telefonlarda "Günün Meydan Okuması" düğmesindeki seri yazısı kötü satır kırıyordu; düzeltildi.
- Ana ekran alt bağlantıları 36 px altı dokunma hedefindeydi; büyütüldü.

### Test
- `test/duman.mjs` duman testi eklendi (masaüstü 1366x768 ve telefon 390x844): sayfa açılışı, konsol hatası, oyun başlangıcı, etkileşim, duraklatma, taşma, rekor ve Yenilikler penceresi. Kullanım: `node test/duman.mjs` (bağımlılık: `playwright-core`, depoya eklenmez).
