FROM openjdk:8-alpine

ARG DB_SECRET
ARG DB_PASSWORD
ARG DB_HOST
ARG DB_PORT
ARG DB_DATABASE
ARG S3_LOG_BUCKET
ARG DIGDAG_VERSION=0.9.38

RUN apk --update add curl && \
    rm -rf /var/cache/apk/* && \
    curl -o /usr/local/bin/digdag -L "https://dl.digdag.io/digdag-${DIGDAG_VERSION}" && \
    chmod a+x /usr/local/bin/digdag

WORKDIR /
COPY digdag.properties .
COPY digdag.sh .
ENTRYPOINT [""]
CMD ["sh", "digdag.sh"]
