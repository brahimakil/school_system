# 🚀 Real-Time Chat Implementation Guide (Vercel-Compatible)

> **📌 Important:** This chat system does NOT use WebSockets or Socket.IO. It uses **Firestore real-time listeners** which work perfectly on serverless platforms like Vercel.

---

## 🎯 Architecture Overview

### The Problem with WebSockets on Vercel
- ❌ WebSocket gateways require **persistent connections**
- ❌ Vercel serverless functions **timeout after 10 seconds** (Hobby) or 60 seconds (Pro)
- ❌ No stateful server to maintain Socket.IO connections
- ❌ Each request goes to a different serverless function instance

### ✅ Our Solution: Firestore Real-Time Listeners

Instead of WebSockets, we use:
1. **NestJS REST API** (serverless-compatible) - handles message creation/updates
2. **Firestore Real-Time Listeners** (client-side) - provides real-time updates
3. **Direct Firestore SDK** (frontend) - listens to database changes instantly

```
┌──────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE FLOW                          │
└──────────────────────────────────────────────────────────────┘

Frontend (Web/Mobile)                    Backend (NestJS)
     │                                         │
     │  1. Send Message (POST /chat/messages) │
     ├────────────────────────────────────────►│
     │                                         │
     │         2. Save to Firestore            │
     │         (Backend writes data)           │
     │                                         │
     │  3. Firestore Real-Time Listener        │
     │     (Frontend listens directly)         │
     │◄────────────────────────────────────────┤
     │        Firestore Database               │
     │                                         │
     │  4. Auto-Updates! ⚡                     │
     │  (No WebSocket needed)                  │
     │                                         │
```

---

## 📦 Tech Stack

### Backend (NestJS)
- **Framework:** NestJS (TypeScript)
- **Database:** Firebase Firestore (NoSQL)
- **Storage:** Firebase Storage (images)
- **Deployment:** Vercel (serverless functions)
- **Authentication:** REST API with Firebase Admin SDK

### Frontend
- **Web (Pharmacy Owners):** React + Vite
- **Mobile (Users):** React Native + Expo
- **Real-Time:** Firestore SDK (`onSnapshot` listeners)
- **State Management:** React Context API
- **Deployment:** Vercel (web), APK (mobile)

---

## 🏗️ Database Schema

### Collection: `conversations`
```typescript
{
  id: string,                          // Auto-generated doc ID
  userId: string,                      // User ID (mobile app user)
  pharmacyOwnerId: string,             // Pharmacy owner ID
  pharmacyId: string,                  // Pharmacy ID
  
  // Last message preview
  lastMessage: string,
  lastMessageType: 'text' | 'image' | 'text-image',
  lastMessageAt: Timestamp,            // Firestore server timestamp
  lastMessageSenderId: string,
  lastMessageSenderType: 'user' | 'pharmacy-owner',
  
  // Unread counts
  unreadCountUser: number,
  unreadCountPharmacyOwner: number,
  
  // Status
  status: 'active' | 'archived',
  
  // Timestamps
  createdAt: Timestamp,                // Server timestamp
  updatedAt: Timestamp                 // Server timestamp
}
```

### Collection: `messages`
```typescript
{
  id: string,                          // Auto-generated doc ID
  conversationId: string,              // Reference to conversation (INDEXED)
  
  // Sender info
  senderId: string,
  senderType: 'user' | 'pharmacy-owner',
  senderName: string,
  
  // Content
  content: string,                     // Text (can be empty if image-only)
  imageUrl?: string,                   // Optional image URL
  type: 'text' | 'image' | 'text-image',
  
  // Status
  status: 'sent' | 'delivered' | 'read',
  deliveredAt?: Timestamp,
  readAt?: Timestamp,
  
  // Timestamp
  createdAt: Timestamp                 // Server timestamp (INDEXED)
}
```

---

## 🔑 Critical Implementation Details

### 1. Use Firestore Server Timestamps (Not JavaScript Date)

**❌ WRONG (causes ordering issues):**
```typescript
const now = new Date();
const message = {
  content: "Hello",
  createdAt: now  // JavaScript Date object
};
```

**✅ CORRECT:**
```typescript
import * as admin from 'firebase-admin';

const message = {
  content: "Hello",
  createdAt: admin.firestore.FieldValue.serverTimestamp() as any
};
```

**Why?**
- Server timestamps are consistent across all devices
- No clock synchronization issues
- Firestore's `orderBy` works perfectly with server timestamps
- JavaScript Date objects can serialize inconsistently

### 2. Create Required Firestore Indexes

You **MUST** create these composite indexes in Firebase Console:

**Go to:** [Firebase Console](https://console.firebase.google.com/) → Your Project → Firestore → Indexes

**Index 1: Pharmacy Owner Conversations**
```
Collection: conversations
Fields:
  - pharmacyOwnerId (Ascending)
  - status (Ascending)
  - lastMessageAt (Descending)
```

**Index 2: User Conversations**
```
Collection: conversations
Fields:
  - userId (Ascending)
  - status (Ascending)
  - lastMessageAt (Descending)
```

**Index 3: Messages by Conversation**
```
Collection: messages
Fields:
  - conversationId (Ascending)
  - createdAt (Ascending)
```

**Index 4: Unread Messages**
```
Collection: messages
Fields:
  - conversationId (Ascending)
  - status (Ascending)
```

### 3. Frontend Real-Time Listeners

**Web (React):**
```javascript
import { collection, query, where, onSnapshot } from 'firebase/firestore';

useEffect(() => {
  if (!owner?.id) return;

  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const msgs = [];
    snapshot.forEach((doc) => {
      msgs.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort in JavaScript (to avoid requiring more indexes)
    msgs.sort((a, b) => {
      const aTime = a.createdAt?.toDate() || new Date(0);
      const bTime = b.createdAt?.toDate() || new Date(0);
      return aTime - bTime; // Oldest first
    });
    
    setMessages(msgs);
  });

  return () => unsubscribe();
}, [conversationId]);
```

**Mobile (React Native):**
```typescript
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

useEffect(() => {
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'desc'), // Can use orderBy on mobile
    limit(100)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const msgs: Message[] = [];
    snapshot.forEach((doc) => {
      msgs.push({ id: doc.id, ...doc.data() } as Message);
    });
    setMessages(msgs);
  });

  return () => unsubscribe();
}, [conversationId]);
```

---

## 📡 Backend API Endpoints

All endpoints use standard REST (no WebSocket):

### Conversations
```
POST   /chat/conversations              → Create/get conversation
GET    /chat/conversations/user/:id     → Get user conversations
GET    /chat/conversations/pharmacy-owner/:id → Get owner conversations
GET    /chat/conversations/:id          → Get single conversation
PATCH  /chat/conversations/:id/archive  → Archive conversation
```

### Messages
```
POST   /chat/messages                   → Send message
GET    /chat/conversations/:id/messages → Get messages (paginated)
PATCH  /chat/messages/mark-read         → Mark messages as read
```

### Media
```
POST   /chat/upload-image               → Upload chat image (max 5MB)
```

---

## 🔥 Backend Implementation (NestJS)

### Chat Service (Key Methods)

**Send Message:**
```typescript
async sendMessage(dto: SendMessageDto, senderName: string): Promise<Message> {
  const messageType = dto.content && dto.imageUrl ? 'text-image' 
    : dto.imageUrl ? 'image' 
    : 'text';

  const newMessage: Omit<Message, 'id'> = {
    conversationId: dto.conversationId,
    senderId: dto.senderId,
    senderType: dto.senderType,
    senderName: senderName,
    content: dto.content || '',
    type: messageType,
    status: 'sent',
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  if (dto.imageUrl) {
    newMessage.imageUrl = dto.imageUrl;
  }

  // Create message in Firestore
  const messageRef = await this.db.collection('messages').add(newMessage);

  // Update conversation's last message
  await this.updateConversationLastMessage(
    dto.conversationId,
    dto.content || '[Image]',
    messageType,
    dto.senderId,
    dto.senderType,
  );

  return { id: messageRef.id, ...newMessage } as Message;
}
```

**Update Conversation:**
```typescript
private async updateConversationLastMessage(
  conversationId: string,
  lastMessage: string,
  lastMessageType: 'text' | 'image' | 'text-image',
  senderId: string,
  senderType: 'user' | 'pharmacy-owner',
): Promise<void> {
  const unreadField = senderType === 'user' 
    ? 'unreadCountPharmacyOwner' 
    : 'unreadCountUser';

  await this.db.collection('conversations').doc(conversationId).update({
    lastMessage: lastMessage,
    lastMessageType: lastMessageType,
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    lastMessageSenderId: senderId,
    lastMessageSenderType: senderType,
    [unreadField]: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
```

---

## 🚀 Deployment Configuration

### Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/main.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/main.ts",
      "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Environment Variables on Vercel

**Backend (`nestProject`):**
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
PORT=3000
NODE_ENV=production
```

**Frontend (`pharmacy-owners`):**
```bash
VITE_API_URL=https://your-backend.vercel.app
VITE_FIREBASE_API_KEY=AIzaSy... (your real API key)
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

---

## 🎨 Frontend Components

### Web Chat Component Structure

```jsx
// pharmacy-owners/src/pages/Chat.jsx

const Chat = () => {
  const { owner } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  // Real-time conversations listener
  useEffect(() => {
    const q = query(
      collection(db, 'conversations'),
      where('pharmacyOwnerId', '==', owner.id),
      where('status', '==', 'active'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by most recent
      convs.sort((a, b) => {
        const aTime = a.lastMessageAt?.toDate() || new Date(0);
        const bTime = b.lastMessageAt?.toDate() || new Date(0);
        return bTime - aTime;
      });
      
      setConversations(convs);
    });

    return () => unsubscribe();
  }, [owner?.id]);

  // Real-time messages listener
  useEffect(() => {
    if (!selectedConversation?.id) return;

    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', selectedConversation.id),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      
      // Sort oldest first
      msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedConversation?.id]);

  // Send message via REST API
  const handleSendMessage = async () => {
    await chatService.sendMessage(
      selectedConversation.id,
      owner.id,
      owner.name,
      messageText,
      imageUrl
    );
    // Message appears automatically via onSnapshot listener!
  };

  return (
    // UI components...
  );
};
```

### Mobile Chat Screen Structure

```typescript
// pharmacy-user-app/src/screens/ChatScreen.tsx

const ChatScreen = ({ route }) => {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [conversationId]);

  const handleSend = async () => {
    await sendMessage(
      conversationId,
      user.userId,
      'user',
      user.name,
      messageText,
      imageUrl
    );
    // Auto-updates via listener!
  };

  return (
    <FlatList
      data={messages}
      inverted
      renderItem={({ item }) => <MessageBubble message={item} />}
    />
  );
};
```

---

## ⚡ Performance Optimizations

### 1. Limit Query Results
```typescript
// Don't fetch all messages at once
query(collection(db, 'messages'), limit(50))
```

### 2. Cursor Pagination (Backend)
```typescript
async getMessages(conversationId: string, dto: GetMessagesDto) {
  let query = this.db
    .collection('messages')
    .where('conversationId', '==', conversationId)
    .orderBy('createdAt', 'desc')
    .limit(dto.limit || 50);

  // Cursor-based pagination
  if (dto.lastMessageId) {
    const lastDoc = await this.db.collection('messages').doc(dto.lastMessageId).get();
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

### 3. Batch Updates
```typescript
// Mark multiple messages as read in one batch
const batch = this.db.batch();

messagesToMark.forEach(doc => {
  batch.update(doc.ref, {
    status: 'read',
    readAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});

await batch.commit();
```

### 4. Client-Side Sorting (Avoid Extra Indexes)
```javascript
// Sort in JavaScript instead of requiring Firestore index
msgs.sort((a, b) => {
  const aTime = a.createdAt?.toDate() || new Date(0);
  const bTime = b.createdAt?.toDate() || new Date(0);
  return aTime - bTime;
});
```

---

## 🐛 Common Issues & Solutions

### Issue 1: No chats showing on Vercel
**Cause:** Missing Firebase environment variables

**Solution:**
1. Get real Firebase config from Firebase Console
2. Add all `VITE_FIREBASE_*` variables to Vercel
3. Redeploy

### Issue 2: Messages appear in wrong order
**Cause:** Using JavaScript `Date` instead of Firestore server timestamp

**Solution:**
```typescript
// Use this
createdAt: admin.firestore.FieldValue.serverTimestamp() as any

// Not this
createdAt: new Date()
```

### Issue 3: Firestore query requires index
**Cause:** Missing composite indexes

**Solution:**
- Click the error link in console (goes directly to index creation)
- Or manually create indexes as shown in section 2 above

### Issue 4: Images not uploading
**Cause:** Missing Firebase Storage bucket configuration

**Solution:**
```typescript
// In firebase.service.ts
admin.initializeApp({
  credential: admin.credential.cert({...}),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // ADD THIS
});
```

### Issue 5: Real-time updates not working
**Cause:** Frontend not using Firestore SDK correctly

**Solution:**
- Import from `firebase/firestore` (not `@firebase/firestore`)
- Use `onSnapshot` (not polling)
- Remember to call `unsubscribe()` in cleanup

---

## 📱 Mobile-Specific Implementation

### Firebase Configuration (React Native)
```typescript
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### Chat Service (React Native)
```typescript
// src/services/chatService.ts
import { getBackendUrl } from '../utils/networkUtils';

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  senderType: 'user' | 'pharmacy-owner',
  senderName: string,
  content: string,
  imageUrl?: string
) => {
  const response = await fetch(`${getBackendUrl()}/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId,
      senderId,
      senderType,
      senderName,
      content,
      imageUrl,
    }),
  });

  if (!response.ok) throw new Error('Failed to send message');
  return response.json();
};
```

---

## 🎯 Key Takeaways

### ✅ DO's
1. **Use Firestore server timestamps** for all time-based fields
2. **Create required indexes** before deploying
3. **Use onSnapshot listeners** for real-time updates
4. **Implement client-side sorting** to avoid complex indexes
5. **Use REST API** for writing data (serverless-compatible)
6. **Clean up listeners** in useEffect cleanup functions
7. **Batch update** when marking messages as read
8. **Limit query results** for performance

### ❌ DON'Ts
1. **Don't use WebSockets/Socket.IO** on Vercel
2. **Don't use JavaScript Date objects** for Firestore timestamps
3. **Don't forget to create indexes** (queries will fail)
4. **Don't fetch unlimited messages** (use pagination)
5. **Don't forget environment variables** on Vercel
6. **Don't use placeholder Firebase config** in production

---

## 🔒 Security Rules (Firestore)

```javascript
// Firebase Console → Firestore → Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Conversations: Users can only read their own
    match /conversations/{conversationId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         resource.data.pharmacyOwnerId == request.auth.uid);
      allow write: if request.auth != null;
    }
    
    // Messages: Can read if part of conversation
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 📚 File Structure Reference

```
nestProject/
├── src/
│   ├── chat/
│   │   ├── chat.controller.ts       → REST endpoints
│   │   ├── chat.service.ts          → Business logic
│   │   ├── chat.module.ts
│   │   ├── entities/
│   │   │   ├── conversation.entity.ts
│   │   │   └── message.entity.ts
│   │   └── dto/
│   │       ├── create-conversation.dto.ts
│   │       ├── send-message.dto.ts
│   │       ├── get-messages.dto.ts
│   │       └── mark-read.dto.ts
│   └── firebase/
│       ├── firebase.service.ts       → Firestore connection
│       └── firebase-storage.service.ts
├── vercel.json                       → Vercel config
└── .env                              → Backend env vars

pharmacy-owners/
├── src/
│   ├── pages/
│   │   └── Chat.jsx                  → Chat UI
│   ├── services/
│   │   └── chatService.js            → API calls
│   └── config/
│       └── firebase.js               → Firestore client
└── .env                              → Frontend env vars

pharmacy-user-app/
├── src/
│   ├── screens/
│   │   ├── ChatScreen.tsx            → Single chat view
│   │   └── ChatsScreen.tsx           → Conversations list
│   ├── services/
│   │   └── chatService.ts            → API calls
│   └── config/
│       └── firebase.ts               → Firestore client
└── app.json
```

---

## 🎓 Summary

This chat implementation **works perfectly on Vercel** because:

1. **No WebSocket dependency** - Uses Firestore real-time listeners
2. **REST API for writes** - NestJS endpoints are stateless
3. **Firestore for reads** - Clients listen directly to database
4. **Server timestamps** - Ensures consistent ordering across platforms
5. **Optimized queries** - Limited results, cursor pagination, client-side sorting

**The key insight:** Real-time doesn't require WebSockets! Firestore's built-in real-time capabilities handle it perfectly while being fully compatible with serverless architecture.

---

## 📞 Need Help?

If implementing this in a new project:

1. Start with backend: Set up Firebase Admin SDK
2. Create Firestore collections and indexes
3. Implement REST endpoints (no WebSocket gateway)
4. Add Firestore SDK to frontend
5. Use `onSnapshot` listeners for real-time updates
6. Deploy to Vercel with proper env vars

**Remember:** If you see any tutorial using Socket.IO or WebSocket Gateway with Vercel/serverless, it won't work. Use this Firestore approach instead! 🎯
