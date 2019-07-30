#!/bin/sh 
sed -i -e "s/<DB_USERNAME>/${DB_USERNAME}/" \
    -e "s/<DB_PASSWORD>/${DB_PASSWORD}/" \
    -e "s/<DB_HOST>/${DB_HOST}/" \
    -e "s/<DB_PORT>/${DB_PORT}/" \
    -e "s/<DB_DATABASE>/${DB_DATABASE}/" \
    -e "s/<S3_LOG_BUCKET>/${S3_LOG_BUCKET}/" digdag.properties

/usr/local/bin/digdag server --config digdag.properties