FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Setting DeepSeek OCR endpoint to localhost proxy mapping for docker-compose networking
ARG VITE_DEEPSEEK_ENDPOINT="http://localhost:8000/ocr"
ENV VITE_DEEPSEEK_ENDPOINT=$VITE_DEEPSEEK_ENDPOINT
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
