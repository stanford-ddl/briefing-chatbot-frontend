# DDL Chatbot Frontend

Modern chatbot interface built with Next.js 15 and TypeScript.

## Quick Deploy

### Deploy to Vercel
1. Go to vercel.com and sign in with GitHub
2. Import your repository
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL` - Your backend API URL
4. Deploy

### Local Development
```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your backend URL

# Run development server
npm run dev
```

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (e.g., `https://your-backend.run.app`)

## Features

- Modern UI with clean, responsive design
- Real-time chat interface
- Authentication with access code system
- TypeScript for type safety
- Mobile friendly

## Tech Stack

- Framework: Next.js 15
- Language: TypeScript
- Styling: CSS Modules
- Deployment: Vercel-optimized

## Usage

1. Enter access code: `DDL`
2. Start chatting with the AI
3. Ask questions about briefing documents
4. Get intelligent, context-aware responses

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Visit `http://localhost:3000` to see your application.

## Deployment

The frontend can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Docker** (static export)

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-backend-domain.com`
3. Deploy automatically on commits

## Project Structure

- `src/pages/` - Next.js pages (routing)
- `src/components/` - React components
- `src/lib/` - Utilities and API client
- `public/` - Static assets and documents
