/* Fishermans · disponibilidade do catálogo
   Coloque este arquivo no catálogo e no painel de pedidos e carregue com:
     <script src="fx-disponibilidade.js" defer></script>
   O que está "fora de venda" em Pedidos › Produtos e preços some daqui; voltou à venda, aparece de novo.

   Jeito automático: marque os elementos com o código do produto, da linha ou da família:
     <div data-fx-sku="AM020MM4X150M">…</div>
     <section data-fx-linha="ama">…</section>       (ama, oce, mar, bb, mono, ace — ou o nome: "Amazônica")
     <article data-fx-familia="ama4X">…</article>
   Elementos fora de venda ganham o atributo hidden e a classe "fx-fora".

   Jeito manual (no código do catálogo):
     await FXDisp.pronto;  FXDisp.disponivel('AM020MM4X150M')  ·  FXDisp.linhaDisponivel('ama')
     document.addEventListener('fx-disp', e => { ... e.detail ... })

   Se a lista não carregar (sem internet, Supabase fora), NADA é escondido: o catálogo mostra tudo. */
(function () {
  'use strict';
  var URL_SB = 'https://wioyuljneiygwllmucba.supabase.co';
  var CHAVE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpb3l1bGpuZWl5Z3dsbG11Y2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MjQ0MTYsImV4cCI6MjEwOTQwMDQxNn0.dOwnTq4gU96QkNOZK-mkfRT26jTEBcDJXXlmn5L0_9o';
  var CACHE = 'fx-disp-v2';
  var nrm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim() };
  var dados = null, on = null, pad = null, lin = null, fam = null;

  function usa(d) {
    if (!d || !Array.isArray(d.disponiveis)) return false;
    dados = d; on = new Set(d.disponiveis.map(String)); pad = new Set((d.padrao || []).map(String)); lin = {}; fam = {};
    (d.linhas || []).forEach(function (l) { lin[nrm(l.id)] = lin[nrm(l.nome)] = !!l.disponivel; (l.familias || []).forEach(function (f) { fam[nrm(f.id)] = fam[nrm(f.nome)] = !!f.disponivel }) });
    return true;
  }
  var api = window.FXDisp = {
    get dados() { return dados },
    carregado: function () { return !!dados },
    disponivel: function (sku) { return !dados || on.has(String(sku || '').trim()) },
    /* true = à venda no painel; false = tirado no painel; null = o painel nunca decidiu (ou não conhece): a página mantém o que já mostrava */
    estado: function (sku) { if (!dados) return null; var k = String(sku || '').trim(); if (!k) return null; if (on.has(k)) return true; if (pad.has(k)) return null; return (d0(k)) },
    mostrar: function (sku, padraoDaPagina) { var e = api.estado(sku); return e === null ? !!padraoDaPagina : e },
    linhaDisponivel: function (l) { var k = nrm(l); return !dados || !(k in lin) || lin[k] },
    familiaDisponivel: function (f) { var k = nrm(f); return !dados || !(k in fam) || fam[k] },
    aplicar: aplicar
  };

  function d0(k) { return (dados.disponiveis.indexOf(k) < 0 && (dados.indisponiveis || []).indexOf(k) >= 0) ? false : null }
  function marca(el, ok) { if (ok) { if (el.classList.contains('fx-fora')) { el.classList.remove('fx-fora'); el.hidden = false } } else { el.classList.add('fx-fora'); el.hidden = true } }
  function aplicar(raiz) {
    if (!dados) return; raiz = raiz || document;
    raiz.querySelectorAll('[data-fx-sku]').forEach(function (el) { marca(el, api.estado(el.getAttribute('data-fx-sku')) !== false) });
    raiz.querySelectorAll('[data-fx-linha]').forEach(function (el) { marca(el, api.linhaDisponivel(el.getAttribute('data-fx-linha'))) });
    raiz.querySelectorAll('[data-fx-familia]').forEach(function (el) { marca(el, api.familiaDisponivel(el.getAttribute('data-fx-familia'))) });
  }
  function avisa() { aplicar(); try { document.dispatchEvent(new CustomEvent('fx-disp', { detail: dados })) } catch (e) {} }

  // 1) mostra já com a última lista conhecida (abre rápido); 2) busca a lista atual
  try { var c = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (c) usa(c) } catch (e) {}
  var ctl = typeof AbortController == 'function' ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort() }, 6000);
  api.pronto = fetch(URL_SB + '/rest/v1/rpc/catalogo_disponivel', {
    method: 'POST', headers: { apikey: CHAVE, Authorization: 'Bearer ' + CHAVE, 'Content-Type': 'application/json' }, body: '{}', signal: ctl ? ctl.signal : undefined
  }).then(function (r) { return r.ok ? r.json() : null }).then(function (d) {
    if (usa(d)) { try { localStorage.setItem(CACHE, JSON.stringify(d)) } catch (e) {} }
  }).catch(function () {}).then(function () { clearTimeout(tm); return api });

  function inicia() {
    avisa(); api.pronto.then(avisa);
    // catálogo que monta a página com JavaScript: reaplica quando aparecem produtos novos
    try { new MutationObserver(function (m) { if (!dados) return; for (var i = 0; i < m.length; i++) if (m[i].addedNodes.length) { aplicar(); break } }).observe(document.body, { childList: true, subtree: true }) } catch (e) {}
  }
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', inicia); else inicia();
})();
