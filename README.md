# Cryptic Collective

A platform for sharing and solving cryptic crossword clues with friends.

## Features

- Create and join groups with unique codes
- Share cryptic crossword clues
- Solve other members' clues
- Track scores on a leaderboard
- Real-time updates

## Local Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your local database:
   - Install PostgreSQL locally
   - Create a new database called `cryptic_collective`
   - Create a `.env` file with your database connection string:
     ```
     DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cryptic_collective"
     ```

3. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment on Vercel

1. Create a new project on Vercel
2. Connect your GitHub repository
3. Add the following environment variables in Vercel:
   - `DATABASE_URL`: Your Vercel Postgres connection string

4. Deploy!

## Database Setup on Vercel

1. Create a new Postgres database in your Vercel project:
   ```bash
   vercel storage create
   ```

2. Link the database to your project:
   ```bash
   vercel link
   vercel env pull
   ```

3. Push the schema:
   ```bash
   npx prisma db push
   ```

## Tech Stack

- Next.js 14 (App Router)
- Prisma ORM
- PostgreSQL
- Tailwind CSS
- TypeScript
