# 依需求可改 Node 版本
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
COPY scripts ./scripts
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

# 先帶入會被前端使用的公有環境變數（build-time 嵌入）
ENV NEXT_PUBLIC_SKIP_BACKEND_AUTH=false
ENV NEXT_PUBLIC_API_URL=https://brefing-chatbot-llama-workflows-service-730952302890.us-central1.run.app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
# Cloud Run 預設 PORT=8080
ENV PORT=8080

# （可選）在執行階段也保留一份，利於除錯/追蹤
ENV NEXT_PUBLIC_SKIP_BACKEND_AUTH=false
ENV NEXT_PUBLIC_API_URL=https://brefing-chatbot-llama-workflows-service-730952302890.us-central1.run.app

# 非 root 使用者
RUN addgroup -g 1001 nodejs && adduser -D -G nodejs -u 1001 nodeuser

# 拷貝靜態與 standalone 輸出
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER 1001
EXPOSE 8080
CMD ["node", "server.js"]
