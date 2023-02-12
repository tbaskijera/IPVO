FROM nginx

WORKDIR /etc/nginx
COPY ./myconf.conf ./conf.d/default.conf
EXPOSE 80
ENTRYPOINT [ "nginx" ]
CMD [ "-g", "daemon off;" ]