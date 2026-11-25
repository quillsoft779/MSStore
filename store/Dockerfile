FROM node:24-alpine
WORKDIR /app
COPY package.json server.js ./
COPY src ./src
COPY public ./public
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data TRUST_PROXY=1
# Persistent storage: mount a volume at /data (Railway: attached volume; Docker: -v storedata:/data)
EXPOSE 3000
CMD ["node", "server.js"]
