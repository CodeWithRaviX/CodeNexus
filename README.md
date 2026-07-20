# 🚀 CodeNexus

<p align="center">
  <img src="./assets/logo.png" width="180"/>
</p>

<p align="center">
A modern real-time collaborative coding platform where developers can code, execute, chat, draw, and collaborate seamlessly.
</p>

<p align="center">
Live Collaboration • Code Execution • AI Assistant • Drawing Board • Multi-language Support
</p>

---

## ✨ Features

- ⚡ Real-time collaborative code editing
- 👥 Multi-user rooms with instant synchronization
- 💬 Live group chat
- 🖥️ Multi-language code execution
- 📁 File & folder management
- 🎨 40+ editor themes
- 🔤 Custom fonts and font sizes
- 🤖 AI Copilot
- 🖊️ Live cursor & text selection
- 🎯 Auto-completion & syntax highlighting
- 🎨 Collaborative whiteboard
- 📦 Download project as ZIP
- 🔐 Unique room generation
- 👤 User presence indicators

---

## 🛠 Tech Stack

### Frontend

- React
- TypeScript
- Tailwind CSS
- Monaco Editor
- React Router

### Backend

- Node.js
- Express
- Socket.IO

### Services

- Docker
- Piston API
- Pollinations AI

## 🚀 Live Demo

https://your-vercel-url.vercel.app

---

## ⚙ Installation

### Runtime service for code execution

If you run the app with Docker Compose, make sure the Piston service is available on port 2000 and the client points to it:

```env
VITE_PISTON_API_URL=http://localhost:2000
```

In production or inside the Docker network, the server also uses the internal host `http://piston:2000` automatically when no explicit Piston URL is set.

### Clone Repository

```bash
git clone https://github.com/CodeWithRaviX/CodeNexus.git

cd CodeNexus
```
