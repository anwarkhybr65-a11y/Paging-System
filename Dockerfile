FROM alpine:latest
ARG PB_VERSION=0.41.1
RUN apk add --no-cache ca-certificates unzip wget zip zstd
ADD https://ganigeorgiev.com/meta/pocketbase/pocketbase/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/
COPY ./pb_migrations /pb/pb_migrations
COPY ./pb_hooks /pb/pb_hooks
EXPOSE 8080
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
