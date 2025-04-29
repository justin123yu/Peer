# Peer

A conversational AI application that helps users connect with like-minded individuals.

## Features

- Voice-based conversation with AI
- Automatic profile generation
- Smart matching with other users
- Real-time conversation analysis

## Debug Panel

The application includes a debug panel that can be accessed using keyboard shortcuts:

- **Mac**: Press `Command (⌘) + .`
- **Windows**: Press `Ctrl + .`

The debug panel provides:
- Current status of various states (active, finished, listening, speaking, etc.)
- Conversation log
- Detected topics
- Controls for ending conversation, resuming, pausing, and sending user context

## Environment Variables

The application requires the following environment variables:

```
OPENAI_API_KEY=your_openai_api_key_here
QDRANT_URL=your_qdrant_url_here
QDRANT_API_KEY=your_qdrant_api_key_here
```

## Getting Started

1. Clone the repository
2. Install dependencies
3. Set up environment variables
4. Run the development server

## License

MIT

## Prerequisites

- Node.js (v20.13.1 or higher)
- npm or pnpm
- Vercel CLI (for deployment)

## Environment Setup

This project uses the `gpt-4o` model for speech recognition and AI responses.

## Local Development

1. Install dependencies:
```sh
pnpm install
```

2. Start the development server:
```sh
pnpm dev
```

The application will be available at `http://localhost:5173`

## Deployment

### Vercel Deployment

1. Install Vercel CLI:
```sh
npm install -g vercel
```

2. Login to Vercel:
```sh
vercel login
```

3. Deploy the project:
```sh
vercel
```

4. For subsequent deployments:
```sh
vercel --prod
```

## Credits

Special thanks to the following contributors who helped build this application:

- Akiho Nagao
- Lin Myat Ko
- Sei S
- Calvin Hu