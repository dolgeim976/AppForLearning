# AI Learning Center

This is an AI-powered Learning Dashboard application built with React, Vite, Tailwind CSS, and an Express backend. It uses OpenRouter and powerful LLM models (like GPT-4o-mini) to generate comprehensive learning roadmaps, interactive practice examples, and quizzes for any given technical topic.

## Features

- **Dynamic Learning Tracks**: Generate detailed roadmaps covering theory, real-world analogies, and common pitfalls.
- **Interactive Quizzes**: Test your knowledge with automatically generated active-recall questions (theory, predict output, spot the bug) featuring full keyboard navigation.
- **Markdown & Syntax Highlighting**: Theory and code examples are beautifully rendered and syntax-highlighted.
- **Responsive & Modern UI**: A sleek, dark-themed UI built with standard Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- [OpenRouter](https://openrouter.ai/) API Key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Copy `.env.example` to `.env` and add your OpenRouter API Key.
   ```bash
   cp .env.example .env
   ```

### Running the Application

To start both the Vite frontend and Express backend concurrently:

```bash
npm run dev
```

- The frontend will be available at `http://localhost:5173`
- The backend will run on `http://localhost:3005`

## Tech Stack

- React
- Typescript
- Vite
- Tailwind CSS
- Express.js
- OpenRouter API (gpt-4o-mini)

## License

MIT
