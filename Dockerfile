FROM node:20.16

RUN apt update
RUN apt install -y ffmpeg

WORKDIR /opt/api

COPY .yarn .yarn
COPY .yarnrc.yml .
COPY package.json .
COPY yarn.lock .

RUN yarn --immutable

COPY . .

RUN yarn build

ENTRYPOINT ["yarn", "start"]
