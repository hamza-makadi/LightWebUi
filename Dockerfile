FROM nginx:alpine

RUN addgroup -S zerogroup && adduser -S zerouser -G zerogroup

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/lightwebui.conf

COPY . /usr/share/nginx/html/

RUN touch /var/run/nginx.pid && \
    chown -R zerouser:zerogroup /var/run/nginx.pid /var/cache/nginx /var/log/nginx /usr/share/nginx/html

USER zerouser
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
