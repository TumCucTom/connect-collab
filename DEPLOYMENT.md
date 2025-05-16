# Deployment Guide for Cryptic Collective

This guide will help you deploy the Cryptic Collective application to Vercel and set up a PostgreSQL database.

## Deploying to Vercel

1. Push your code to a GitHub repository.

2. Go to [Vercel](https://vercel.com) and sign up/login with your GitHub account.

3. Click **Add New** and select **Project**.

4. Select your repository and click **Import**.

5. Configure the project settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - Output Directory: `.next`

6. Configure the environment variables (see Database section below).

7. Click **Deploy**.

## Setting Up the Database

### Option 1: Vercel Postgres (Recommended)

1. In your Vercel dashboard, go to the **Storage** tab.

2. Click **Connect Database** and select **Postgres**.

3. Follow the setup instructions.

4. Once created, Vercel will automatically add the required environment variables to your project:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

5. Add a new environment variable called `DATABASE_URL` with the value `${POSTGRES_PRISMA_URL}`.

6. Add a new environment variable called `DIRECT_URL` with the value `${POSTGRES_URL_NON_POOLING}`.

### Option 2: Neon (Alternative)

1. Sign up at [neon.tech](https://neon.tech).

2. Create a new project.

3. When the database is ready, go to the **Connection Details** and copy the connection string.

4. In your Vercel project settings, add these environment variables:
   - `DATABASE_URL`: Your Neon connection string
   - `DIRECT_URL`: The same connection string

## Database Migrations

After deploying, you need to run Prisma migrations:

1. In your Vercel project settings, navigate to **Settings** → **Git**.

2. Under **Build & Development Settings**, add this build command:
   ```
   npm run build && npx prisma migrate deploy
   ```

3. For the initial deployment, you may need to run migrations manually:
   ```
   npx prisma db push
   ```

## Testing the Deployment

Once deployed, visit your Vercel URL to ensure the application is working correctly. Check that:

1. You can create a new group
2. You can join an existing group using a code
3. You can create and solve cryptic clues

If you encounter any database connectivity issues, verify that your environment variables are correctly set. 