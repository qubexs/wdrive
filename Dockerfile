FROM node:20-alpine AS base
RUN apk add --no-cache openssl || true
WORKDIR /app

COPY package.json package-lock.json* ./
RUN (npm ci --ignore-scripts || npm install --legacy-peer-deps --ignore-scripts)

COPY . .

RUN npx prisma generate

ENV SKIP_ENV_VALIDATION=1
ENV DATABASE_URL="postgresql://wdrive:wdrive_secret@wdrive-db:5432/wdrive"
ENV NEXTAUTH_SECRET="5ty/Tw3T3A+Y6zlfT/+7c9L5wqA+sH1ZBPlteNYX/F4="
ENV NEXTAUTH_URL="http://10.44.145.220/wdrive/api/auth"
ENV GOOGLE_CLIENT_ID="dummy"
ENV GOOGLE_CLIENT_SECRET="dummy"
RUN npx next build

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["npm", "run", "start"]
