// ===================== Storage / Helpers =====================
const STORAGE_KEY = "pd_menu_items_v1";
const MODE_REMOVE_KEY = "pd_mode_remove";
const MODE_EDIT_KEY   = "pd_mode_edit";
const MODE_SORT_KEY   = "pd_mode_sort";

function getItems() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
function uid() {
  return "itm_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
}
function el(html) {
  const div = document.createElement("div");
  div.innerHTML = html.trim();
  return div.firstElementChild;
}
function setMode(key, val) {
  localStorage.setItem(key, val ? "1" : "0");
}
function getMode(key) {
  return localStorage.getItem(key) === "1";
}

// Extrai apenas dígitos e vírgula (formato BR)
function onlyDigitsComma(s) {
  return (s || "").toString().replace(/[^\d,]/g, "");
}

// ===================== Admin modal =====================
function showAdminArea() {
  document.getElementById("adminArea").classList.remove("hidden");
}
function hideAdminArea() {
  document.getElementById("adminArea").classList.add("hidden");
}
function loginAdmin() {
  const password = document.getElementById("adminPassword").value;
  if (password === "admin123") {
    document.getElementById("adminPanel").classList.remove("hidden");
    document.getElementById("addItemForm").classList.add("hidden");
    applyModes();
  } else {
    alert("Senha incorreta! Tente novamente.");
  }
}

// ===================== Formulário =====================
function showAddForm(type) {
  document.getElementById("itemType").value = type;
  document.getElementById("editItemId").value = "";
  document.getElementById("saveBtn").textContent = "Salvar";
  document.getElementById("cancelEditBtn").classList.add("hidden");

  // limpa campos
  document.getElementById("itemName").value = "";
  document.getElementById("itemDesc").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("itemImg").value = "";

  attachPriceMask();

  const row = document.getElementById("pastelKindRow");
  if (type === "pastel") {
    row.classList.remove("hidden");
    document.getElementById("pastelCategory").value = "salgado";
  } else {
    row.classList.add("hidden");
  }

  document.getElementById("addItemForm").classList.remove("hidden");
}

function priceToMasked(val) {
  const only = (val || "").replace(/\D/g, "");
  const num = parseInt(only || "0", 10);
  const cents = (num / 100).toFixed(2).replace(".", ",");
  return `R$ ${cents}`;
}
function maskedToNumber(masked) {
  return onlyDigitsComma(masked);
}
function attachPriceMask() {
  const priceInput = document.getElementById("itemPrice");
  if (!priceInput._maskAttached) {
    priceInput.addEventListener("input", () => {
      priceInput.value = priceToMasked(priceInput.value);
    });
    if (!priceInput.value) priceInput.value = "R$ 0,00";
    priceInput._maskAttached = true;
  }
}

function submitItemForm() {
  const type = document.getElementById("itemType").value;
  const name = document.getElementById("itemName").value.trim();
  const desc = document.getElementById("itemDesc").value.trim();
  const priceMasked = document.getElementById("itemPrice").value.trim() || "R$ 0,00";
  const price = maskedToNumber(priceMasked);
  const img = document.getElementById("itemImg").value.trim();
  const pastelCategory = document.getElementById("pastelCategory")?.value || "salgado";
  const editId = document.getElementById("editItemId").value;

  if (!type) return alert("Selecione um tipo.");
  if (!name || !desc) return alert("Preencha nome e descrição!");

  const fallbackImg =
    type === "bebida"
      ? "https://via.placeholder.com/400x250?text=Bebida"
      : "https://via.placeholder.com/400x250?text=Item";

  const items = getItems();

  if (editId) {
    const idx = items.findIndex((x) => x.id === editId);
    if (idx >= 0) {
      items[idx] = {
        ...items[idx],
        name,
        desc,
        price,
        img: img || fallbackImg,
        pastelCategory: type === "pastel" ? pastelCategory : undefined,
        updatedAt: Date.now(),
      };
      saveItems(items);
      renderAll();
      exitEditStateUI();
      alert("Item atualizado com sucesso!");
      return;
    }
  }

  const newItem = {
    id: uid(),
    type,
    name,
    desc,
    price,
    img: img || fallbackImg,
    pastelCategory: type === "pastel" ? pastelCategory : undefined,
    createdAt: Date.now(),
  };
  items.push(newItem);
  saveItems(items);
  renderAll();

  // limpar
  document.getElementById("itemName").value = "";
  document.getElementById("itemDesc").value = "";
  document.getElementById("itemPrice").value = "R$ 0,00";
  document.getElementById("itemImg").value = "";
  document.getElementById("addItemForm").classList.add("hidden");

  alert("Item adicionado com sucesso!");
}

function cancelEdit() { exitEditStateUI(); }

function exitEditStateUI() {
  document.getElementById("editItemId").value = "";
  document.getElementById("saveBtn").textContent = "Salvar";
  document.getElementById("cancelEditBtn").classList.add("hidden");
  document.getElementById("addItemForm").classList.add("hidden");
}

// ===================== Conversão de cards estáticos -> dinâmicos =====================

// Descobre tipo e (se for pastel) doce/salgado pelo container
function inferTypeAndCategoryFromDOM(cardEl) {
  const inPasteis = cardEl.closest("#pasteis");
  const inDoces = cardEl.closest("#doces");
  const inBebidas = cardEl.closest("#bebidas");
  const inPorcoes = cardEl.closest("#porcoes .grid");

  if (inPasteis) return { type: "pastel", pastelCategory: "salgado" };
  if (inDoces)   return { type: "pastel", pastelCategory: "doce" };
  if (inBebidas) return { type: "bebida" };
  if (inPorcoes) return { type: "porcao" };
  // fallback
  return { type: "pastel", pastelCategory: "salgado" };
}

function parsePriceFromCard(cardEl) {
  const priceP = [...cardEl.querySelectorAll("p")].find(p => /R\$\s*/i.test(p.textContent));
  if (!priceP) return "0,00";
  return onlyDigitsComma(priceP.textContent) || "0,00";
}

function convertStaticCardToItem(cardEl) {
  const existingId = cardEl.getAttribute("data-id");
  if (existingId) return existingId;

  const name = (cardEl.querySelector("h3")?.textContent || "").trim() || "Item";
  const desc = (cardEl.querySelector("p.text-gray-600")?.textContent || "").trim();
  const price = parsePriceFromCard(cardEl);
  const img = cardEl.querySelector("img")?.getAttribute("src") || "";
  const { type, pastelCategory } = inferTypeAndCategoryFromDOM(cardEl);

  const newId = uid();
  const item = {
    id: newId,
    type,
    name,
    desc,
    price,
    img: img || (type === "bebida"
      ? "https://via.placeholder.com/400x250?text=Bebida"
      : "https://via.placeholder.com/400x250?text=Item"),
    pastelCategory,
    createdAt: Date.now(),
  };

  const items = getItems();
  items.push(item);
  saveItems(items);

  return newId;
}

function ensureDynamic(cardEl) {
  let id = cardEl.getAttribute("data-id");
  if (id) return id;

  const newId = convertStaticCardToItem(cardEl);
  renderAll(); // recria DOM com card dinâmico
  return newId;
}

function convertAllStaticInGrids() {
  const grids = [
    document.getElementById("pasteis"),
    document.getElementById("doces"),
    document.getElementById("bebidas"),
    document.querySelector("#porcoes .grid"),
  ].filter(Boolean);

  let converted = false;
  grids.forEach(grid => {
    grid.querySelectorAll(".menu-item:not(.dynamic-item)").forEach(card => {
      convertStaticCardToItem(card);
      converted = true;
    });
  });

  if (converted) renderAll();
}

// ===================== Renderização =====================
function renderCard(item) {
  const isBebida = item.type === "bebida";
  const imgClass = isBebida ? "object-contain" : "object-cover";
  const imageContainerClass =
    item.type === "porcao"
      ? "h-64 overflow-hidden"
      : isBebida
      ? "h-48 overflow-hidden flex items-center justify-center bg-blue-50"
      : "h-48 overflow-hidden";

  const node = el(`
    <div class="menu-item dynamic-item bg-white rounded-lg overflow-hidden shadow-lg transition-all duration-300 cursor-pointer"
         data-id="${item.id}">
      <div class="${imageContainerClass}">
        <img src="${item.img}" alt="${item.name}"
             class="w-full h-full ${imgClass} transition-transform duration-500 hover:scale-110">
      </div>
      <div class="p-4">
        <h3 class="text-xl font-bold mb-2">${item.name}</h3>
        <p class="text-gray-600 mb-3">${item.desc}</p>
        <p class="text-amber-600 font-bold text-lg">R$ ${item.price}</p>
      </div>
    </div>
  `);
  return node;
}

function clearDynamic() {
  document.querySelectorAll(".dynamic-item").forEach((n) => n.remove());
}

function renderAll() {
  clearDynamic();

  const items = getItems();
  const contSalg = document.getElementById("pasteis");
  const contDoces = document.getElementById("doces");
  const contPorcoes = document.querySelector("#porcoes .grid");
  const contBebidas = document.getElementById("bebidas");

  items.forEach((item) => {
    const card = renderCard(item);
    if (item.type === "pastel") {
      (item.pastelCategory === "doce" ? contDoces : contSalg)?.appendChild(card);
    } else if (item.type === "porcao") {
      contPorcoes?.appendChild(card);
    } else if (item.type === "bebida") {
      contBebidas?.appendChild(card);
    }
  });

  requestAnimationFrame(() => {
    document.querySelectorAll(".dynamic-item").forEach((item, index) => {
      item.style.animationDelay = `${index * 0.05}s`;
      item.classList.add("animate__animated", "animate__fadeInUp");
    });
  });

  applyModesToCards();
  applySortability();

  // (re)anexa handlers do carrinho e restaura destaques
  attachCartClickHandlers();
  refreshAllSelectedStates();
}

// ===================== Modos: Remover / Editar / Reordenar =====================
let removeMode = getMode(MODE_REMOVE_KEY);
let editMode   = getMode(MODE_EDIT_KEY);
let sortMode   = getMode(MODE_SORT_KEY);

function enterRemoveMode() {
  removeMode = !removeMode;
  setMode(MODE_REMOVE_KEY, removeMode);
  if (removeMode) {
    editMode = false; setMode(MODE_EDIT_KEY, false);
    sortMode = false; setMode(MODE_SORT_KEY, false);
  }
  applyModes();
}
function enterEditMode() {
  editMode = !editMode;
  setMode(MODE_EDIT_KEY, editMode);
  if (editMode) {
    removeMode = false; setMode(MODE_REMOVE_KEY, false);
    sortMode   = false; setMode(MODE_SORT_KEY, false);
  }
  applyModes();
}
function enterSortMode() {
  sortMode = !sortMode;
  setMode(MODE_SORT_KEY, sortMode);
  if (sortMode) {
    removeMode = false; setMode(MODE_REMOVE_KEY, false);
    editMode   = false; setMode(MODE_EDIT_KEY, false);
    convertAllStaticInGrids();
  }
  applyModes();
}

function applyModes() {
  const removeBtn = document.getElementById("removeBtn");
  const editBtn   = document.getElementById("editBtn");
  const sortBtn   = document.getElementById("sortBtn");

  if (removeBtn) {
    removeBtn.textContent = removeMode ? "Sair do Modo Remoção" : "Remover Itens";
    removeBtn.classList.toggle("bg-red-700", removeMode);
    removeBtn.classList.toggle("bg-red-500", !removeMode);
  }
  if (editBtn) {
    editBtn.textContent = editMode ? "Sair do Modo Edição" : "Editar Itens";
    editBtn.classList.toggle("bg-sky-700", editMode);
    editBtn.classList.toggle("bg-sky-500", !editMode);
  }
  if (sortBtn) {
    sortBtn.textContent = sortMode ? "Sair do Modo Reordenar" : "Reordenar Itens";
    sortBtn.classList.toggle("bg-amber-700", sortMode);
    sortBtn.classList.toggle("bg-amber-500", !sortMode);
  }

  applyModesToCards();
  applySortability();

  // Modo admin aberto? desabilita click do carrinho
  attachCartClickHandlers();
  refreshAllSelectedStates();
}

function applyModesToCards() {
  const items = document.querySelectorAll(".menu-item");
  items.forEach((item) => {
    item.classList.remove("ring-2", "ring-red-500", "ring-sky-500", "ring-amber-500", "cursor-not-allowed");
    item.onclick = null;
    item.removeAttribute("draggable");

    if (removeMode) {
      item.classList.add("ring-2", "ring-red-500");
      item.onclick = function () {
        const id = ensureDynamic(this);
        if (!confirm("Deseja realmente remover este item?")) return;
        const list = getItems().filter((x) => x.id !== id);
        saveItems(list);
        renderAll();
      };
    } else if (editMode) {
      item.classList.add("ring-2", "ring-sky-500");
      item.onclick = function () {
        const id = ensureDynamic(this);
        openEditFor(id);
      };
    } else if (sortMode) {
      const id = item.getAttribute("data-id");
      if (id) {
        item.classList.add("ring-2", "ring-amber-500");
        item.setAttribute("draggable", "true");
      }
    }
  });
}

// ===================== Edição existente =====================
function openEditFor(id) {
  const items = getItems();
  const itm = items.find((x) => x.id === id);
  if (!itm) return;

  document.getElementById("itemType").value = itm.type;
  document.getElementById("editItemId").value = itm.id;
  document.getElementById("itemName").value = itm.name;
  document.getElementById("itemDesc").value = itm.desc;
  document.getElementById("itemPrice").value = "R$ " + (itm.price || "0,00");
  document.getElementById("itemImg").value = itm.img || "";

  attachPriceMask();

  if (itm.type === "pastel") {
    document.getElementById("pastelKindRow").classList.remove("hidden");
    document.getElementById("pastelCategory").value =
      itm.pastelCategory === "doce" ? "doce" : "salgado";
  } else {
    document.getElementById("pastelKindRow").classList.add("hidden");
  }

  document.getElementById("saveBtn").textContent = "Atualizar";
  document.getElementById("cancelEditBtn").classList.remove("hidden");
  document.getElementById("addItemForm").classList.remove("hidden");
}

// ===================== Drag & Drop (Reordenar) =====================
let dragSrc = null;

function applySortability() {
  document.querySelectorAll(".dynamic-item").forEach((card) => {
    card.removeEventListener("dragstart", onDragStart);
  });
  ["#pasteis", "#doces", "#bebidas", "#porcoes .grid"].forEach(sel => {
    const cont = document.querySelector(sel);
    if (cont) {
      cont.removeEventListener("dragover", onDragOver);
      cont.removeEventListener("drop", onDrop);
    }
  });

  if (!sortMode) return;

  document.querySelectorAll(".dynamic-item").forEach((card) => {
    card.addEventListener("dragstart", onDragStart);
  });

  ["#pasteis", "#doces", "#bebidas", "#porcoes .grid"].forEach(sel => {
    const cont = document.querySelector(sel);
    if (!cont) return;
    cont.addEventListener("dragover", onDragOver);
    cont.addEventListener("drop", onDrop);
  });
}

function onDragStart(e) {
  dragSrc = e.currentTarget;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", dragSrc.getAttribute("data-id"));
  dragSrc.classList.add("opacity-50");
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}
function onDrop(e) {
  e.preventDefault();

  const destContainer = e.currentTarget;
  const id = e.dataTransfer.getData("text/plain");
  const dragged = document.querySelector(`.dynamic-item[data-id="${id}"]`);
  if (!dragged || !destContainer) return;

  const afterEl = getDragAfterElement(destContainer, e.clientY);
  if (afterEl == null) {
    destContainer.appendChild(dragged);
  } else {
    destContainer.insertBefore(dragged, afterEl);
  }

  if (dragSrc) dragSrc.classList.remove("opacity-50");
  dragSrc = null;

  persistOrderFromDOM();
}

function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll(".dynamic-item:not(.opacity-50)")];
  return els.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - (box.top + box.height / 2);
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function persistOrderFromDOM() {
  const items = getItems();
  const byId = Object.fromEntries(items.map((x) => [x.id, x]));
  const orderIds = [];

  orderIds.push(
    ...[...document.querySelectorAll("#pasteis .dynamic-item")].map((n) => n.getAttribute("data-id"))
  );
  orderIds.push(
    ...[...document.querySelectorAll("#doces .dynamic-item")].map((n) => n.getAttribute("data-id"))
  );
  const porcoesGrid = document.querySelector("#porcoes .grid");
  if (porcoesGrid) {
    orderIds.push(
      ...[...porcoesGrid.querySelectorAll(".dynamic-item")].map((n) => n.getAttribute("data-id"))
    );
  }
  orderIds.push(
    ...[...document.querySelectorAll("#bebidas .dynamic-item")].map((n) => n.getAttribute("data-id"))
  );

  const newItems = orderIds.map((id) => byId[id]).filter(Boolean);
  items.forEach((it) => { if (!newItems.find((x) => x.id === it.id)) newItems.push(it); });
  saveItems(newItems);
}

// ===================== Init =====================
document.addEventListener("DOMContentLoaded", function () {
  const menuItems = document.querySelectorAll(".menu-item:not(.dynamic-item)");
  menuItems.forEach((item, index) => {
    item.style.animationDelay = `${index * 0.05}s`;
    item.classList.add("animate__animated", "animate__fadeInUp");
  });

  renderAll();
  applyModes();

  // Carrinho/WhatsApp inicial
  updateWaBadge();
  updateWhatsAppLinkFromCart();
  attachCartClickHandlers();
  refreshAllSelectedStates();

  const btnSaveWA = document.querySelector('[onclick="saveWhatsAppConfig()"]');
  if(btnSaveWA){ btnSaveWA.addEventListener("click", ()=>setTimeout(updateWhatsAppLinkFromCart, 50)); }

  // Garante atualização do link na hora do clique
  const waBtn = document.getElementById("whatsBtn");
  if (waBtn) {
    waBtn.addEventListener("click", (e)=>{
      const href = updateWhatsAppLinkFromCart(true);
      if(!href){ e.preventDefault(); }
    });
  }
});

/* ===================== Carrinho Leve com Popover -> WhatsApp ===================== */
const CART_KEY = "pd_cart_light_v1";

function getCart(){ try{return JSON.parse(localStorage.getItem(CART_KEY))||{}}catch{return {}} }
function saveCartLight(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateWaBadge(); updateWhatsAppLinkFromCart(); }
function clearCart(){ saveCartLight({}); document.querySelectorAll(".menu-item.cart-selected").forEach(n=>n.classList.remove("cart-selected")); }

function currencyToCents(text){
  if(!text) return 0;
  const only = String(text).replace(/[^\d,]/g,"").replace(",",".");
  const num = parseFloat(only||"0");
  return Math.round(num*100);
}
function centsToCurrency(cents){
  const v = (cents||0)/100;
  return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

function extractCardData(card){
  const name = (card.querySelector("h3")?.textContent||"").trim();
  const priceText = [...card.querySelectorAll("p")].map(p=>p.textContent).find(t=>/R\$\s*\d/.test(t))||"";
  const priceCents = currencyToCents(priceText);

  let section = "Outros";
  const doces = card.closest("#doces");
  const salg  = card.closest("#pasteis");
  const beb   = card.closest("#bebidas");
  const porc  = card.closest("#porcoes .grid");
  if(doces) section="Pastéis Doces";
  else if(salg) section="Pastéis Salgados";
  else if(beb)  section="Bebidas";
  else if(porc) section="Porções";

  const id = card.getAttribute("data-id") || `static_${section}_${name}`;
  return { id, name, priceCents, section, card };
}

function updateWaBadge(){
  const badge = document.getElementById("waBadge");
  if(!badge) return;
  const cart = getCart();
  const totalQty = Object.values(cart).reduce((a,it)=>a+(it.qty||0),0);
  if(totalQty>0){ badge.textContent = String(totalQty); badge.style.display="inline-block"; }
  else { badge.style.display="none"; }
}

function buildCartMessage(){
  const items = Object.values(getCart());
  if(!items.length) return "";
  let total=0;
  const lines = items.map(it=>{
    const sub = (it.priceCents||0)*it.qty; total+=sub;
    const preco = it.priceCents ? ` — ${centsToCurrency(sub)} (${centsToCurrency(it.priceCents)} un)` : "";
    return `• ${it.qty}x ${it.name}${preco}`;
  });
  return [
    "Olá! Gostaria de fazer um pedido:","",
    ...lines,"",
    total>0?`Total: ${centsToCurrency(total)}`:"",
    "","Pode confirmar a disponibilidade? 🙂"
  ].filter(Boolean).join("\n");
}

/**
 * Atualiza todos os links de WhatsApp com a mensagem atual do carrinho.
 * Se `onClick` for true, também bloqueia a navegação se o carrinho estiver vazio.
 * Retorna o href usado (ou null se bloqueado).
 */
function updateWhatsAppLinkFromCart(onClick=false){
  const cfgRaw = localStorage.getItem("pd_whatsapp_cfg_v1");
  let cfg=null; try{ cfg = cfgRaw?JSON.parse(cfgRaw):null }catch{}
  const number = (cfg&&cfg.num) || "5516993452301";
  const defaultMsg = (cfg&&cfg.msg) || "Olá! Quero fazer um pedido.";
  const msg = buildCartMessage() || defaultMsg;

  const href = `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;

  const links = [];
  const btn1 = document.getElementById("whatsBtn");
  if(btn1) links.push(btn1);
  const btn2 = document.getElementById("cartToWhats");
  if(btn2) links.push(btn2);

  links.forEach(a => { a.href = href; a.setAttribute("target","_blank"); });

  if(onClick && !Object.keys(getCart()).length){
    alert("Seu carrinho está vazio. Selecione os itens para montar o pedido.");
    return null;
  }
  return href;
}

/* ---------------------- Popover de quantidade ---------------------- */
const qp = document.getElementById("qtyPopover");
const qpName = document.getElementById("qpName");
const qpSection = document.getElementById("qpSection");
const qpUnitPrice = document.getElementById("qpUnitPrice");
const qpSubtotal = document.getElementById("qpSubtotal");
const qpQty = document.getElementById("qpQty");
const qpMinus = document.getElementById("qpMinus");
const qpPlus = document.getElementById("qpPlus");
const qpCancel = document.getElementById("qpCancel");
const qpConfirm = document.getElementById("qpConfirm");
const qpRemove = document.getElementById("qpRemove");

let qpContext = null; // {card, data, existing}

function openQtyPopover(card){
  const adminOpen = !document.getElementById("adminArea").classList.contains("hidden");
  if(adminOpen) return;

  const data = extractCardData(card);
  if(!data.name) return alert("Não foi possível identificar o item.");

  const cart = getCart();
  const existing = cart[data.id];

  qpContext = { card, data, existing };
  qpName.textContent = data.name;
  qpSection.textContent = data.section;
  qpUnitPrice.textContent = data.priceCents ? centsToCurrency(data.priceCents) : "—";
  qpQty.value = existing ? String(existing.qty) : "1";
  updatePopoverSubtotal();

  qpConfirm.textContent = existing ? "Atualizar" : "Adicionar";
  qpRemove.style.display = existing ? "inline-flex" : "none";

  positionPopoverNearCard(card);
  qp.classList.add("show");

  setTimeout(()=>{ try{qpQty.focus(); qpQty.select();}catch{} }, 50);
}

function closeQtyPopover(){
  qp.classList.remove("show");
  qpContext = null;
}

function updatePopoverSubtotal(){
  if(!qpContext) return;
  const qty = parseInt(String(qpQty.value).replace(/\D/g,"")||"1",10);
  let sub = 0;
  if(qpContext.data.priceCents) sub = qty * qpContext.data.priceCents;
  qpSubtotal.textContent = centsToCurrency(sub);
}

function positionPopoverNearCard(card){
  const rect = card.getBoundingClientRect();
  const scrollY = window.scrollY||document.documentElement.scrollTop;
  const scrollX = window.scrollX||document.documentElement.scrollLeft;

  const popW = Math.min(280, window.innerWidth*0.92);
  qp.style.width = popW+"px";

  let top = rect.bottom + scrollY + 8;
  let left = rect.right + scrollX - popW;

  const popH = 160;
  if(top + popH > scrollY + window.innerHeight){
    top = rect.top + scrollY - popH - 8;
  }
  if(left < 8){
    left = rect.left + scrollX + (rect.width/2) - (popW/2);
  }
  left = Math.max(8, Math.min(left, scrollX + window.innerWidth - popW - 8));
  qp.style.top = top+"px";
  qp.style.left = left+"px";
}

qpMinus.addEventListener("click", ()=>{
  let v = parseInt(String(qpQty.value).replace(/\D/g,"")||"1",10);
  v = Math.max(1, v-1);
  qpQty.value = String(v);
  updatePopoverSubtotal();
});
qpPlus.addEventListener("click", ()=>{
  let v = parseInt(String(qpQty.value).replace(/\D/g,"")||"1",10);
  v = Math.max(1, v+1);
  qpQty.value = String(v);
  updatePopoverSubtotal();
});
qpQty.addEventListener("input", ()=>{
  qpQty.value = String((qpQty.value||"").replace(/[^\d]/g,""));
  if(qpQty.value==="") qpQty.value="1";
  updatePopoverSubtotal();
});
qpCancel.addEventListener("click", closeQtyPopover);

qpConfirm.addEventListener("click", ()=>{
  if(!qpContext) return;
  let qty = parseInt(String(qpQty.value).replace(/\D/g,"")||"1",10);
  const cart = getCart();

  if (qty <= 0) {
    delete cart[qpContext.data.id];
    saveCartLight(cart);
  } else {
    cart[qpContext.data.id] = {
      name: qpContext.data.name,
      section: qpContext.data.section,
      priceCents: qpContext.data.priceCents,
      qty
    };
    saveCartLight(cart);
  }

  refreshCardSelectedState(qpContext.card, cart);
  closeQtyPopover();
});

qpRemove.addEventListener("click", ()=>{
  if(!qpContext) return;
  const cart = getCart();
  delete cart[qpContext.data.id];
  saveCartLight(cart);
  refreshCardSelectedState(qpContext.card, cart);
  closeQtyPopover();
});

// fecha popover ao clicar fora
document.addEventListener("click",(e)=>{
  const el = e.target;
  if(!qp.classList.contains("show")) return;
  if(qp.contains(el)) return;
  const card = el.closest(".menu-item");
  if(card) return;
  closeQtyPopover();
});
window.addEventListener("scroll", ()=>{ if(qp.classList.contains("show") && qpContext){ positionPopoverNearCard(qpContext.card);} }, {passive:true});
window.addEventListener("resize", ()=>{ if(qp.classList.contains("show") && qpContext){ positionPopoverNearCard(qpContext.card);} });

// ---------------------- Integração com seus modos ----------------------
function refreshCardSelectedState(card, cart=null){
  const c = cart || getCart();
  const data = extractCardData(card);
  if(c[data.id]) card.classList.add("cart-selected");
  else card.classList.remove("cart-selected");
}
function refreshAllSelectedStates(){
  const cart = getCart();
  document.querySelectorAll(".menu-item").forEach(card=>refreshCardSelectedState(card, cart));
}

function attachCartClickHandlers(){
  document.querySelectorAll(".menu-item").forEach(card=>{
    if(card._cartHandler){ card.removeEventListener("click", card._cartHandler); card._cartHandler=null; }

    // se em modo admin, não abre popover
    if(localStorage.getItem("pd_mode_remove")==="1" || localStorage.getItem("pd_mode_edit")==="1" || localStorage.getItem("pd_mode_sort")==="1"){
      return;
    }
    const handler=(e)=>{
      if(e.target.closest("button, a, input, select, label")) return;
      openQtyPopover(card);
    };
    card.addEventListener("click", handler);
    card._cartHandler = handler;
  });
}
