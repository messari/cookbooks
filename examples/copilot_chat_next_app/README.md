# Messari Copilot Chat

A simple Next.js application that demonstrates how to integrate the Messari Copilot API into a frontend application. This project uses the Vercel AI SDK to create a chat interface that communicates with Messari's AI endpoint.

## Features

- Real-time streaming responses with dynamic content rendering
- Interactive data visualizations and charts based on query context
- Inline citations with source attribution
- Mobile-responsive design with dark mode UI
- Support for different verbosity levels and output formats

## Getting an API Key
- Sign up for Messari
- Visit [Messari Account Settings](https://messari.io/account/api) to generate your API key
- The Toolkit endpoints are accessible at api.messari.io/ai. For detailed API documentation, visit the [Messari Developer Docs](https://docs.messari.io/reference/chat-completion).

## Prerequisites

- Node.js 18+
- pnpm
- A Messari API key


1. Install dependencies:

```bash
pnpm install
```

2. Create a `.env.local` file in the root directory and add your Messari API key:

```
MESSARI_API_KEY=your_api_key_here
BASE_URL=https://api.messari.io/ai/openai
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## License

MIT
