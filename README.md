# Aplikasi Obrolan (Direct Message)

Aplikasi obrolan sederhana menggunakan HTML, CSS, dan JavaScript dengan Firebase untuk autentikasi dan penyimpanan data.

## Fitur

- Login dengan Google SSO
- Daftar pengguna yang tersedia untuk dikirim pesan
- Obrolan real-time dengan Firestore
- Animasi ketika lawan sedang mengetik pesan
- Avatar dari Google SSO di bubble chat
- Tampilan waktu pengiriman pesan
- Status pesan dibaca/belum dibaca

## Cara Menggunakan

1. Buat project Firebase di [Firebase Console](https://console.firebase.google.com/)
2. Aktifkan Authentication dengan provider Google
3. Aktifkan Firestore Database
4. Ganti konfigurasi Firebase di file `app.js` dengan konfigurasi dari project Firebase Anda:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

5. Jalankan aplikasi menggunakan salah satu cara berikut:
   - Menggunakan npx: `npx serve -s . -p 3000` (aplikasi akan berjalan di http://localhost:3000)
   - Menggunakan npm: `npm start` (setelah menginstal dependensi dengan `npm install`)
   - Membuka file `index.html` langsung di browser (tidak disarankan untuk fitur real-time)

## Struktur Database Firestore

### Collection `users`
- Document ID: UID pengguna dari Firebase Auth
- Fields:
  - `uid`: String - UID pengguna
  - `displayName`: String - Nama pengguna
  - `email`: String - Email pengguna
  - `photoURL`: String - URL avatar pengguna
  - `lastOnline`: Timestamp - Waktu terakhir online

### Collection `chats`
- Document ID: Gabungan UID pengguna yang diurutkan dan dipisahkan dengan underscore (`_`)
- Fields:
  - `lastMessage`: String - Pesan terakhir
  - `lastMessageSender`: String - UID pengirim pesan terakhir
  - `lastMessageTime`: Timestamp - Waktu pesan terakhir
  - `users`: Array - Array berisi UID pengguna yang terlibat dalam chat
  - `typing`: Object - Informasi pengguna yang sedang mengetik
    - `uid`: String - UID pengguna yang sedang mengetik
    - `timestamp`: Timestamp - Waktu mulai mengetik

#### Subcollection `messages`
- Fields:
  - `text`: String - Isi pesan
  - `senderId`: String - UID pengirim pesan
  - `receiverId`: String - UID penerima pesan
  - `timestamp`: Timestamp - Waktu pengiriman pesan
  - `isRead`: Boolean - Status pesan sudah dibaca atau belum

## Deployment ke Firebase Hosting

Untuk men-deploy aplikasi ke Firebase Hosting, ikuti langkah-langkah berikut:

1. Pastikan Anda memiliki Node.js versi 18 atau lebih tinggi
2. Install Firebase CLI:
   ```
   npm install -g firebase-tools
   ```
3. Login ke akun Firebase Anda:
   ```
   firebase login
   ```
4. Deploy aplikasi:
   ```
   firebase deploy
   ```
5. Setelah deploy selesai, aplikasi Anda akan tersedia di URL: `https://[PROJECT-ID].web.app`

## Catatan Pengembangan

- Aplikasi ini menggunakan Firebase versi 8.10.1
- Pastikan domain tempat Anda meng-host aplikasi ini sudah ditambahkan ke Authorized Domains di Firebase Authentication
- Untuk pengembangan lokal, Anda dapat menggunakan `localhost` sebagai domain
- Konfigurasi Firebase Hosting sudah diatur untuk menggunakan folder root sebagai folder publik