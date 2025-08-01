# DDL Chatbot Frontend

AI-powered briefing material chat interface for deliberative democracy sessions.

## 🚀 Quick Deploy to Vercel

1. **Connect Repository**: Import this GitHub repo to Vercel
2. **Set Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.run.app
   NEXT_PUBLIC_SKIP_BACKEND_AUTH=false
   ```
3. **Deploy**: Automatic deployment on git push

## 💻 Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your settings
# For development without backend:
NEXT_PUBLIC_SKIP_BACKEND_AUTH=true

# Start development server
npm run dev
```

## 📱 Features

- **Responsive Design**: Works on mobile and desktop
- **Access Code Authentication**: Secure session management  
- **Real-time Chat**: Interactive AI conversation
- **PDF Viewer**: Side-by-side document viewing (desktop only)
- **Mock Mode**: Development without backend

## 🔑 Access

- **Access Code**: `12345678`
- **Usage**: Enter code → Chat with AI about briefing materials

## 🛠 Tech Stack

- Next.js 15 + TypeScript
- Tailwind CSS
- Google Fonts (Source Sans 3)
- Mobile-first responsive design

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API endpoint | `https://api.example.com` |
| `NEXT_PUBLIC_SKIP_BACKEND_AUTH` | Skip backend (dev only) | `true` or `false` |
