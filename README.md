# DDL Briefing Chatbot Frontend

A Next.js frontend for interactive deliberative democracy sessions. Users can chat with AI about briefing materials while viewing PDFs side-by-side.

## Features

- **Access code authentication** for session management
- **Real-time chat interface** with AI responses
- **Side-by-side PDF viewer** (desktop only)
- **Citation support** with clickable page references
- **Mobile-responsive design**
- **Production-ready deployment** for Google Cloud Run

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000`

## Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://your-backend-url
NEXT_PUBLIC_SKIP_BACKEND_AUTH=false
```

## Deployment

### Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/ddl-chatbot-frontend
gcloud run deploy ddl-chatbot-frontend \
  --image gcr.io/PROJECT_ID/ddl-chatbot-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

See `cloudbuild.yaml` for automated deployment configuration.

## Tech Stack

- **Next.js 15** with TypeScript
- **Tailwind CSS** for styling
- **PDF.js** for document viewing
- **Google Fonts** (Source Sans 3)

## Project Structure

```
src/
  components/
    chat.tsx           # Main chat interface
  lib/
    api-client.ts      # Backend API communication
    access-control.ts  # Authentication logic
  pages/
    index.tsx          # Login page
    session/[accessCode].tsx  # Main chat session
  styles/
    globals.css        # Global styles
```
