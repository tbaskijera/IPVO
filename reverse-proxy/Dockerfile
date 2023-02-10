FROM nginx

WORKDIR /etc/nginx
COPY ./konfa.conf ./conf.d/default.conf
EXPOSE 80
ENTRYPOINT [ "nginx" ]
CMD [ "-g", "daemon off;" ]