import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

function loadModule(file, imports, storage) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, sessionStorage: storage,
    require(name) {
      assert.ok(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
  });
  return exports;
}

function setup() {
  const data = new Map();
  const storage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  };
  const cache = loadModule('../src/app/resultStorage.ts', {}, storage);
  return { data, storage, cache };
}

const winner = {
  status: 'WIN', code: 'TEST-HEADPHONES', codeCount: 7,
  prize: { id: 'auriculares-jbl-520bt', name: 'Auriculares JBL Tune 520BT', image: '/headphones.png', article: 'unos' },
};

test('reload restores the same headphones, code and count without redeeming again', () => {
  const { storage, cache } = setup();
  cache.storeLastResult(winner);
  const reloaded = loadModule('../src/app/resultStorage.ts', {}, storage);
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.readLastResult())), winner);
});

test('new attempt/reset clears the previous winner; failed or incomplete states cannot restore it', () => {
  const { cache } = setup();
  for (const next of [null, { ...winner, status: 'REGISTER_REQUIRED' }, { ...winner, status: 'RATE_LIMITED' }]) {
    cache.storeLastResult(winner);
    cache.storeLastResult(next);
    assert.equal(cache.readLastResult(), null);
  }
});

test('invalid storage is ignored', () => {
  const { data, cache } = setup();
  for (const raw of ['{bad', 'null', '[]', '{}', JSON.stringify({ ...winner, codeCount: -1 }), JSON.stringify({ ...winner, prize: { id: '12' } })]) {
    data.set('purosol:last-result:v1', raw);
    assert.equal(cache.readLastResult(), null);
  }
});

test('blocked storage never breaks the live flow', () => {
  const blocked = new Proxy({}, { get() { throw new Error('storage blocked'); } });
  const cache = loadModule('../src/app/resultStorage.ts', {}, blocked);
  assert.equal(cache.readLastResult(), null);
  assert.doesNotThrow(() => cache.storeLastResult(winner));
  assert.doesNotThrow(() => cache.storeLastResult(null));
});

test('Winner redirects missing/non-winning results and only displays the supplied prize', async () => {
  const jsx = await import('react/jsx-runtime');
  let result = null;
  const Winner = loadModule('../src/pages/Winner/Winner.tsx', {
    'react/jsx-runtime': jsx,
    'react-router-dom': { Navigate: ({ to }) => React.createElement('span', null, `redirect:${to}`) },
    '../../app/SessionContext': { useSession: () => ({ lastResult: result, codeCount: result?.codeCount ?? 0 }) },
    '../../components/promo/ResultLayout': { ResultLayout: props => React.createElement('div', null, props.message, props.scene) },
    '../../components/promo/PrizeReveal': { PrizeReveal: ({ prize }) => React.createElement('span', null, prize?.name) },
    '../../components/promo/PrizeRevealMobile': { PrizeRevealMobile: () => null },
  }).default;
  for (result of [null, { ...winner, status: 'LOSE' }, { ...winner, status: 'CODE_NOT_FOUND' }]) {
    assert.match(renderToStaticMarkup(React.createElement(Winner)), /redirect:\/participar/);
  }
  result = winner;
  assert.match(renderToStaticMarkup(React.createElement(Winner)), /Auriculares JBL Tune 520BT/);
  result = { ...winner, prize: undefined };
  const generic = renderToStaticMarkup(React.createElement(Winner));
  assert.match(generic, /te ganaste un premio!/);
  assert.doesNotMatch(generic, /PlayStation/);
});

test('SessionProvider restores count/result together and resets both memory and storage', async () => {
  const { storage, cache } = setup();
  cache.storeLastResult(winner);
  const jsx = await import('react/jsx-runtime');
  const session = loadModule('../src/app/SessionContext.tsx', {
    react: React, 'react/jsx-runtime': jsx, './resultStorage': cache,
  }, storage);
  function ReadSession() {
    const current = session.useSession();
    assert.equal(current.lastResult.prize.name, winner.prize.name);
    assert.equal(current.codeCount, 7);
    current.reset();
    return null;
  }
  renderToStaticMarkup(React.createElement(session.SessionProvider, null, React.createElement(ReadSession)));
  assert.equal(cache.readLastResult(), null);
});
