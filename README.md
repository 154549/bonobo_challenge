# BONotesBO #

#### Cosa è stato implementato?
Sono state inserite le funzionalità consigliate dalla consegna, ulteriori funzioni sono a discrezione del cliente. In questo caso ho preferito mantenere il progetto semplice per rispettare lo scopo finale della challenge.
- Creazione, lettura, modifica ed eliminazione di una nota;
- Ricerca testuale su titolo e contenuto;
- Filtri per tipo, priorità, stato e intervallo di data di creazione; combinabili tra loro e con la ricerca;


#### Che stack ho utilizzato?
Ho preferito mantenere lo stack consigliato in quanto utente novizio, quindi:
- NODE.js
- TypeScript
- Fastify
- Prisma ORM + SQLite
- Zod
- Vitest


#### Che rischi e limiti presenta l'applicazione?
- Nessuna autenticazione: chiunque raggiunga il servizio in rete può leggere, modificare o cancellare qualunque nota. Accettabile solo finché il servizio resta locale/non esposto.
- La ricerca testuale è un semplice `LIKE`, non full-text: nessun ranking per rilevanza, nessuna tolleranza a errori di battitura, non scala bene su grandi volumi di testo.
- SQLite è limitato, ma adatto in questo caso per un progetto di piccole dimensioni.
- Nessuna paginazione: `GET /notes` restituisce sempre tutte le note senza limiti.

Rischi e limiti che possono essere risolti o proposti a un cliente che ha bisogno di un prodotto più complesso.



## Avvio del progetto

Il repository contiene il codice sorgente e le migration Prisma, ma **non** il database SQLite né le dipendenze: vanno generati in locale con questa sequenza, da eseguire nella cartella del progetto (PowerShell o altro terminale):

```bash
# 1. Installa le dipendenze
npm install

# 2. Configura le variabili d'ambiente
cp .env.example .env

# 3. Crea il database locale e applica le migration
npx prisma migrate dev

# 4. Genera il client Prisma — OBBLIGATORIO, vedi nota sotto
npx prisma generate

# 5. Avvia il server in sviluppo
npm run dev
```

Il server si avvia su `http://localhost:3000`. Il passo 3 crea da zero il file `prisma/dev.db` (escluso dal repository, così come `generated/prisma/`) e la tabella `Note`, secondo il modello in `prisma/schema.prisma`; il database risulta vuoto, senza dati di esempio.

**Nota importante**: a differenza del comportamento "classico" di Prisma, in questo progetto `prisma migrate dev` **non genera automaticamente il client** (verificato: succede sia quando crea il database da zero, sia quando stampa "Already in sync, no schema change or pending migration was found"), a causa del generator `prisma-client` con output personalizzato (`generated/prisma/`, vedi `prisma/schema.prisma`). Il passo 4 (`npx prisma generate`) **va sempre eseguito esplicitamente** dopo la migration, altrimenti `npm run dev` fallisce con `Cannot find module '../../generated/prisma/client'`.

## Test

```bash
npm test
```

23 test in `test/notes.test.ts`, eseguiti con `app.inject()` di Fastify contro il database di sviluppo, ripulito prima di ogni test.

**`POST /notes`**
- crea una nota valida
- applica priority di default quando omessa
- rifiuta input non validi (title mancante)
- rifiuta un type non ammesso

**`GET /notes`**
- restituisce la lista di note create
- filtra per type e priority
- supporta la ricerca testuale su title/content
- restituisce un messaggio di servizio quando il database è completamente vuoto
- non restituisce il messaggio di servizio se il database ha note ma i filtri non trovano nulla

**`GET /notes/:id`**
- restituisce il dettaglio di una nota esistente
- risponde 404 se la nota non esiste

**`PUT /notes/:id`**
- modifica una nota esistente
- risponde 404 se si modifica una nota inesistente

**`DELETE /notes/:id`**
- elimina una nota esistente
- risponde 404 se si elimina una nota inesistente

**Robustezza e sicurezza dell'input** (non test di access-control il servizio non ha autenticazione, vedi Limiti noti):
- rifiuta un title oltre il limite di lunghezza (200 caratteri)
- rifiuta un content oltre il limite di lunghezza (5000 caratteri)
- tratta un tentativo di SQL injection come testo letterale, senza eseguirlo
- tratta un payload simile a XSS come testo letterale, senza interpretarlo
- ignora un id inviato dal client nel body (mass assignment)
- rifiuta un id non numerico nel path invece di andare in errore 500
- rifiuta un id negativo nel path
- rifiuta un body che non è un oggetto

## API disponibili

Anche le api sono un punto di discussione indiretto con il cliente, oltre alle api basiche potrebbe aver bisogno di ulteriori query.


| Metodo | Endpoint | Descrizione |
|---|---|---|
| `POST` | `/notes` | Crea una nuova nota |
| `GET` | `/notes` | Lista le note, con filtri e ricerca testuale |
| `GET` | `/notes/:id` | Dettaglio di una singola nota |
| `PUT` | `/notes/:id` | Modifica una nota esistente |
| `DELETE` | `/notes/:id` | Elimina una nota |

**`POST /notes`** — body:

```json
{
  "title": "Follow-up preventivo",
  "content": "Richiamare il cliente entro venerdì",
  "type": "task",
  "priority": "high",
  "status": "open"
}
```

Campi: `title` (obbligatorio), `content` (opzionale), `type` (obbligatorio, uno tra `issue | task | info | other`), `priority` (opzionale, uno tra `low | medium | high`, default `medium`), `status` (opzionale, uno tra `open | in_progress | done`, default `open`). Risposta `201` con la nota creata (include `id`, `createdAt`, `updatedAt`).

**`GET /notes`** — query parameter supportati, tutti opzionali e combinabili:

| Parametro | Tipo | Descrizione |
|---|---|---|
| `type` | `issue \| task \| info \| other` | Filtro esatto |
| `priority` | `low \| medium \| high` | Filtro esatto |
| `status` | `open \| in_progress \| done` | Filtro esatto |
| `createdFrom` | data ISO | Note create a partire da questa data |
| `createdTo` | data ISO | Note create fino a questa data |
| `q` | testo | Ricerca (`contains`) su `title` e `content` |

Risposta `200`:

```json
{ "notes": [ /* ... */ ] }
```

Se un filtro/ricerca non trova nulla ma il database ha altre note, `notes` è semplicemente un array vuoto. Se invece il **database non contiene ancora nessuna nota** (a prescindere dai filtri), la risposta include anche un messaggio di servizio:

```json
{
  "notes": [],
  "message": "Il database non contiene ancora nessuna nota. Usa POST /notes per crearne una."
}
```

**`GET /notes/:id`** — risposta `200` con la nota, oppure `404` se non esiste.

**`PUT /notes/:id`** — body: stessi campi di `POST /notes`, tutti opzionali (si aggiornano solo i campi inviati). Risposta `200` con la nota aggiornata, oppure `404` se non esiste.

**`DELETE /notes/:id`** — risposta `204` senza body, oppure `404` se non esiste.

Errori di validazione (body o query non validi) rispondono `400`:

```json
{
  "error": "ValidationError",
  "message": "Dati non validi",
  "details": [{ "path": "title", "message": "title è obbligatorio" }]
}
```

### Possibili API aggiuntive

Non implementate in questa consegna , ma idee ragionevoli se il progetto crescesse:

- **`GET /notes/stats`** statistiche aggregate (conteggio note per `type`/`priority`/`status`), utile per una dashboard.
- **`PATCH /notes/:id/status`** scorciatoia per cambiare solo lo stato di una nota (es. `open` → `done`), senza dover reinviare l'intero body come con `PUT`.
- **`POST /notes/bulk`** creazione di più note in un'unica richiesta, utile per import/migrazione di dati esistenti.
- **`DELETE /notes?type=...`** eliminazione massiva basata su filtri, invece di una nota alla volta.
- **`GET /notes/export`** esportazione delle note filtrate in CSV, per condividerle fuori dal sistema.
- **`GET /notes/:id/history`** storico delle modifiche di una nota, se in futuro venisse aggiunto un audit log (vedi Miglioramenti futuri).
- **`POST /notes/:id/restore`** ripristino di una nota eliminata, se in futuro venisse introdotto il soft delete invece della cancellazione definitiva attuale.
- **`GET /notes?page=&pageSize=`** paginazione dei risultati di lista (già segnalata come limite in Limiti noti), qui come possibile forma concreta dei parametri.

## Esempi di richieste

```bash
# Creazione
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Follow-up preventivo","type":"task","priority":"high"}'

# Lista con filtri e ricerca
curl "http://localhost:3000/notes?status=open&priority=high&q=preventivo"

# Dettaglio
curl http://localhost:3000/notes/1

# Modifica
curl -X PUT http://localhost:3000/notes/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'

# Eliminazione
curl -X DELETE http://localhost:3000/notes/1
```

## Uso dell'AI
Sviluppo condotto con **Claude Code** (CLI), lavorando direttamente dentro la cartella del progetto. L'intera sessione di lavoro ogni messaggio scambiato, turno per turno è trascritta in [`ai-log/claude-code-chat-log.md`](ai-log/claude-code-chat-log.md), così da poter ricostruire il processo di sviluppo passo passo: dalle domande di comprensione dello stack (Fastify, TypeScript, Prisma) alle decisioni sul modello dati.

## Cosa chiederei a un possibile cliente?
In questo caso ho avuto un set di opzioni di funzionalità da inserire, sicuramente al cliente oltre a proporre le funzionalità di base chiederei:

- Il servizio sarà multi-utente o multi-team? Serve autenticazione/autorizzazione differenziata? Importante per impostare un layer di sicurezza.
- Che volume di note è previsto nel tempo? Incide sulla necessità di paginazione e su SQLite come scelta di persistenza a lungo termine.
- Serve uno storico delle modifiche?
- È necessaria una ricerca più approfondita e complessa?


#### Miglioramenti futuri
Anche i miglioramenti sono a discrezione del del cliente, sicuramente un'interfaccia grafica e una maggiore scalabilità del prodotto sono la priorità.
Si parte sempre da una nostra proposta e si elabora con il cliente un prodotto completo.

- Paginazione e ordinamento configurabile sui risultati di `GET /notes`
- Soft delete e audit log delle modifiche
- Autenticazione/autorizzazione
- Interfaccia frontend base

#### Assunzioni personali finali
Mi immagino la raccolta di note come qualcosa di rapido.
Non ho modellato un'entità "cliente/contesto" strutturata: un campo `client` era stato inizialmente previsto (come suggerito dalla consegna), ma ho deciso di ometterla perchè mi sembrava abbastanza ridondante con `title`/`content`.
Questo campo può essere comunque utile inserirlo e renderlo opzionale.

Ho fissato un set chiuso di 4 tipi di nota (`issue`, `task`, `info`, `other`) invece di un elenco più ampio, per restare semplice e comunque estendibile.

`priority` e `status` hanno valori di default (`medium`, `open`) così una nota si può creare rapidamente anche senza specificarli subito. Ad esempio per semplici note di info da mantenere salvate.

Nessuna autenticazione, nessun concetto di utente/team: il servizio resta ad uso **locale** (non esposto pubblicamente), per rispettare semplicità e lo scopo finale del progetto.

#### Nota su `npm audit`

`npm audit` segnala 3 vulnerabilità moderate, tutte riconducibili a `@hono/node-server` (bypass di un middleware in `serveStatic` via slash ripetuti, [GHSA-92pp-h63x-v22m](https://github.com/advisories/GHSA-92pp-h63x-v22m)), dipendenza transitiva di `@prisma/dev` — il componente che alimenta il comando opzionale `prisma dev`, non usato in questo progetto (qui la persistenza passa da `prisma migrate` + `@prisma/adapter-better-sqlite3`, un percorso che non coinvolge `@hono/node-server` a runtime). Il pacchetto è presente nell'albero delle dipendenze ma il suo codice non viene mai eseguito. Non ho applicato `npm audit fix --force` perché forzerebbe un downgrade di Prisma a `6.19.3`, un breaking change non necessario per un rischio che qui è trascurabile.