# IPVO

Opisati zadatak

## Inicijalizacija projekta

Prije samog početka postavljanja Docker kompozicije za infrastrukturu sa elementima umjetne inteligencije potrebno je provjeriti verziju Dockera i Docker-composea:

```bash
$ docker --version
Docker version 20.10.18, build b40c2f6
$ docker-compose --version
docker-compose version 1.29.2, build 5becea4c
```

Kada se uvjerimo da su Docker i Docker-compose instalirani stvoriti ćemo korijenski direktorij projekta, u kojem ćemo nakon toga dodati i sve potrebne poddirektorije i datoteke. Krajnja struktura projekta biti će sljedećeg oblika:

```bash
$ mkdir IPVO
$ cd IPVO
~/IPVO$ tree
.
├── database
│   ├── Dockerfile
│   └── script.sql
├── docker-compose.yml
├── README.md
├── reverse-proxy
│   ├── Dockerfile
│   └── konfa.conf
├── server
│   ├── api.js
│   ├── app.js
│   ├── db.html
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   └── predict.html
└── tensorflow-serving
    ├── boston_model
    │   └── 0000001
    │       ├── keras_metadata.pb
    │       ├── saved_model.pb
    │       └── variables
    │           ├── variables.data-00000-of-00001
    │           └── variables.index
    ├── Dockerfile
    ├── predict.py
    └── train.py

7 directories, 20 files
```

**napisati za etc - proxy**

## Konfiguracijske datoteke i sadržaj

### docker-compose.yml

Prvu datoteku koju ćemo kreirati u novom direktoriju je ```docker-compose.yml```, u kojoj ćemo definirati i konfigurirati našu aplikaciju koja će se sastojati od više međusobno povezanih kontejnera. Datoteka ima sljedeći sadržaj:

```yml
version: '3.9'

services:

  database:
    build: ./database
    container_name: database-container
    command: --default-authentication-plugin=mysql_native_password
    ports:
      - "3306:3306"
    restart: always
    healthcheck:
      test:
        [
          "CMD",
          "mysqladmin",
          "ping",
          "-h",
          "localhost",
          "-uroot",
          "-ppass"
        ]
      timeout: 20s
      retries: 10

  tensorflow-serving:
    build: ./tensorflow-serving
    container_name: tensorflow-serving-container
    ports:
      - "8501:8501"
    expose:
      - 8501
    restart: always

  server:
    build: ./server
    container_name: server-container
    ports:
      - "3000:3000"
    expose:
      - 3000
    restart: always
    depends_on:
      database:
        condition: service_healthy

  reverse-proxy:
    build: ./reverse-proxy
    container_name: reverse-proxy-container
    network_mode: host
    restart: always
    depends_on:
      - server
```

Datoteka ```docker-compose.yml``` sadrži četiri servisa od kojih će se svaki pokrenuti u zasebnom kontejneru:

- ```database-container```
- ```tensorflow-serving-container```
- ```server-container```
- ```reverse-proxy-container```

Usluga baze podataka koristi prilagođeni kontekst za izgradnju koji se nalazi u direktoriju ```./database```. Kontejneru je dodijeljen naziv ```database-container```. Prilikom pokretanja kontejnera pokrenut će se i naredba ```command: --default-authentication-plugin=mysql_native_password``` koja se koristi za provjeru autentičnosti ```MYSQL``` baze podataka, odnosno osigurava da će se provjera autentičnosti izvršiti prilikom povezivanja s istom. Specificirano je mapiranje portova ```3306:3306```, što znači da će se port ```3306``` na hostu mapirati na port ```3306``` u kontejeru. Mapiranje portova omogućavaja spajanje na bazu podataka koja se izvodi unutar kontejnera, izvana, uz korištenje IP adrese i porta na hostu. Usluga baze podataka je postavljena tako da se ponovno pokreće i provjerava je li u ispravnom stanju pomoću ```healtchecka```.
Test baze podataka ```healtcheck``` provodi se kako bi se utvrdilo je li kontejner baze podataka ispravno pokrenut i radi li ispravno. Provjera ispravnosti ima nekoliko dijelova u naredbi. To su ```mysqladmin```, koji služi za provjeru ispravnosti ```MYSQL``` baze podataka, ```ping``` , koji šalje ping bazi za provjeru kako bi provjerio je li baza pokrenuta, ```-h``` označava hosta (u našem slučaju je to ```localhost```), zatim ```-uroot``` koji označava korisnika, (u našem slučaju ```root```) i na kraju```-pass```, koji označava lozinku korisnika. Naredba se ne izvršava samo jednom, već se povremeno izvodi. Ako se prilikom prvog pokretanja utvrdi da je baza neispravna test ima vremensko ograničenje od 20 sekundi i nakon toga ponavlja postupak još 10 puta. Ako se baza u nekom trenutku pokrene, i radi ispravno, test se prekida, inače se zaključuje da je baza neispravna.

Usluga ```tensorflow-serving``` koristi prilagođeni kontekst za izgradnju koji se nalazi u direktoriju ```./tensorflow-serving```. Kontejneru je dodijeljen naziv ```tensorflow-serving-container```. Kod navedenog servisa se port ```8501``` na hostu mapira na istog na pripadnom kontejneru, a ostalim kontejnerima se isti i izlaže. Također, usluga ima svojstvo da se uvijek ponovno pokreće.

Usluga ```server``` koristi prilagođeni kontekst za izgradnju koji se nalazi u direktoriju ```./server```. Kontejneru je dodijeljen naziv ```server-container```. Kod navedenog servisa se port ```3000``` na hostu mapira na istog na pripadnom kontejneru, a ostalim kontejnerima se isti i izlaže. Također, usluga ima svojstvo da se uvijek ponovno pokreće, a ovisi o testu ispravnosti baze podataka.

Usluga ```reverse-proxy``` koristi prilagođeni kontekst za izgradnju koji se nalazi u direktoriju ```./reverse-proxy```. Kontejneru je dodijeljen naziv ```reverse-proxy-container```. Svrha ove usluge je da usmjerava promet sa hosta na ostale usluge ovisno o potrebi. U konfiguraciji usluge ```network_mode``` postavke hosta se koriste za konfiguraciju mrežnog načina djelovanja kontejnera. Točnije, kontejner koristiti mrežni stog host-a kako ne bi morao stvarati novi mrežni stog za kontejner. Usluga ```reverse-proxy``` ima svojstvo ponovnog pokretanja ako se kontejner zaustavi ili sruši te ovisi o postavljenoj usluzi ```server```.

### database

Sljedeći direktorij kojeg treba stvoriti je ```database```, u kojem će se nalaziti datoteke ```Dockerfile``` i ```script.sql```,za izgradnju kontejnera sa bazom podataka i stvaranje tablice u bazi podataka, respektivno.

```bash
~/IPVO$ mkdir database
~/IPVO$ cd database
~/IPVO/database$ touch Dockerfile
~/IPVO/database$ touch script.sql
```

Kao što smo prije spomenuli, prvi od kontenjera koje smo kreirali je kontejner ```database-container```. Njegovo kreiranje pokrenuto je kroz Dockerfile koji se nalazi u direktoriju ```./database.``` Sadržaj tog ```Dockerfilea``` je sljedeći:

```dockerfile
FROM mysql:latest
ENV MYSQL_DATABASE db
ENV MYSQL_ROOT_PASSWORD=somePassword
ADD script.sql /docker-entrypoint-initdb.d
```

Prva naredba je ```FROM``` koja nam specificira koja slika će se koristiti u izgradnji kontenjera, u ovom slučaju ```mysql```, i sa najnovijom verzijom zbog `latest` inačice nakon imena slike. Naredbom `ENV` specificirati ćemo varijable okoline, a to su ime baze i lozinka koja će se koristiti za pristup. Posljednja nareba ```ADD``` kopira skriptu (koju ćemo kasnije opisati), naziva ```script.sql``` i kopira je u direktorij ```docker-entrypont-initdb.d```, gdje će se i incijalizirati.

```sql
CREATE TABLE predictions (id INT PRIMARY KEY AUTO_INCREMENT, request VARCHAR(200),response VARCHAR(100), time_of_request VARCHAR(100), time_of_response VARCHAR(100), time_elapsed INT);
```

Pomoću ove ```SQL``` naredbe kreirali smo tablicu pod imenom ```prediction```, u koju ćemo spremati naše podatke o predikcijama koje će se provoditi.

Svaka instanca tablice imati će sljedeće atribute:

- ```id```- cijelobrojna vrijednost koji je primarni ključ i automatski se povećava
- `request`- tekst od 200 znakova koji pohranjuje upit koji će biti upućen pametnom modelu
- ```response```- tekst od 100 znakova koji pohranjuje odgovor našeg modela odnosno odgovor na upit
- ```time_of_request``` - tekst od 100 znakova koji pohranjuje vrijeme slanja upita
- `time_of_response`- tekst od 100 znakova koji nam govori kada je odgovor stigao
- `time_elapsed`- cijelobrojna vrijednost koja nam govori koliko je vremena prošlo između upita i odgovora.

### reverse-proxy

Zatim je potrebno stvoriti direktorij ```reverse-proxy```, u kojem će se nalaziti datoteke ```Dockerfile``` i `my.conf`, za izgradnju kontejnera sa `nginx` slikom i pripadnom konfiguracijom, respektivno.

```bash
~/IPVO$ mkdir reverse-proxy
~/IPVO$ cd reverse-proxy
~/IPVO/reverse-proxy$ touch Dockerfile
~/IPVO/reverse-proxy$ touch myconf.conf
```

Sadržaj datoteke ```Dockerfile``` je sljedeći:

```Dockerfile
FROM nginx
WORKDIR /etc/nginx
COPY ./myconf.conf ./conf.d/default.conf
EXPOSE 80
ENTRYPOINT [ "nginx" ]
CMD [ "-g", "daemon off;" ]
```

Za stvaranje kontejera se koristi slika ```nginx``` koja se skida iz ```Docker Huba```. Naredba ```WORKDIR``` postavlja radni direktorij na ```/etc/nginx``` unutar kontejnera. Datoteka ```myconf.conf``` se kopira u direktorij ```/etc/nginx/conf.d``` te se preimenuje u ```default.conf```. Nadalje, postavlja se port ```80``` na koji kontejner sluša. Naredba ```ENTRYPOINT``` služi za dodavanje naredbe ```nginx``` koja će se pokrenuti pri pokretanju kontejnera. Pomoću naredbe ```CMD``` dodajemo argumente za naredbu ```nginx```, a u našem slučaju to su ```-g```, za kreiranje globalnih direktiva za ```Nginx```, i ```daemon off```, koji onemogućava pokretanje ```Nginx-a``` u pozadini (pokreće se u prvom planu kako bi se mogli čitati logovi).

Sadržaj konfiguracijske datoteke ```myconf.conf``` je sljedeći:

```conf
server {
  
  listen 80;
  listen [::]:80;

  server_name ipvo.to;

  location /db/post {
    proxy_pass http://127.0.0.1:3000/db/post;
    proxy_connect_timeout 1000;
    proxy_send_timeout 1000;
    proxy_read_timeout 1000;
    send_timeout 1000;
  }

  location /db/get {
    proxy_pass http://127.0.0.1:3000/db/get;
  }

  location /api {
    proxy_pass http://127.0.0.1:8501/v1/models/boston_model:predict;
    proxy_redirect     off;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Host $server_name;
    add_header Access-Control-Allow-Origin *;
  }

  location /predict {
    proxy_pass http://127.0.0.1:3000/predict;
  }

  location / {
    proxy_pass http://127.0.0.1:3000/;
  }
}
```

Na početku konfiguracijske datoteke postavljen je port ```80``` za HTTP zahtjeve i port ```80``` za zahtjeve kreirane pomoću IPv6 adresa. Nakon toga je postavljen naziv servera ```server_name``` na ```ipvo.to```.

Definirano je pet blokova sa lokacijama i pravilima prosljeđivanja.

Prvi blok sa lokacijom ```/db/post``` definira da se zahtjevi na toj lokaciji prosljeđuju na URL <http://127.0.0.1:3000/db/post>. Naredbe ```proxy_connect_timeout```, ```proxy_send_timeout```, ```proxy_read_timeout``` i ```send_timeout``` koriste se za postavljanje vremenskih ograničenja na proxy vezu. Vremena čekanja osiguravaju da zahtjevi ne čekaju beskonačno dugo, u slučaju da je proxy poslužitelj nedostupan.

Drugi blok sa lokacijom ```/db/get``` pomoću naredbe ```proxy_pass``` definira presumjeravanje svih zahtjeva na URL <http://127.0.0.1:3000/db/get>

Treći blok sa lokacijom ```/api``` zahtjeve prosljeđuje na URL <http://127.0.0.1:8501/v1/models/boston_model:predict> na kojem se izvršavaju predviđanja za unesene podatke. Direktiva ```proxy_redirect``` postavljena je na ```off```, što znači da ```Nginx``` neće pratiti preusmjeravanja s proxy poslužitelja. Direktive ```proxy_set_header``` prosljeđuju informacije o izvornom zahtjevu proxy poslužitelju, uključujući host, pravu IP adresu klijenta, host poslužitelja i IP adresu klijenta. Za dodavanje zaglavlja se koristi direktiva ```add_header Access-Control-Allow-Origin *```. Takvo zaglavlje dozvoljava "cros-origin" dijeljenje resursa sa raznih domena.

Četvrti blok sa lokacijom ```/predict``` zahtjeve prosljeđuje na URL <http://127.0.0.1:3000/predict> pomoću direktive ```proxy_pass```.

Peti blok sa lokacijom ```/``` zahtjeve prosljeđuje na URL <http://127.0.0.1:3000/> pomoću direktive ```proxy_pass```.

### server

### tensorflow-serving

U stvorenom direktoriju `IPVO` potrebno je novi direktorij pod nazivom `tensorflow-serving` u kojem ćemo kreirati `Dockerfile` za izgradnju kontenjera.

```bash
~/IPVO$ mkdir tensorflow-serving
~/IPVO$ cd tensorflow-serving
~/IPVO/database$ touch Dockerfile
``` 
Kao što je prije spomenuto kreirat će se kontenjer pod imenom `tensorflow-serving-container `. 
Sadržaj pripadnog `Dockerfilea`:

```Dockerfile
FROM tensorflow/serving:latest
WORKDIR /app
COPY . /app
ENV MODEL_NAME boston_model
ENV MODEL_BASE_PATH /app/
EXPOSE 8501
CMD ["sh", "-c", "tensorflow_model_server --model_name=$MODEL_NAME --model_base_path=$MODEL_BASE_PATH"]
``` 

Naredba `FROM` koristit se za stvaranje slike `tensorflow/serving` koja se skida iz `Docker Huba`, a `latest` označava da se radi o najnovijoj verziji slike. Sljedeća naredba `WORKDIR` postavlja radni direktorij na `/app`. Naredba `COPY` kopira sav sadržaj trenutnog direktorija u `/app` direktorij u `Docker` kontejneru. Naredba `ENV MODEL_NAME` kreira varijablu okruženja `MODEL_NAME` te joj vrijednost postavlja na ```boston_model```, a varijabli okoline `MODEL_BASE_PATH` postavlja vrijdnost `/app/`. Nadalje, postavlja se port ```8501``` na koji sluša kontejner. Pomoću `CMD` se definiraju naredbe koje je potrebno pokrenuti čim se pokrene kontejner. U ovom slučaju je to naredba 
 `["sh", "-c", "tensorflow_model_server --model_name=$MODEL_NAME --model_base_path=$MODEL_BASE_PATH"]`
Pokretanje shella je definirano pomoću `sh`, `-c` označava da naredba koja slijedi se treba pokrenuti u shellu, `tensorflow_model_server` je program naredbenog retka koji nudi `TensorFlow` i pokreće TensorFlow Serving REST API, argumenti koji slijede `--model_name` i `--model_base_path` označavaju ime i putanju do modela koji služi za stvarnje predikcija.

Model i pripadne datoteke za stvaranje modela (`predict.py` i `train.py`) nismo sami kreirali, već smo preuzeli postojeće na [poveznici](https://towardsdatascience.com/hosting-models-with-tf-serving-on-docker-aceff9fbf533).


## Literatura
[1] <https://stackoverflow.com/questions/38346847/nginx-docker-container-502-bad-gateway-response>  
[2] <https://towardsdatascience.com/hosting-models-with-tf-serving-on-docker-aceff9fbf533>
