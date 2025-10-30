// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyARS80FcBSbbfPovwzthncUMJbda9o_cyc",
  authDomain: "dmwithai-a492c.firebaseapp.com",
  projectId: "dmwithai-a492c",
  storageBucket: "dmwithai-a492c.firebasestorage.app",
  messagingSenderId: "960965716891",
  appId: "1:960965716891:web:57fc5b733592176f550f3e"
};

// Placeholder avatar jika tidak ada avatar dari Google
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=random&color=fff&name=User";

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Referensi elemen DOM
const loginSection = document.getElementById('login-section');
const chatSection = document.getElementById('chat-section');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userList = document.getElementById('user-list');
const receiverAvatar = document.getElementById('receiver-avatar');
const receiverName = document.getElementById('receiver-name');
const typingIndicator = document.getElementById('typing-indicator');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

// Variabel global
let currentUser = null;
let selectedUser = null;
let currentChatId = null;
let typingTimeout = null;
let usersSnapshot = null;

// Event Listeners
loginButton.addEventListener('click', signInWithGoogle);
logoutButton.addEventListener('click', signOut);
messageInput.addEventListener('input', handleTyping);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
sendButton.addEventListener('click', sendMessage);

// Event listener untuk mendeteksi ketika user menutup browser/tab
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        updateUserOfflineStatus(currentUser.uid);
    }
});

// Event listener untuk mendeteksi ketika user kehilangan fokus dari tab
document.addEventListener('visibilitychange', () => {
    if (currentUser) {
        if (document.hidden) {
            // Tab tidak aktif, update lastSeen
            db.collection('users').doc(currentUser.uid).update({
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Tab aktif kembali, pastikan status online
            db.collection('users').doc(currentUser.uid).update({
                isOnline: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }
});

// Fungsi autentikasi
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .catch(error => {
            console.error('Error during sign in:', error);
            alert('Gagal login: ' + error.message);
        });
}

function signOut() {
    // Update status offline sebelum logout
    if (currentUser) {
        updateUserOfflineStatus(currentUser.uid);
    }
    
    auth.signOut()
        .catch(error => {
            console.error('Error during sign out:', error);
            alert('Gagal logout: ' + error.message);
        });
}

// Observer status autentikasi
auth.onAuthStateChanged(user => {
    if (user) {
        // User login
        currentUser = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL
        };
        
        // Update UI
        loginSection.classList.add('hidden');
        chatSection.classList.remove('hidden');
        userAvatar.src = user.photoURL || DEFAULT_AVATAR;
        userName.textContent = user.displayName;
        
        // Load daftar pengguna
        loadUsers();
        
        // Tambahkan atau update pengguna di Firestore
        updateUserInFirestore(currentUser);
    } else {
        // User logout
        currentUser = null;
        selectedUser = null;
        currentChatId = null;
        
        // Reset UI
        loginSection.classList.remove('hidden');
        chatSection.classList.add('hidden');
        messagesContainer.innerHTML = '';
        userList.innerHTML = '';
        messageInput.value = '';
        messageInput.disabled = true;
        sendButton.disabled = true;
        receiverName.textContent = 'Pilih pengguna untuk memulai obrolan';
        receiverAvatar.src = DEFAULT_AVATAR;
        
        // Unsubscribe dari listeners
        if (usersSnapshot) {
            usersSnapshot();
            usersSnapshot = null;
        }
    }
});

// Fungsi untuk memeriksa keberadaan user di collection 'users'
async function checkUserExists(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        return userDoc.exists;
    } catch (error) {
        console.error('Error checking user existence:', error);
        return false;
    }
}

// Fungsi untuk mengupdate status user menjadi offline
function updateUserOfflineStatus(uid) {
    if (uid) {
        db.collection('users').doc(uid).update({
            isOnline: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(error => {
            console.error('Error updating offline status:', error);
        });
    }
}

// Fungsi untuk update user di Firestore
function updateUserInFirestore(user) {
    // Periksa apakah user sudah ada di collection
    checkUserExists(user.uid).then(exists => {
        // Jika user belum ada, tambahkan ke collection
        if (!exists) {
            console.log('User baru terdeteksi, menambahkan ke database:', user.displayName);
        } else {
            console.log('User sudah ada, memperbarui data:', user.displayName);
        }
        
        // Tambahkan atau update user data
        db.collection('users').doc(user.uid).set({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            isOnline: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            lastOnline: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: exists ? null : firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }).catch(error => {
        console.error('Error updating user in Firestore:', error);
    });
}

// Fungsi untuk memuat daftar pengguna
function loadUsers() {
    // Pastikan userList ada sebelum melanjutkan
    if (!userList) {
        console.error('Element userList tidak ditemukan');
        return;
    }
    
    // Unsubscribe dari listener sebelumnya jika ada
    if (usersSnapshot) {
        usersSnapshot();
    }
    
    // Tambahkan listener baru - hanya user yang online
    usersSnapshot = db.collection('users')
        .where('isOnline', '==', true)
        .onSnapshot(snapshot => {
            // Bersihkan daftar pengguna
            userList.innerHTML = '';
            
            // Periksa apakah ada data
            if (snapshot.empty) {
                console.log('Tidak ada pengguna yang ditemukan');
                const noUserItem = document.createElement('div');
                noUserItem.className = 'no-user-item';
                noUserItem.textContent = 'Tidak ada pengguna lain';
                userList.appendChild(noUserItem);
                return;
            }
            
            // Tambahkan setiap pengguna ke daftar
            snapshot.forEach(doc => {
                const userData = doc.data();
                
                // Jangan tampilkan pengguna saat ini
                if (userData.uid === currentUser.uid) return;
                
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                userItem.dataset.uid = userData.uid;
                
                // Pastikan URL avatar valid
                const avatarUrl = userData.photoURL || (DEFAULT_AVATAR + '&name=' + encodeURIComponent(userData.displayName || 'User'));
                
                userItem.innerHTML = `
                    <img src="${avatarUrl}" alt="Avatar" class="user-item-avatar">
                    <div class="user-item-info">
                        <div class="user-item-name">${userData.displayName || 'Pengguna'}</div>
                        <div class="user-status online">● Online</div>
                    </div>
                `;
                
                userItem.addEventListener('click', () => selectUser(userData));
                userList.appendChild(userItem);
            });
            
            console.log('Daftar pengguna dimuat:', userList.children.length, 'pengguna');
        }, error => {
            console.error('Error loading users:', error);
        });
}

// Fungsi untuk memilih pengguna untuk chat
function selectUser(user) {
    if (!user || !user.uid) {
        console.error('Data pengguna tidak valid:', user);
        return;
    }
    
    // Hapus kelas active dari semua user item
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Tambahkan kelas active ke user item yang dipilih
    const selectedItem = document.querySelector(`.user-item[data-uid="${user.uid}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    // Simpan pengguna yang dipilih
    selectedUser = user;
    
    // Update UI
    if (receiverAvatar) {
        receiverAvatar.src = user.photoURL || (DEFAULT_AVATAR + '&name=' + encodeURIComponent(user.displayName || 'User'));
    }
    
    if (receiverName) {
        receiverName.textContent = user.displayName || 'Pengguna';
    }
    
    // Aktifkan input pesan dan tombol kirim
    if (messageInput) {
        messageInput.disabled = false;
        messageInput.focus(); // Fokus ke input pesan
    }
    
    if (sendButton) {
        sendButton.disabled = false;
    }
    
    // Buat atau dapatkan ID chat
    const chatUsers = [currentUser.uid, user.uid].sort();
    currentChatId = chatUsers.join('_');
    
    console.log('Pengguna dipilih:', user.displayName, 'dengan ID chat:', currentChatId);
    
    // Load pesan
    loadMessages();
}

// Fungsi untuk memuat pesan
function loadMessages() {
    messagesContainer.innerHTML = '';
    
    db.collection('chats').doc(currentChatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            let changes = snapshot.docChanges();
            
            changes.forEach(change => {
                if (change.type === 'added') {
                    displayMessage(change.doc.data());
                }
            });
            
            // Scroll ke pesan terbaru
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Update status isRead untuk pesan yang diterima
            updateReadStatus();
        });
    
    // Pantau status typing
    db.collection('chats').doc(currentChatId)
        .onSnapshot(doc => {
            const data = doc.data() || {};
            
            if (data.typing && data.typing.uid === selectedUser.uid) {
                typingIndicator.classList.remove('hidden');
            } else {
                typingIndicator.classList.add('hidden');
            }
        });
}

// Fungsi untuk menampilkan pesan
function displayMessage(message) {
    const messageElement = document.createElement('div');
    const isSent = message.senderId === currentUser.uid;
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    
    // Format waktu
    const timestamp = message.timestamp ? message.timestamp.toDate() : new Date();
    const timeString = formatTime(timestamp);
    
    // Dapatkan avatar pengguna
    const avatarSrc = isSent ? currentUser.photoURL : selectedUser.photoURL;
    const userName = isSent ? currentUser.displayName : selectedUser.displayName;
    
    messageElement.innerHTML = `
        <img src="${avatarSrc || DEFAULT_AVATAR + '&name=' + encodeURIComponent(userName)}" alt="Avatar" class="message-avatar">
        <div class="message-content">
            <div class="message-text">${message.text}</div>
            <div class="message-time">${timeString}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
}

// Fungsi untuk mengirim pesan
function sendMessage() {
    const text = messageInput.value.trim();
    
    if (text && currentChatId && selectedUser) {
        const message = {
            text: text,
            senderId: currentUser.uid,
            receiverId: selectedUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            isRead: false
        };
        
        // Simpan pesan ke Firestore
        db.collection('chats').doc(currentChatId).collection('messages').add(message)
            .then(() => {
                // Update lastMessage di dokumen chat
                db.collection('chats').doc(currentChatId).set({
                    lastMessage: text,
                    lastMessageSender: currentUser.uid,
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    users: [currentUser.uid, selectedUser.uid]
                }, { merge: true });
                
                // Reset input dan status typing
                messageInput.value = '';
                updateTypingStatus(false);
            })
            .catch(error => {
                console.error('Error sending message:', error);
                alert('Gagal mengirim pesan: ' + error.message);
            });
    }
}

// Fungsi untuk menangani typing
function handleTyping() {
    if (currentChatId && selectedUser) {
        updateTypingStatus(true);
        
        // Clear timeout sebelumnya
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        // Set timeout baru
        typingTimeout = setTimeout(() => {
            updateTypingStatus(false);
        }, 3000);
    }
}

// Fungsi untuk update status typing
function updateTypingStatus(isTyping) {
    if (currentChatId && currentUser) {
        if (isTyping) {
            db.collection('chats').doc(currentChatId).set({
                typing: {
                    uid: currentUser.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }
            }, { merge: true });
        } else {
            db.collection('chats').doc(currentChatId).set({
                typing: null
            }, { merge: true });
        }
    }
}

// Fungsi untuk update status isRead
function updateReadStatus() {
    if (currentChatId && currentUser && selectedUser) {
        db.collection('chats').doc(currentChatId).collection('messages')
            .where('senderId', '==', selectedUser.uid)
            .where('isRead', '==', false)
            .get()
            .then(snapshot => {
                snapshot.forEach(doc => {
                    doc.ref.update({ isRead: true });
                });
            });
    }
}

// Fungsi untuk format waktu
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}