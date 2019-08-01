FROM openjdk:8-alpine

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
