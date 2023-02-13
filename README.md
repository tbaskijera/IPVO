# Infrastruktura za podatke velikog obujma - završni projekt

**Autor:** Toni Baskijera, Rafael Dominik Lakoseljac, Martina Sirotić

**Datum:** 13. veljače 2022.

## Opis zadatka

Zadatak završnog projekta je razvoj mikroservisne aplikacije pomoću Docker kompozicije koja će pomoću web sučelja omogućavati interakciju s modelom strojnog učenja, te upis podataka predikcija u bazu.

## Inicijalizacija projekta

Prije samog početka postavljanja Docker kompozicije za infrastrukturu sa elementima umjetne inteligencije potrebno je provjeriti verziju Dockera i Docker-composea:

```shell
$ docker --version
Docker version 20.10.18, build b40c2f6
$ docker-compose --version
docker-compose version 1.29.2, build 5becea4c
```

Kada se uvjerimo da su Docker i Docker-compose instalirani stvoriti ćemo korijenski direktorij projekta, u kojem ćemo nakon toga dodati i sve potrebne poddirektorije i datoteke. Krajnja struktura projekta biti će sljedećeg oblika:

```shell
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

Zatim je potrebno stvoriti direktorij ```reverse-proxy```, u kojem će se nalaziti datoteke ```Dockerfile``` i `myconf.conf`, za izgradnju kontejnera sa `nginx` slikom i pripadnom konfiguracijom, respektivno.

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

Važno je napomenuti kako je potrebno i mapirati adresu `http://ipvo.to` na `127.0.0.1`, u datoteci `/etc/hosts`:

```conf
$ cat /etc/hosts
127.0.0.1       localhost ipvo.to
...
```

### server

Za postavljanje servera smo, kao i za prijašnje servise, stvorili zasebni direktorij.

Unutar navedenog direktorija, najprije smo izradili datoteku `package.json` u kojoj smo naveli pakete i konfiguraciju koje će `node.js` server koristiti:

```json
{
    "name": "server",
    "version": "0.0.0",
    "private": true,
    "scripts": {
        "start": "node app.js"
    },
    "dependencies": {
        "body-parser": "1.20.1",
        "express": "4.18.2",
        "mysql": "2.18.1"
    }
}
```

gdje je paket:

- `express` - razvojni okvir za `node.js` koji omogućava lakši razvoj web aplikacija
- `body-parser` - middleware za baratanje HTTP zahtjevima
- `mysql` - `nodejs` driver za `mysql` bazu podataka koju koristimo, pruža jednostavan API za komunikaciju s bazom

Tada je potrebno stvoriti datoteku `app.js` u kojoj ćemo definirati naš server i njegovu konfiguraciju:

```js
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');

const api = require('./api');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', api);

const port = process.env.PORT || '3000';
app.set('port', port);
const server = http.createServer(app);
server.listen(port, () => console.log(`Server running on port:${port}`));
```

Linija koda `app.use('/', api)` postavlja rukovatelja rutama za korijenski URL aplikacije. API modul se koristi za obradu zahtjeva koji odgovaraju ovoj ruti, a definirati ćemo ga u datoteci `api.js`.

U datoteci `api.js` definirati ćemo Express usmjerivač, koji, kako smo i spomenuli, obrađuje HTTP zahtjeve za određene rute:

```js
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const mysql = require('mysql');
const fs = require('fs')

router.use(bodyParser.json());

const con = mysql.createConnection({
    host: "database",
    user: "root",
    port: '3306',
    password: "somePassword",
    database: "db",
    charset  : 'utf8'
});

con.connect(function(err) {
    if(err) throw err;
    console.log("Connected to MYSQL");

    con.query('SELECT * FROM predictions', function (err, rows, fields) {
        if (err) throw err;
        console.log(rows);
      });
});

router.get('/',(req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    fs.createReadStream('index.html').pipe(res)
    
});

router.get('/predict',(req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    fs.createReadStream('predict.html').pipe(res)
    
});

router.get('/db',(req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    fs.createReadStream('db.html').pipe(res)
    
});

router.post('/db/post', (req, res) => {
   console.log(req.body)
    const data = {
        request: req.body.request,
        response: req.body.response,
        time_of_request: req.body.time_of_request,
        time_of_response: req.body.time_of_response,
        time_elapsed: req.body.time_elapsed
        
    };
   
    con.query(`INSERT INTO predictions (request, response, time_of_request, time_of_response, time_elapsed) VALUES (?, ?, ?, ?, ?);`, [req.body.request, req.body.response, req.body.time_of_request, req.body.time_of_response, req.body.time_elapsed], (error, results, fields) => {
        if (error) {
            console.error('Error inserting data: ' + error.stack);
            res.status(500).send('Error inserting data');
        } else {
            console.log('Inserted data with ID ' + results.insertId);
            res.send('Data inserted successfully');
        }
    });
});

router.get('/db/get',(req, res) => {
    con.query("SELECT * FROM predictions", function (err, result, fields) {
        if (err) res.send(err);
        res.send(result);
        console.log(result);
        
        
    });
});

module.exports = router;
```

U prikazanom kodu najprije uključujemo potrebne pakete,  definiramo parametre konekcije sa `mysql` bazom, a zatim i uspostavljamo konekciju. Nadalje, definirali smo rute koje vraćaju određene web stranice koje će naš poslužitelj posluživati, kao i rute koje će se koristiti za upis i ispis baze.

Zatim ćemo datotekom `index.html` opisati jednostavnu, početnu stranicu aplikacije:

```html
<!DOCTYPE html>
<html>

<head>
    <title>Menu</title>
</head>

<body>
    <h1>Menu</h1>
    <ul>
        <li><a href="/predict">Predict</a></li>
        <li><a href="/db">Database</a></li>
    </ul>
</body>

</html>
```

Sljedeća datoteka na redu je `db.html`, stranica na kojoj će se prikazivati ispis baze podataka:

```js
<!DOCTYPE html>
<html>

<head>
    <style>
        table,
        th,
        td {
            border: 1px solid black;
            border-collapse: collapse;
        }

        th {
            border: 2px solid black;
            border-collapse: collapse;
        }
    </style>
    <title>Database</title>
</head>

<body onload="displayDB()">
    <div id="dataContainer"></div>
    <script>
        const dataContainer = document.getElementById("data-container");
        async function fetchData() {
            try {
                const response = await fetch('http://ipvo.to/db/get');
                const jsonData = await response.json();
                const data = JSON.stringify(jsonData);
                // console.log(data);
                return data;

            } catch (error) {
                console.error(error);
                return error;
            }
        }

        async function displayDB() {
            const container = document.getElementById("dataContainer");

            const dataDB = JSON.parse(await fetchData().then(res => {
                return res;
            }));
            console.log("Fetch data: " + dataDB);

            const table = document.createElement("table");
            table.style.width = "98%";
            const headerRow = document.createElement("tr");

            const idHeader = document.createElement("th");
            idHeader.innerHTML = "id";
            headerRow.appendChild(idHeader);

            const requestHeader = document.createElement("th")
            requestHeader.innerHTML = "request";
            requestHeader.style.width = "50%";
            headerRow.appendChild(requestHeader);

            const responseHeader = document.createElement("th");
            responseHeader.innerHTML = "response";
            headerRow.appendChild(responseHeader);

            const timeReq = document.createElement("th");
            timeReq.innerHTML = "time_of_request";
            headerRow.appendChild(timeReq);

            const timeRes = document.createElement("th");
            timeRes.innerHTML = "time_of_response";
            headerRow.appendChild(timeRes);

            const timeElapsed = document.createElement("th");
            timeElapsed.innerHTML = "time_elapsed";
            headerRow.appendChild(timeElapsed);

            table.appendChild(headerRow);

            for (const item of dataDB) {
                const row = document.createElement("tr");

                const idCell = document.createElement("td");
                idCell.innerHTML = item.id;
                row.appendChild(idCell);

                const requestCell = document.createElement("td");
                requestCell.innerHTML = item.request;
                row.appendChild(requestCell);

                const responseCell = document.createElement("td");
                responseCell.innerHTML = item.response;
                row.appendChild(responseCell);

                const timeOfRequestCell = document.createElement("td");
                timeOfRequestCell.innerHTML = item.time_of_request;
                row.appendChild(timeOfRequestCell);

                const timeOfResponseCell = document.createElement("td");
                timeOfResponseCell.innerHTML = item.time_of_response;
                row.appendChild(timeOfResponseCell);

                const timeOElapsedCell = document.createElement("td");
                timeOElapsedCell.innerHTML = item.time_elapsed;
                row.appendChild(timeOElapsedCell);

                table.appendChild(row);
            }

            container.appendChild(table);
        }

    </script>
</body>

</html>
```

Podatke iz tablice smo dobiti ćemo slanjem zahtjeva na adresu `http://ipvo.to/db/get`, kojeg će proxy proslijediti na adresu s rutom definiranoj u expressu, `http://localhost/db/get`.

Posljednja html datoteka je `predict.html`, koja definira stranicu aplikacije na kojoj se unose podaci koji služe kao parametri predikcije, a zatim i prikazuje sam rezultat:

```js
<!DOCTYPE html>
<html>

<body>

  <h2>Number input fields</h2>

  <form id="myForm">
    <label for="crim">per capita crime rate by town</label><br>
    <input type="number" id="crim" name="crim" step=".01"><br>

    <label for="zn">proportion of residential land zoned for lots over 25,000 sq.ft.</label><br>
    <input type="number" id="zn" name="zn" step=".01"><br>

    <label for="indus">proportion of non-retail business acres per town </label><br>
    <input type="number" id="indus" name="indus" step=".01"><br>

    <label for="chas">Charles River dummy variable (= 1 if tract bounds river; 0 otherwise)</label><br>
    <input type="number" id="chas" name="chas" step=".01"><br>

    <label for="nox">nitric oxides concentration (parts per 10 million)</label><br>
    <input type="number" id="nox" name="nox" step=".01"><br>

    <label for="rm">average number of rooms per dwelling</label><br>
    <input type="number" id="rm" name="rm" step=".01"><br>

    <label for="age">proportion of owner-occupied units built prior to 1940</label><br>
    <input type="number" id="age" name="age" step=".01"><br>

    <label for="dis">weighted distances to five Boston employment centres</label><br>
    <input type="number" id="dis" name="dis" step=".01"><br>

    <label for="rad">index of accessibility to radial highways</label><br>
    <input type="number" id="rad" name="rad" step=".01"><br>

    <label for="tax">full-value property-tax rate per $10,000</label><br>
    <input type="number" id="tax" name="tax" step=".01"><br>

    <label for="ptratio">pupil-teacher ratio by town</label><br>
    <input type="number" id="ptratio" name="ptratio" step=".01"><br>

    <label for="b">1000(Bk - 0.63)^2 where Bk is the proportion of blacks by town</label><br>
    <input type="number" id="b" name="b" step=".01"><br>

    <label for="lstat">% lower status of the population</label><br>
    <input type="number" id="lstat" name="lstat" step=".01"><br>

    <br>

    <button type="submit">Submit</button> <br>

    <br>

    <label for="rm">Predicted value - MEDV - Median value of
      owner-occupied homes in
      $1000's: </label>
    <p id="predict"> </p>
  </form>

  <button onclick="location.reload(); event.stopPropagation();">Refresh</button><br>

  <script>

    let prediction;

    document.addEventListener("valueChanged", function () {
      alert("New entry added to database!");
    });

    function updateValue(value) {
      prediction = value["predictions"][0][0];
      const event = new Event("valueChanged");
      document.dispatchEvent(event);
    }

    const form = document.querySelector("#myForm");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const instance1 = document.querySelector("#crim").value;
      const instance2 = document.querySelector("#zn").value;
      const instance3 = document.querySelector("#indus").value;
      const instance4 = document.querySelector("#chas").value;
      const instance5 = document.querySelector("#nox").value;
      const instance6 = document.querySelector("#rm").value;
      const instance7 = document.querySelector("#age").value;
      const instance8 = document.querySelector("#dis").value;
      const instance9 = document.querySelector("#rad").value;
      const instance10 = document.querySelector("#tax").value;
      const instance11 = document.querySelector("#ptratio").value;
      const instance12 = document.querySelector("#b").value;
      const instance13 = document.querySelector("#lstat").value;

      const instances = [
        [
          Number(instance1),
          Number(instance2),
          Number(instance3),
          Number(instance4),
          Number(instance5),
          Number(instance6),
          Number(instance7),
          Number(instance8),
          Number(instance9),
          Number(instance10),
          Number(instance11),
          Number(instance12),
          Number(instance13)
        ]
      ];

      const payload = JSON.stringify({ instances });
      const url = "http://ipvo.to/api";
      try {
        const time_of_request = new Date();
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: payload,
        });
        const time_of_response = new Date();
        const data = await response.json();
        console.log(data);
        console.log(time_of_request)
        console.log(time_of_response)
        const time_elapsed = Math.abs(time_of_response - time_of_request) // vrijeme proteklo u milisekundama

        updateValue(data);
        const request_db = payload;
        console.log('DB entry:' + request_db + JSON.stringify(data) + time_of_request + time_of_response)

        //DB POST
        try {
          const response = await fetch('http://ipvo.to/db/post', {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              request: payload,
              response: prediction,
              time_of_request,
              time_of_response,
              time_elapsed
            })
          });

          const data = await response.text();
          console.log(data);
        } catch (error) {
          console.error('Error submitting form: ' + error);
        }
        //
        document.querySelector("#predict").innerHTML = prediction;
      } catch (error) {
        console.error(error);
      }

    });

  </script>

</body>

</html>
```

Podaci koji se unesu biti će poslani u prikladnom formatu na adresu `http://ipvo.to/api`, kojeg će proxy proslijediti na adresu na kojoj će `tensorflow-serving` kasnije posluživati model i vraćati rezultat, a to je `http://127.0.0.1:8501/v1/models/boston_model:predict`. Na kraju, podaci će se spremiti i u bazu, slanjem još jednog zahtjeva, i to na adresu <http://ipvo.to/db/post>, kojeg će proxy proslijediti na adresu s rutom definiranoj unutar expressa, `http://127.0.0.1/db/post`. Podaci koji se spremaju su zahtjev, odgovor, vrijeme slanja zahtjeva, vrijeme odgovora, i vrijeme potrebno za odgovor.

Za kraj je potrebno definirati `Dockerfile` kojim će se Docker poslužiti za izgradnju servisa:

```Dockerfile
FROM node:latest
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
CMD ["npm", "start"]
```

Time ćemo preuzeti posljednju verziju `nodea`, te sve datoteke prebaciti u direktorij `/app` unutar kontejnera, kojeg smo postavili kao radni direktorij. Pokrenuti će se i naredba `npm install` kojom će se u kontejneru instalirati svi paketi definirani u `package.json`. Na kraju će se unutar kontejnera pokrenuti i server kojeg smo razvili, naredbom `npm start`.

### tensorflow-serving

U stvorenom direktoriju `IPVO` potrebno je stvoriti još jedan direktorij pod nazivom `tensorflow-serving` u kojem ćemo kreirati `Dockerfile` za izgradnju kontenjera.

```bash
~/IPVO$ mkdir tensorflow-serving
~/IPVO$ cd tensorflow-serving
~/IPVO/database$ touch Dockerfile
```

Kao što je prije spomenuto, kreirati će se kontenjer pod imenom `tensorflow-serving-container`.
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

Model i pripadne datoteke za stvaranje modela (`predict.py` i `train.py`) nismo sami kreirali, već smo preuzeli [postojeće](https://towardsdatascience.com/hosting-models-with-tf-serving-on-docker-aceff9fbf533).

## Literatura

[1] <https://towardsdatascience.com/hosting-models-with-tf-serving-on-docker-aceff9fbf533>
