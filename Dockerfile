FROM node:20.18.1-alpine

ENV NODE_ENV=production
ENV PORT=80
ARG REDIS_PASSWORD
ENV REDIS_PASSWORD=${REDIS_PASSWORD}

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

RUN corepack enable && yarn install --immutable

COPY . .

EXPOSE 80

CMD ["yarn", "start"]
