# IPVO

```shell
toni@toni-WRT-WX9:~/IPVO$ curl -s https://storage.googleapis.com/download.tensorflow.org/models/official/20181001_resnet/savedmodels/resnet_v2_fp32_savedmodel_NHWC_jpg.tar.gz | tar --strip-components=2 -C ./resnet -xvz
```
<https://stackoverflow.com/questions/38346847/nginx-docker-container-502-bad-gateway-response>

## Nez kako to nazvat

Prije samog početka postavljanja Docker kompozicije za infrastrukturu sa elemenitima umjetne inteligencije potrebno je provjeriti verziju Docker-a i Docker-compose-a. To činimo pokretanjem naredbi:

```bash
$ docker --version
Docker version 20.10.12, build 20.10.12-0ubuntu4
```

**to ako imas bez unknown stavi svoj izlaz naredbe**

```bash
$ docker-compose --version
docker-compose version 1.29.2, build unknown
```

Kada se uvjerimo da su Docker i Docker-compose instalirani stvaramo direktorij u kojem će se nalaziti sve datoteke potrebne za postavljanje Docker kompozicije za infrastrukturu sa elemenitima umjetne inteligencije.

```bash
$ mkdir IPVO
$ cd IPVO
~/IPVO$ ls -a
.  ..
```

**napisati za etc - proxy** 

## Konfiguracijske datoteke i sadržaj

### docker-compose.yml

U novostvrenom direktoriju IPVO potrebno je kreirati novu datoteku ```docker-compose.yml``` koja omogućava rad i upravljanje sa aplikacijama koje koriste više ```Docker``` kontejnera. Datoteka ima sljedeći sadržaj:

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

Datoteka ```docker-compose.yml``` sadrži četiri usluge odnsosno četiri ```Docker``` kontejnera:
- ```database-container``` 
- ```tensorflow-serving-container```
- ```server-container```
- ```reverse-proxy-container```

Usluga baze podataka koristi prilagođeni kontekst za izgradnju koji se nalazi u direktoriju ```./database```. Kontejneru je dodijeljen naziv ```database-container```. Prilikom pokretanja kontejnera pokrenut će se i naredba ```command: --default-authentication-plugin=mysql_native_password``` koja se koristi za provjeru autentičnosti ```MYSQL``` baze podataka, točnije osigurava da će se provjera autentičnosti izvršiti prilikom povezivanja sa bazom podataka. Specificirano je preslikavanje porta ```3306:3306``` što znači da će se port ```3306``` na hostu preslikati na port ```3306``` u kontejeru. Preslikavanja porta omogućavaju spajanje na bazu podataka čije se izvođenje događa unutar kontejnera, izvan kontejnera uz korištenje IP adrese i porta od host-a. Usluga baze podataka je postavljena tako da se ponovno pokreće i provjerava je li u ispravnom stanju pomoću ```healtcheck```. 
Test baze podataka ```healtcheck``` provodi se kako bi se utvrdilo je li kontejner baze podataka ispravno pokrenut i radi li ispravno. Provjera ispravnosti ima nekoliko dijelova u naredbi, a to su ```mysqladmin``` koji služi za provjeru ispravnosti ```MYSQL``` baze podataka, ```ping``` šalje ping bazi za provjeru je li baza pokrenuta, ```-h``` označava hosta, u našem slučaju je to ```localhost```, ```-uroot``` označava korisnika, u našem slučaju ```root``` i ```-ppass``` označava lozinku korisnika. Naredba se ne izvršava samo jednom, već se povremeno izvodi, odnosno ako se prilikom prvo pokretanja utvrdi da je baza neispravna test ima vremensko ograničenje od 20 sekundi i nakon toga ponavlja postupak još 10 puta. Ako se baza u nekom trenutku pokrene i ispravno radi test se prekida, inače se zaključuje da je baza neispravna.

Usluga ```tensorflow-serving``` koristi prilagođeni kontekst za izgradnju koji se nalazi u direktoriju ```./tensorflow-serving```. Kontejneru je dodijeljen naziv ```tensorflow-serving-container```. Kod ```tensorflow```-a se portovi preslikvaju ```8501:8501```, a ostalim kontejnerima se izlaže port ```8501```. Također, usluga ima svojstvo da se uvijek ponovno pokreće.

Usluga ```server``` koristi prilagođeni kontekst za izgradnju koji se nalazi u direktoriju ```./server```. Kontejneru je dodijeljen naziv ```server-container```. Portovi se preslikavaju ```3000``` na hostu u port ```3000``` u kontejneru, ostalim kontejnerima se izlaže port ```3000```. Također, usluga ima svojstvo da se uvijek ponovno pokreće i ovisi o testu ispravnosti baze podataka.

Usluga ```reverse-proxy``` koristi prilagođeni kontekst za izgradnju koji se nalazi u direktoriju ```./reverse-proxy```. Kontejneru je dodijeljen naziv ```reverse-proxy-container```. Svrha ove usluge je da usmjerava promet sa hosta na ostale usluge ovisno o potrebi. U konfiguraciji usluge ```network_mode``` postavke hosta se koriste za konfiguraciju mrežnog načina djelovanja kontejnera. Točnije, kontejner koristiti mrežni stog host-a kako ne bi morao stvarati novi mrežni stog za kontejner. Usluga ```reverse-proxy``` ima svojstvo ponovnog pokretanja ako se kontejner zaustavi ili sruši te ovisi o postavljenoj usluzi ```server```.

### database

U stvorenom direktoriju ```IPVO``` potrebno je svoriti novi direktorij ```database``` u kojem će se nalaziti datoteke ```Dockerfile```za izgradnju kontejnera sa bazom podataka i ```script.sql``` stvaranje tablice u bazi podtaka.

```bash
~/IPVO$ mkdir database
~/IPVO$ cd database
~/IPVO/database$ touch Dockerfile
~/IPVO/database$ touch script.sql
```

Kao što smo prije spomenuli prvi od kontenjera koje smo kreirali je kontenjer ```database-container```. Njegovo kreiranje pokrenuto je kroz Dockerfile koji se nalazi u direktoriju ```./database.``` Sadržaj tog ```Dockerfile```-a je sljedeći:

```dockerfile
FROM mysql:latest
ENV MYSQL_DATABASE db
ENV MYSQL_ROOT_PASSWORD=somePassword
ADD script.sql /docker-entrypoint-initdb.d
```
Prva naredba je ```FROM``` koja nam specificira koja slika će se koristiti u izgradnji kontenjera tj. u ovom slučaju ```mysql``` i sa najnovijom verzijom zbog latest inačice nakon imena slike. Nakon toga kreirat će se okruženje pomoću naredbe ```ENV```. Prva ```ENV``` naredba kreirat će nam novu mysql bazu pod imenom db, a druga ```ENV``` naredba specificira koja će se lozinka koristiti za administratora. Posljednja nareba ```ADD``` kopira skriptu koju ćemo kasnije opisati pod nazivom ```script.sql``` i kopira je u direktorij ```docker-entrypont-initdb.d```. Skripta koju smo spomenuli izgleda ovako:

```sql
CREATE TABLE predictions (id INT PRIMARY KEY AUTO_INCREMENT, request VARCHAR(200),response VARCHAR(100), time_of_request VARCHAR(100), time_of_response VARCHAR(100), time_elapsed INT);
```

Pomoću ove ```SQL``` naredbe kreirali smo tablicu pod imenom ```prediction``` u koju ćemo spremati naše podatke o predikciji koji će se provoditi. Svaka instanca tablice sastojat će se od: ```id``` cijelobrojna vrijednost koji je primarni ključ i automatski se povećava, ```request``` teksta od 200 znakova koji je upit koji smo napravili na predikciji, ```response``` tekst od 100 znakova koji je odgovor našeg modela na tj. odgovor na predikciju, ```time_of_request``` tekst od 100 znakova koji nam govori kada je upit poslan, ```time_of_response``` tekst od 100 znakova koji nam govori kada je odgovor stigao i ```time_elapsed``` cijelobrojna vrijednost koja nam govori koliko je vremena prošlo između upita i odgovora.


### reverse-proxy

### server

### tensorflow-serving


## Literatura
[1] <https://stackoverflow.com/questions/38346847/nginx-docker-container-502-bad-gateway-response>
