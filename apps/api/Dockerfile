# The API image (TRD §15.2): API, sockets and pg-boss in one Node 22 process.
# Build from the repo root, since the API needs its workspace packages:
#
#   docker build -f apps/api/Dockerfile -t bhojnalya-api .
#
# The same image runs the migrate step (`node dist/migrate.js`, as the owner)
# and the API (`node dist/main.js`, as app_user).

FROM node:22.23.1-alpine AS build
ENV CI=true
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=@bhojnalya/api...
# Keep only what the API needs at run time.
RUN rm -rf node_modules apps/*/node_modules packages/*/node_modules \
 && pnpm install --frozen-lockfile --prod --ignore-scripts --filter=@bhojnalya/api...

FROM node:22.23.1-alpine
ENV NODE_ENV=production TZ=UTC PORT=3000
WORKDIR /repo
COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/contracts/package.json ./packages/contracts/
COPY --from=build /repo/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /repo/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=build /repo/packages/db/package.json ./packages/db/
COPY --from=build /repo/packages/db/dist ./packages/db/dist
COPY --from=build /repo/packages/db/migrations ./packages/db/migrations
COPY --from=build /repo/packages/db/node_modules ./packages/db/node_modules
COPY --from=build /repo/apps/api/package.json ./apps/api/
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
WORKDIR /repo/apps/api
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
