FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM dependencies AS migrator
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src/db ./src/db
COPY tsconfig.json ./
CMD ["npm", "run", "db:migrate"]

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 UPLOAD_DIR=/app/data/uploads
RUN groupadd --system --gid 1001 hungryowl && useradd --system --uid 1001 --gid hungryowl hungryowl && mkdir -p /app/data/uploads && chown -R hungryowl:hungryowl /app
COPY --from=builder --chown=hungryowl:hungryowl /app/.next/standalone ./
COPY --from=builder --chown=hungryowl:hungryowl /app/.next/static ./.next/static
COPY --from=builder --chown=hungryowl:hungryowl /app/public ./public
COPY --chown=hungryowl:hungryowl scripts/check-env.mjs ./check-env.mjs
USER hungryowl
EXPOSE 3000
CMD ["sh", "-c", "node check-env.mjs && node server.js"]
