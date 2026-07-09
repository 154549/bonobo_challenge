import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = buildApp();

beforeEach(async () => {
  await prisma.note.deleteMany();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const validPayload = {
  title: 'Follow-up preventivo',
  content: 'Richiamare il cliente entro venerdì',
  type: 'task',
  priority: 'high',
};

describe('POST /notes', () => {
  // Caso base richiesto dalla challenge: creazione di una nota valida.
  it('crea una nota valida', async () => {
    const res = await app.inject({ method: 'POST', url: '/notes', payload: validPayload });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.title).toBe(validPayload.title);
    expect(body.status).toBe('open');
  });

  // Il default "medium" è applicato lato service (non nello schema Zod): verifica che arrivi davvero nella risposta.
  it('applica priority di default quando omessa', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { title: 'Nota senza priorità', type: 'info' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().priority).toBe('medium');
  });

  // Caso "gestione di input non validi" richiesto esplicitamente dalla challenge.
  it('rifiuta input non validi (title mancante)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { type: 'task' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('ValidationError');
  });

  // Non solo campi mancanti: anche un valore fuori dall'enum deve fallire la validazione.
  it('rifiuta un type non ammesso', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { ...validPayload, type: 'non-esistente' },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /notes', () => {
  // Caso base richiesto dalla challenge: lettura di una lista di note.
  it('restituisce la lista di note create', async () => {
    await app.inject({ method: 'POST', url: '/notes', payload: validPayload });
    await app.inject({ method: 'POST', url: '/notes', payload: { ...validPayload, type: 'issue' } });

    const res = await app.inject({ method: 'GET', url: '/notes' });

    expect(res.statusCode).toBe(200);
    expect(res.json().notes).toHaveLength(2);
  });

  // Verifica che due filtri insieme si comportino in AND, non solo singolarmente.
  it('filtra per type e priority', async () => {
    await app.inject({ method: 'POST', url: '/notes', payload: validPayload });
    await app.inject({ method: 'POST', url: '/notes', payload: { ...validPayload, type: 'issue', priority: 'low' } });

    const res = await app.inject({ method: 'GET', url: '/notes?type=task&priority=high' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.notes).toHaveLength(1);
    expect(body.notes[0].type).toBe('task');
  });

  // q cerca in OR su title/content: la nota che non contiene il termine non deve comparire.
  it('supporta la ricerca testuale su title/content', async () => {
    await app.inject({ method: 'POST', url: '/notes', payload: validPayload });
    await app.inject({ method: 'POST', url: '/notes', payload: { title: 'Altro', type: 'info' } });

    const res = await app.inject({ method: 'GET', url: '/notes?q=preventivo' });

    expect(res.statusCode).toBe(200);
    expect(res.json().notes).toHaveLength(1);
  });

  // Comportamento aggiunto su richiesta esplicita: database del tutto vuoto -> messaggio di servizio.
  it('restituisce un messaggio di servizio quando il database è completamente vuoto', async () => {
    const res = await app.inject({ method: 'GET', url: '/notes' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.notes).toEqual([]);
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
  });

  // Distingue "database vuoto" da "filtro senza risultati": solo il primo caso mostra il messaggio.
  it('non restituisce il messaggio di servizio se il database ha note ma i filtri non trovano nulla', async () => {
    await app.inject({ method: 'POST', url: '/notes', payload: validPayload });

    const res = await app.inject({ method: 'GET', url: '/notes?type=info' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.notes).toEqual([]);
    expect(body.message).toBeUndefined();
  });
});

describe('GET /notes/:id', () => {
  // Caso base richiesto dalla challenge: lettura del dettaglio di una singola nota.
  it('restituisce il dettaglio di una nota esistente', async () => {
    const created = await app.inject({ method: 'POST', url: '/notes', payload: validPayload });
    const id = created.json().id;

    const res = await app.inject({ method: 'GET', url: `/notes/${id}` });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(id);
  });

  // Caso "nota non esiste" richiesto esplicitamente dalla challenge tra i test interessanti.
  it('risponde 404 se la nota non esiste', async () => {
    const res = await app.inject({ method: 'GET', url: '/notes/999999' });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('NotFound');
  });
});

describe('PUT /notes/:id', () => {
  // Caso base richiesto dalla challenge: modifica di una nota.
  it('modifica una nota esistente', async () => {
    const created = await app.inject({ method: 'POST', url: '/notes', payload: validPayload });
    const id = created.json().id;

    const res = await app.inject({
      method: 'PUT',
      url: `/notes/${id}`,
      payload: { status: 'done' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('done');
  });

  // Stesso caso "nota non esiste" applicato alla modifica.
  it('risponde 404 se si modifica una nota inesistente', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/notes/999999',
      payload: { status: 'done' },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /notes/:id', () => {
  // Caso base richiesto dalla challenge: eliminazione di una nota, verificata anche a valle con un GET.
  it('elimina una nota esistente', async () => {
    const created = await app.inject({ method: 'POST', url: '/notes', payload: validPayload });
    const id = created.json().id;

    const res = await app.inject({ method: 'DELETE', url: `/notes/${id}` });
    expect(res.statusCode).toBe(204);

    const getRes = await app.inject({ method: 'GET', url: `/notes/${id}` });
    expect(getRes.statusCode).toBe(404);
  });

  // Stesso caso "nota non esiste" applicato all'eliminazione.
  it('risponde 404 se si elimina una nota inesistente', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/notes/999999' });

    expect(res.statusCode).toBe(404);
  });
});

describe('Robustezza e sicurezza dell\'input', () => {
  // Limite di lunghezza dello schema Zod (max 200): deve essere applicato, non solo dichiarato.
  it('rifiuta un title oltre il limite di lunghezza (200 caratteri)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { ...validPayload, title: 'a'.repeat(201) },
    });

    expect(res.statusCode).toBe(400);
  });

  // Limite di lunghezza dello schema Zod (max 5000) sul campo content.
  it('rifiuta un content oltre il limite di lunghezza (5000 caratteri)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { ...validPayload, content: 'a'.repeat(5001) },
    });

    expect(res.statusCode).toBe(400);
  });

  // Verifica che le query parametrizzate di Prisma trattino l'input come dato, mai come comando SQL.
  it('tratta un tentativo di SQL injection come testo letterale, senza eseguirlo', async () => {
    const malicious = "Robert'); DROP TABLE Note; --";

    const res = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { ...validPayload, title: malicious },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().title).toBe(malicious);

    // La tabella deve esistere ancora: la query grazie a Prisma è parametrizzata,
    // la stringa non viene mai interpretata come comando SQL.
    const listRes = await app.inject({ method: 'GET', url: '/notes' });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().notes).toHaveLength(1);
  });

  // Nessun rendering HTML lato server: il payload deve tornare invariato, non incapsulato/alterato.
  it('tratta un payload simile a XSS come testo letterale, senza interpretarlo', async () => {
    const payload = '<script>alert(document.cookie)</script>';

    const res = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { ...validPayload, content: payload },
    });

    expect(res.statusCode).toBe(201);
    // Il valore torna invariato: nessuna esecuzione, nessuna manipolazione lato server.
    // La responsabilità di un eventuale escaping in visualizzazione spetta a chi consuma l'API.
    expect(res.json().content).toBe(payload);
  });

  // createNoteSchema non include id/createdAt: Zod li scarta, il client non può forzarli.
  it('ignora un id inviato dal client nel body (mass assignment)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { ...validPayload, id: 999999, createdAt: '1999-01-01T00:00:00.000Z' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).not.toBe(999999);
    expect(body.createdAt).not.toBe('1999-01-01T00:00:00.000Z');
  });

  // noteIdParamSchema deve intercettare l'errore prima che arrivi a Prisma (altrimenti sarebbe un 500).
  it('rifiuta un id non numerico nel path invece di andare in errore 500', async () => {
    const res = await app.inject({ method: 'GET', url: '/notes/abc' });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('ValidationError');
  });

  // Il vincolo .positive() dello schema deve bloccare anche id sintatticamente numerici ma invalidi.
  it('rifiuta un id negativo nel path', async () => {
    const res = await app.inject({ method: 'GET', url: '/notes/-1' });

    expect(res.statusCode).toBe(400);
  });

  // createNoteSchema è un z.object(): un array (o altro non-oggetto) deve fallire il parsing.
  it('rifiuta un body che non è un oggetto', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: ['not', 'an', 'object'],
    });

    expect(res.statusCode).toBe(400);
  });
});
