# Mukoto Bot

A WhatsApp bot for event ticketing and management, built with TypeScript, Express, and Drizzle ORM.

## Features

- 🎫 Event ticket purchasing via WhatsApp
- 📱 QR code generation for tickets
- 💳 Payment integration with Paynow
- 🎯 Event search and categorization
- 📍 Location sharing for events
- 🔐 Secure ticket validation and check-in
- ☁️ AWS S3 integration for file storage
- 📊 Comprehensive logging and error handling

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Messaging**: WhatsApp Cloud API
- **Storage**: AWS S3
- **Payment**: Paynow Gateway
- **Code Quality**: ESLint, Prettier, Husky

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- WhatsApp Business Account
- AWS S3 bucket
- Paynow merchant account

### Installation

1. Clone the repository:

```bash
git clone https://github.com/gurukota/mukoto-bot.git
cd mukoto-bot
```

2. Install dependencies:

```bash
npm install
```

3. Copy environment variables:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`

5. Set up the database:

```bash
npm run db:generate
npm run db:migrate
```

6. Build the project:

```bash
npm run build
```

7. Start the development server:

```bash
npm run dev
```

## Scripts

- `npm run build` - Build the TypeScript project
- `npm run start` - Start the production server
- `npm run dev` - Start development server with hot reload
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── env.ts       # Environment configuration
│   ├── session.ts   # Session management
│   └── state.ts     # User state management
├── db/              # Database configuration
│   ├── index.ts     # Database connection
│   ├── schema.ts    # Database schema
│   └── relations.ts # Database relations
├── handlers/        # Request handlers
│   └── webhookHandler.ts
├── lambda/          # AWS Lambda functions
│   └── cron.ts
├── repository/      # Data access layer
│   ├── categoriesDal.ts
│   ├── eventsDal.ts
│   ├── ticketsDal.ts
│   └── ...
├── types/           # TypeScript type definitions
│   └── index.ts
├── utils/           # Utility functions
│   ├── logger.ts    # Logging utility
│   ├── errorHandler.ts # Error handling
│   ├── validation.ts # Input validation
│   ├── whatsapp.ts  # WhatsApp API wrapper
│   ├── payment.ts   # Payment processing
│   ├── s3.ts        # AWS S3 operations
│   └── ...
└── server.ts        # Main application entry point
```

## Environment Variables

See `.env.example` for a complete list of required environment variables.

### Key Variables:

- `DATABASE_URL` - PostgreSQL connection string
- `WA_ACCESS_TOKEN` - WhatsApp Cloud API access token
- `WA_VERIFY_TOKEN` - WhatsApp webhook verification token
- `PAYNOW_INTEGRATION_ID` - Paynow integration ID
- `PAYNOW_INTEGRATION_KEY` - Paynow integration key
- `AWS_S3_BUCKET` - S3 bucket for file storage

## API Endpoints

- `GET /webhook` - WhatsApp webhook verification
- `POST /webhook` - WhatsApp message handling
- `GET /health` - Health check endpoint

## WhatsApp Integration

The bot handles various WhatsApp message types:

- Text messages for search and commands
- Button replies for menu navigation
- List selections for event/ticket choices
- Location sharing for event venues

### Supported Commands:

- Find events by search or category
- Purchase tickets with payment processing
- View and resend tickets
- Check event locations
- QR code ticket validation

## Error Handling

The application includes comprehensive error handling:

- Custom error classes for different error types
- Centralized error logging with context
- User-friendly error messages
- Graceful fallbacks for external service failures

## Security

- Input validation and sanitization
- Environment variable validation
- Secure database connection pooling
- Rate limiting considerations
- Error message sanitization

## Development

### Code Quality

The project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for pre-commit hooks
- **TypeScript** for type safety

### Pre-commit Hooks

Pre-commit hooks automatically:

- Run ESLint and fix issues
- Format code with Prettier
- Validate TypeScript compilation

## Deployment

1. Build the project:

```bash
npm run build
```

2. Set production environment variables

3. Start the production server:

```bash
npm start
```

### Docker Support (Coming Soon)

A Dockerfile will be provided for containerized deployment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support, please contact the development team or create an issue in the repository.
