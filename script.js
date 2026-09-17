/* =========================================================
   SHOPTRACKR - COMPLETE JAVASCRIPT
   Frontend only / LocalStorage
========================================================= */


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEYS = {
    products: "products",
    sales: "sales",
    purchases: "purchases",
    suppliers: "suppliers",
    expenses: "expenses",
    stockMovements: "stockMovements",
    invoices: "invoices",
    shopSettings: "shopSettings"
};


function loadData(key, fallback = []) {
    try {
        const data = localStorage.getItem(key);

        if (!data) return fallback;

        const parsed = JSON.parse(data);

        return parsed ?? fallback;
    } catch (error) {
        console.error(`Could not load ${key}:`, error);
        showToast(`Could not load ${key} data`);
        return fallback;
    }
}


let products = loadData(STORAGE_KEYS.products);
let sales = loadData(STORAGE_KEYS.sales);
let purchases = loadData(STORAGE_KEYS.purchases);
let suppliers = loadData(STORAGE_KEYS.suppliers);
let expenses = loadData(STORAGE_KEYS.expenses);
let stockMovements = loadData(STORAGE_KEYS.stockMovements);
let invoices = loadData(STORAGE_KEYS.invoices);
let shopSettings = loadData(STORAGE_KEYS.shopSettings, {});


let charts = {};

let editingProductIndex = null;
let editingSupplierIndex = null;
let editingPurchaseIndex = null;

let currentInvoiceId = null;

let reportRange = "today";
let customReportFrom = "";
let customReportTo = "";


/* =========================================================
   HELPERS
========================================================= */

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
        localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(sales));
        localStorage.setItem(STORAGE_KEYS.purchases, JSON.stringify(purchases));
        localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(suppliers));
        localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));
        localStorage.setItem(STORAGE_KEYS.stockMovements, JSON.stringify(stockMovements));
        localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(invoices));
        localStorage.setItem(STORAGE_KEYS.shopSettings, JSON.stringify(shopSettings));
    } catch (error) {
        console.error(error);
        showToast("Could not save data");
    }
}


function uid(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}


function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}


function money(value) {
    return "₹" + number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


function formatDate(date) {
    if (!date) return "-";

    const d = new Date(date + "T00:00:00");

    if (Number.isNaN(d.getTime())) return date;

    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


function todayString() {
    const d = new Date();

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${y}-${m}-${day}`;
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function showToast(message) {
    const toast = document.getElementById("toast");
    const text = document.getElementById("toastMessage");

    if (!toast || !text) return;

    text.textContent = message;

    toast.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


function confirmAction(message, callback) {
    const modal = document.getElementById("confirmModal");
    const messageEl = document.getElementById("confirmMessage");
    const button = document.getElementById("confirmButton");

    if (!modal || !messageEl || !button) {
        if (confirm(message)) callback();
        return;
    }

    messageEl.textContent = message;

    button.onclick = () => {
        closeModal("confirmModal");
        callback();
    };

    openModal("confirmModal");
}


function openModal(id) {
    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.add("active");
    }
}


function closeModal(id) {
    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.remove("active");
    }
}


/* =========================================================
   NAVIGATION
========================================================= */

function toggleMobileMenu(forceState) {
    const nav = document.getElementById("mainNavigation");
    const toggle = document.getElementById("mobileMenuToggle");
    const backdrop = document.getElementById("mobileNavBackdrop");

    if (!nav || !toggle) return;

    const shouldOpen = typeof forceState === "boolean"
        ? forceState
        : !nav.classList.contains("open");

    nav.classList.toggle("open", shouldOpen);
    toggle.setAttribute("aria-expanded", String(shouldOpen));

    if (backdrop) {
        backdrop.classList.toggle("show", shouldOpen);
    }

    document.body.classList.toggle("nav-lock", shouldOpen);
}

function showPage(page, btn) {
    // Auto-close the mobile hamburger menu whenever a section is chosen
    if (window.innerWidth <= 768) {
        toggleMobileMenu(false);
    }

    document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active");
    });

    const selectedPage = document.getElementById(page);

    if (selectedPage) {
        selectedPage.classList.add("active");
    }

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.remove("active-nav");
    });

    if (btn) {
        btn.classList.add("active-nav");
    }

    if (page === "dashboard") {
        renderDashboard();
    }

    if (page === "reports") {
        renderReports();
    }
}


/* =========================================================
   DATE HELPERS
========================================================= */

function isDateInRange(date, from, to) {
    if (!date) return false;

    if (from && date < from) return false;

    if (to && date > to) return false;

    return true;
}


function getRangeDates(range) {
    const today = new Date();

    const end = todayString();

    if (range === "today") {
        return {
            from: end,
            to: end
        };
    }

    if (range === "week") {
        const d = new Date();

        const day = d.getDay();

        const diff = day === 0 ? -6 : 1 - day;

        d.setDate(d.getDate() + diff);

        const from =
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        return {
            from,
            to: end
        };
    }

    if (range === "month") {
        const fromDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

        const from =
            `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-01`;

        return {
            from,
            to: end
        };
    }

    if (range === "custom") {
        return {
            from: customReportFrom,
            to: customReportTo
        };
    }

    return {
        from: "",
        to: ""
    };
}


/* =========================================================
   PRODUCT HELPERS
========================================================= */

function getProductById(id) {
    return products.find(p => p.id === id);
}


function getProductIndexById(id) {
    return products.findIndex(p => p.id === id);
}


function normalizeProducts() {
    products = products.map((p, index) => {
        return {
            id: p.id || uid("product"),
            name: p.name || "Unnamed Product",
            category: p.category || "",
            unit: p.unit || "pcs",
            cost: number(p.cost),
            sell: number(p.sell),
            qty: number(p.qty),
            lowStockThreshold:
                p.lowStockThreshold !== undefined
                    ? number(p.lowStockThreshold)
                    : 5
        };
    });

    saveData();
}


function getProductStatus(product) {
    if (number(product.qty) <= 0) {
        return {
            text: "OUT OF STOCK",
            className: "status-out"
        };
    }

    if (number(product.qty) <= number(product.lowStockThreshold || 5)) {
        return {
            text: "LOW STOCK",
            className: "status-low"
        };
    }

    return {
        text: "IN STOCK",
        className: "status-good"
    };
}


function getProductProfitPerUnit(product) {
    return number(product.sell) - number(product.cost);
}


function getProductMargin(product) {
    if (number(product.sell) <= 0) return 0;

    return (
        getProductProfitPerUnit(product) /
        number(product.sell)
    ) * 100;
}


/* =========================================================
   INVENTORY
========================================================= */

function updatePriceUnits() {
    const unit = document.getElementById("unit")?.value || "pcs";

    const costUnit = document.getElementById("costUnit");
    const sellUnit = document.getElementById("sellUnit");

    if (costUnit) costUnit.textContent = "/" + unit;
    if (sellUnit) sellUnit.textContent = "/" + unit;
}


function addProduct() {
    const name = document.getElementById("name").value.trim();
    const category = document.getElementById("category").value.trim();
    const unit = document.getElementById("unit").value;

    const cost = number(document.getElementById("cost").value);
    const sell = number(document.getElementById("sell").value);
    const qty = number(document.getElementById("qty").value);

    let threshold =
        document.getElementById("lowStockThreshold").value;

    threshold =
        threshold === ""
            ? 5
            : number(threshold);


    if (!name) {
        showToast("Enter product name");
        return;
    }

    if (cost < 0 || sell < 0 || qty < 0 || threshold < 0) {
        showToast("Negative values are not allowed");
        return;
    }

    if (sell < 0 || cost < 0) {
        showToast("Invalid price");
        return;
    }


    const product = {
        id: uid("product"),
        name,
        category,
        unit,
        cost,
        sell,
        qty,
        lowStockThreshold: threshold
    };

    products.push(product);

    if (qty > 0) {
        addStockMovement(
            product.id,
            "opening",
            qty,
            0,
            qty,
            "Opening stock"
        );
    }

    saveData();

    clearProductForm();

    renderEverything();

    showToast("Product added successfully");
}


function clearProductForm() {
    const ids = [
        "name",
        "category",
        "cost",
        "sell",
        "qty",
        "lowStockThreshold"
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);

        if (el) el.value = "";
    });

    const unit = document.getElementById("unit");

    if (unit) unit.value = "pcs";

    updatePriceUnits();
}


function renderProducts() {
    const table = document.getElementById("productTable");
    const empty = document.getElementById("inventoryEmpty");

    if (!table) return;

    const search =
        document.getElementById("inventorySearch")?.value
            .trim()
            .toLowerCase() || "";

    const category =
        document.getElementById("inventoryCategoryFilter")?.value || "";

    const sort =
        document.getElementById("inventorySort")?.value ||
        "nameAsc";


    let filtered = products.filter(product => {

        const matchesSearch =
            !search ||
            product.name.toLowerCase().includes(search) ||
            (product.category || "").toLowerCase().includes(search);

        const matchesCategory =
            !category ||
            product.category === category;

        return matchesSearch && matchesCategory;
    });


    filtered.sort((a, b) => {

        if (sort === "nameAsc") {
            return a.name.localeCompare(b.name);
        }

        if (sort === "nameDesc") {
            return b.name.localeCompare(a.name);
        }

        if (sort === "stockLow") {
            return a.qty - b.qty;
        }

        if (sort === "stockHigh") {
            return b.qty - a.qty;
        }

        if (sort === "priceLow") {
            return a.sell - b.sell;
        }

        if (sort === "priceHigh") {
            return b.sell - a.sell;
        }

        return 0;
    });


    table.innerHTML = "";


    filtered.forEach(product => {

        const index =
            products.findIndex(p => p.id === product.id);

        const status = getProductStatus(product);

        const profit = getProductProfitPerUnit(product);

        const margin = getProductMargin(product);

        const stockValue =
            number(product.qty) * number(product.cost);


        table.innerHTML += `
            <tr>
                <td>${escapeHTML(product.name)}</td>

                <td>${escapeHTML(product.category || "-")}</td>

                <td>${money(product.cost)}</td>

                <td>${money(product.sell)}</td>

                <td>${money(profit)}</td>

                <td>${margin.toFixed(2)}%</td>

                <td>
                    ${product.qty} ${escapeHTML(product.unit)}
                </td>

                <td>${money(stockValue)}</td>

                <td>
                    <span class="status ${status.className}">
                        ${status.text}
                    </span>
                </td>

                <td>
                    <div class="action-buttons">
                        <button
                            class="stock-btn"
                            onclick="addStock(${index})">
                            + Stock
                        </button>

                        <button
                            class="sell"
                            onclick="quickSell(${index})">
                            Sell
                        </button>

                        <button
                            class="secondary-btn"
                            onclick="editProduct(${index})">
                            Edit
                        </button>

                        <button
                            class="delete"
                            onclick="deleteProduct(${index})">
                            Remove
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });


    if (empty) {
        empty.style.display =
            filtered.length ? "none" : "block";
    }


    updateInventoryCategoryFilter();
    updateDropdown();
    updatePurchaseProductDropdown();
}


function updateInventoryCategoryFilter() {
    const select =
        document.getElementById("inventoryCategoryFilter");

    if (!select) return;

    const current = select.value;

    const categories =
        [...new Set(
            products
                .map(p => p.category)
                .filter(Boolean)
        )]
        .sort((a, b) => a.localeCompare(b));


    select.innerHTML =
        `<option value="">All Categories</option>`;

    categories.forEach(category => {
        select.innerHTML += `
            <option value="${escapeHTML(category)}">
                ${escapeHTML(category)}
            </option>
        `;
    });

    select.value = current;
}


function addStock(index) {
    const product = products[index];

    if (!product) return;

    const input = prompt(
        `Enter quantity to add to ${product.name}:`
    );

    if (input === null) return;

    const qty = number(input);

    if (qty <= 0) {
        showToast("Enter a valid quantity");
        return;
    }

    const oldStock = number(product.qty);

    product.qty += qty;

    addStockMovement(
        product.id,
        "adjustment",
        qty,
        oldStock,
        product.qty,
        "Manual stock addition"
    );

    saveData();

    renderEverything();

    showToast("Stock added successfully");
}


function editProduct(index) {
    const product = products[index];

    if (!product) return;

    editingProductIndex = index;

    document.getElementById("productModalTitle").textContent =
        "Edit Product";

    document.getElementById("modalProductName").value =
        product.name;

    document.getElementById("modalProductCategory").value =
        product.category || "";

    document.getElementById("modalProductUnit").value =
        product.unit || "pcs";

    document.getElementById("modalProductCost").value =
        product.cost;

    document.getElementById("modalProductSell").value =
        product.sell;

    document.getElementById("modalProductStock").value =
        product.qty;

    openModal("productModal");
}


function saveModalProduct() {
    const name =
        document.getElementById("modalProductName").value.trim();

    const category =
        document.getElementById("modalProductCategory").value.trim();

    const unit =
        document.getElementById("modalProductUnit").value;

    const cost =
        number(document.getElementById("modalProductCost").value);

    const sell =
        number(document.getElementById("modalProductSell").value);

    const stock =
        number(document.getElementById("modalProductStock").value);


    if (!name) {
        showToast("Enter product name");
        return;
    }

    if (
        cost < 0 ||
        sell < 0 ||
        stock < 0
    ) {
        showToast("Invalid values");
        return;
    }


    if (editingProductIndex === null) {

        const product = {
            id: uid("product"),
            name,
            category,
            unit,
            cost,
            sell,
            qty: stock,
            lowStockThreshold: 5
        };

        products.push(product);

        if (stock > 0) {
            addStockMovement(
                product.id,
                "opening",
                stock,
                0,
                stock,
                "Opening stock"
            );
        }

        showToast("Product added");

    } else {

        const product =
            products[editingProductIndex];

        const oldStock = number(product.qty);

        product.name = name;
        product.category = category;
        product.unit = unit;
        product.cost = cost;
        product.sell = sell;
        product.qty = stock;

        const difference = stock - oldStock;

        if (difference !== 0) {

            addStockMovement(
                product.id,
                "adjustment",
                difference,
                oldStock,
                stock,
                "Product stock edited"
            );
        }

        showToast("Product updated");
    }


    editingProductIndex = null;

    saveData();

    closeModal("productModal");

    renderEverything();
}


function deleteProduct(index) {
    const product = products[index];

    if (!product) return;

    const hasSales =
        sales.some(s => s.productId === product.id);

    const hasPurchases =
        purchases.some(p => p.productId === product.id);


    if (hasSales || hasPurchases) {
        showToast(
            "Cannot remove a product with transaction history"
        );
        return;
    }


    confirmAction(
        `Remove "${product.name}" from inventory?`,
        () => {

            products.splice(index, 1);

            saveData();

            renderEverything();

            showToast("Product removed");
        }
    );
}


/* =========================================================
   STOCK MOVEMENT
========================================================= */

function addStockMovement(
    productId,
    type,
    quantity,
    previousStock,
    newStock,
    note = ""
) {
    stockMovements.push({
        id: uid("movement"),
        productId,
        type,
        quantity,
        previousStock,
        newStock,
        date: todayString(),
        note
    });
}


/* =========================================================
   SALES
========================================================= */

function updateDropdown() {
    const select =
        document.getElementById("saleProduct");

    if (!select) return;

    const current = select.value;

    select.innerHTML = "";

    if (!products.length) {
        select.innerHTML =
            `<option value="">No products available</option>`;
        updateSalePreview();
        return;
    }


    products
        .slice()
        .sort((a, b) =>
            a.name.localeCompare(b.name)
        )
        .forEach(product => {

            select.innerHTML += `
                <option value="${product.id}">
                    ${escapeHTML(product.name)}
                    (${product.qty} ${escapeHTML(product.unit)})
                </option>
            `;
        });


    if (products.some(p => p.id === current)) {
        select.value = current;
    }

    updateSalePreview();
}


function calculateSale() {
    const productId =
        document.getElementById("saleProduct")?.value;

    const qty =
        number(document.getElementById("saleQty")?.value);

    const discountType =
        document.getElementById("discountType")?.value ||
        "none";

    const discountValue =
        number(document.getElementById("discountValue")?.value);


    const product =
        getProductById(productId);


    if (!product || qty <= 0) {
        return {
            subtotal: 0,
            discount: 0,
            taxable: 0,
            gst: 0,
            grandTotal: 0,
            cgst: 0,
            sgst: 0,
            igst: 0
        };
    }


    const subtotal =
        qty * number(product.sell);


    let discount = 0;


    if (discountType === "fixed") {
        discount = Math.min(
            Math.max(discountValue, 0),
            subtotal
        );
    }


    if (discountType === "percentage") {
        discount =
            subtotal *
            Math.min(
                Math.max(discountValue, 0),
                100
            ) / 100;
    }


    const taxable =
        Math.max(0, subtotal - discount);


    const gstEnabled =
        document.getElementById("saleGstEnabled")?.checked;

    const gstRate =
        number(document.getElementById("saleGstRate")?.value);

    const gstType =
        document.getElementById("saleGstType")?.value ||
        "none";


    let gst = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;


    if (gstEnabled && gstRate > 0) {

        gst =
            taxable *
            gstRate /
            100;


        if (gstType === "cgst_sgst") {
            cgst = gst / 2;
            sgst = gst / 2;
        }

        if (gstType === "igst") {
            igst = gst;
        }
    }


    return {
        subtotal,
        discount,
        taxable,
        gst,
        grandTotal: taxable + gst,
        cgst,
        sgst,
        igst
    };
}


function updateSalePreview() {
    const result = calculateSale();

    const subtotal =
        document.getElementById("saleSubtotal");

    const discount =
        document.getElementById("saleDiscount");

    const gst =
        document.getElementById("saleGst");

    const grand =
        document.getElementById("saleGrandTotal");


    if (subtotal) subtotal.textContent = money(result.subtotal);

    if (discount) discount.textContent = money(result.discount);

    if (gst) gst.textContent = money(result.gst);

    if (grand) grand.textContent = money(result.grandTotal);
}


function recordSale() {
    const productId =
        document.getElementById("saleProduct").value;

    const qty =
        number(document.getElementById("saleQty").value);

    const customer =
        document.getElementById("customerName").value.trim();


    const product =
        getProductById(productId);


    if (!product) {
        showToast("Select a product");
        return;
    }

    if (qty <= 0) {
        showToast("Enter a valid quantity");
        return;
    }

    if (qty > number(product.qty)) {
        showToast("Not enough stock");
        return;
    }


    const result = calculateSale();

    const saleDate = todayString();

    const sale = {
        id: uid("sale"),
        productId: product.id,
        name: product.name,
        customer: customer,

        qty,

        sellPrice: number(product.sell),

        costPrice: number(product.cost),

        amount: result.grandTotal,

        subtotal: result.subtotal,

        discount: result.discount,

        discountType:
            document.getElementById("discountType").value,

        discountValue:
            number(
                document.getElementById("discountValue").value
            ),

        taxableAmount: result.taxable,

        gstEnabled:
            document.getElementById("saleGstEnabled").checked,

        gstRate:
            number(
                document.getElementById("saleGstRate").value
            ),

        gstType:
            document.getElementById("saleGstType").value,

        gst: result.gst,

        cgst: result.cgst,

        sgst: result.sgst,

        igst: result.igst,

        cogs:
            qty * number(product.cost),

        profit:
            result.taxable -
            qty * number(product.cost),

        date: saleDate
    };


    const oldStock = number(product.qty);

    product.qty -= qty;


    addStockMovement(
        product.id,
        "sale",
        -qty,
        oldStock,
        product.qty,
        `Sale ${sale.id}`
    );


    sales.push(sale);


    const invoice = createInvoiceFromSale(sale);

    sale.invoiceId = invoice.id;


    clearSaleForm();

    saveData();

    renderEverything();

    showInvoice(invoice.id);

    showToast("Sale recorded successfully");
}


function quickSell(index) {
    const product = products[index];

    if (!product) return;

    const input =
        prompt(`Enter quantity sold for ${product.name}:`);

    if (input === null) return;

    const qty = number(input);

    if (qty <= 0) {
        showToast("Invalid quantity");
        return;
    }

    if (qty > product.qty) {
        showToast("Not enough stock");
        return;
    }


    const amount =
        qty * number(product.sell);

    const cogs =
        qty * number(product.cost);

    const profit =
        amount - cogs;


    const sale = {
        id: uid("sale"),
        productId: product.id,
        name: product.name,
        customer: "",
        qty,
        sellPrice: product.sell,
        costPrice: product.cost,
        amount,
        subtotal: amount,
        discount: 0,
        discountType: "none",
        discountValue: 0,
        taxableAmount: amount,
        gstEnabled: false,
        gstRate: 0,
        gstType: "none",
        gst: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        cogs,
        profit,
        date: todayString()
    };


    const oldStock = product.qty;

    product.qty -= qty;


    addStockMovement(
        product.id,
        "sale",
        -qty,
        oldStock,
        product.qty,
        `Quick sale ${sale.id}`
    );


    sales.push(sale);


    const invoice =
        createInvoiceFromSale(sale);

    sale.invoiceId = invoice.id;


    saveData();

    renderEverything();

    showInvoice(invoice.id);

    showToast("Sale recorded");
}


function clearSaleForm() {
    const qty = document.getElementById("saleQty");
    const customer = document.getElementById("customerName");
    const discount = document.getElementById("discountValue");

    if (qty) qty.value = "";
    if (customer) customer.value = "";
    if (discount) discount.value = "";

    const discountType =
        document.getElementById("discountType");

    if (discountType) {
        discountType.value = "none";
    }

    const gst =
        document.getElementById("saleGstEnabled");

    if (gst) {
        gst.checked = false;
    }

    const gstRate =
        document.getElementById("saleGstRate");

    if (gstRate) gstRate.value = "";

    const gstType =
        document.getElementById("saleGstType");

    if (gstType) gstType.value = "none";

    updateSalePreview();
}


function renderSales() {
    const table =
        document.getElementById("salesTable");

    const empty =
        document.getElementById("salesEmpty");

    if (!table) return;


    const search =
        document.getElementById("salesSearch")?.value
            .trim()
            .toLowerCase() || "";

    const from =
        document.getElementById("salesDateFrom")?.value || "";

    const to =
        document.getElementById("salesDateTo")?.value || "";

    const sort =
        document.getElementById("salesSort")?.value ||
        "newest";


    let filtered =
        sales.filter(sale => {

            const text =
                `${sale.name || ""} ${sale.customer || ""}`
                    .toLowerCase();

            return (
                (!search || text.includes(search)) &&
                isDateInRange(sale.date, from, to)
            );
        });


    filtered.sort((a, b) => {

        if (sort === "oldest") {
            return (a.date || "").localeCompare(b.date || "");
        }

        return (b.date || "").localeCompare(a.date || "");
    });


    table.innerHTML = "";


    filtered.forEach(sale => {

        const index =
            sales.findIndex(s => s.id === sale.id);


        table.innerHTML += `
            <tr>

                <td>${formatDate(sale.date)}</td>

                <td>${escapeHTML(sale.name)}</td>

                <td>${escapeHTML(sale.customer || "-")}</td>

                <td>${sale.qty}</td>

                <td>${money(sale.amount)}</td>

                <td>${money(sale.discount || 0)}</td>

                <td>${money(sale.profit || 0)}</td>

                <td>
                    <div class="action-buttons">

                        <button
                            class="secondary-btn"
                            onclick="showInvoiceForSale(${index})">
                            Invoice
                        </button>

                        <button
                            class="delete"
                            onclick="deleteSale(${index})">
                            Remove
                        </button>

                    </div>
                </td>

            </tr>
        `;
    });


    if (empty) {
        empty.style.display =
            filtered.length ? "none" : "block";
    }
}


function deleteSale(index) {
    const sale = sales[index];

    if (!sale) return;


    confirmAction(
        "Remove this sale record? Stock will be restored.",
        () => {

            const product =
                getProductById(sale.productId);


            if (product) {

                const oldStock =
                    number(product.qty);

                product.qty += number(sale.qty);


                addStockMovement(
                    product.id,
                    "adjustment",
                    number(sale.qty),
                    oldStock,
                    product.qty,
                    `Sale deleted ${sale.id}`
                );
            }


            if (sale.invoiceId) {
                invoices =
                    invoices.filter(
                        invoice =>
                            invoice.id !== sale.invoiceId
                    );
            }


            sales.splice(index, 1);

            saveData();

            renderEverything();

            showToast("Sale removed and stock restored");
        }
    );
}


/* =========================================================
   PURCHASES
========================================================= */

function updatePurchaseProductDropdown() {
    const select =
        document.getElementById("purchaseProduct");

    if (!select) return;

    const current = select.value;

    select.innerHTML =
        `<option value="">Select Product</option>`;


    products
        .slice()
        .sort((a, b) =>
            a.name.localeCompare(b.name)
        )
        .forEach(product => {

            select.innerHTML += `
                <option value="${product.id}">
                    ${escapeHTML(product.name)}
                </option>
            `;
        });


    if (products.some(p => p.id === current)) {
        select.value = current;
    }

    updatePurchaseProduct();
}


function updatePurchaseProduct() {
    const productId =
        document.getElementById("purchaseProduct")?.value;

    const product =
        getProductById(productId);

    const unit =
        document.getElementById("purchaseUnit");

    if (unit) {
        unit.textContent =
            "/" + (product?.unit || "pcs");
    }


    const price =
        document.getElementById("purchasePrice");


    if (
        price &&
        product &&
        price.value === ""
    ) {
        price.value = product.cost || "";
    }


    updatePurchaseTotal();
}


function updatePurchaseTotal() {
    const qty =
        number(document.getElementById("purchaseQty")?.value);

    const price =
        number(document.getElementById("purchasePrice")?.value);

    const total =
        document.getElementById("purchaseTotal");

    if (total) {
        total.textContent =
            money(qty * price);
    }
}


function openAddPurchaseProduct() {
    editingProductIndex = null;

    document.getElementById("productModalTitle").textContent =
        "Add Product";

    document.getElementById("modalProductName").value = "";
    document.getElementById("modalProductCategory").value = "";
    document.getElementById("modalProductUnit").value = "pcs";
    document.getElementById("modalProductCost").value = "";
    document.getElementById("modalProductSell").value = "";
    document.getElementById("modalProductStock").value = "0";

    openModal("productModal");
}


function savePurchase() {
    const supplierName =
        document.getElementById("purchaseSupplier")
            .value.trim();

    const productId =
        document.getElementById("purchaseProduct").value;

    const qty =
        number(document.getElementById("purchaseQty").value);

    const price =
        number(document.getElementById("purchasePrice").value);

    const date =
        document.getElementById("purchaseDate").value ||
        todayString();

    const invoice =
        document.getElementById("purchaseInvoice")
            .value.trim();

    const notes =
        document.getElementById("purchaseNotes")
            .value.trim();


    if (!supplierName) {
        showToast("Enter supplier name");
        return;
    }

    if (!productId) {
        showToast("Select a product");
        return;
    }

    if (qty <= 0) {
        showToast("Enter valid quantity");
        return;
    }

    if (price < 0) {
        showToast("Invalid purchase price");
        return;
    }


    const product =
        getProductById(productId);

    if (!product) {
        showToast("Product not found");
        return;
    }


    const totalCost =
        qty * price;


    const purchase = {
        id: uid("purchase"),
        supplier: supplierName,
        productId,
        product: product.name,
        quantity: qty,
        qty,
        purchasePrice: price,
        price,
        totalCost,
        date,
        invoice,
        notes
    };


    const oldStock =
        number(product.qty);

    product.qty += qty;


    addStockMovement(
        product.id,
        "purchase",
        qty,
        oldStock,
        product.qty,
        `Purchase ${invoice || purchase.id}`
    );


    purchases.push(purchase);


    saveData();

    clearPurchaseForm();

    renderEverything();

    showToast("Purchase saved successfully");
}


function clearPurchaseForm() {
    const ids = [
        "purchaseSupplier",
        "purchaseQty",
        "purchasePrice",
        "purchaseInvoice",
        "purchaseNotes"
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);

        if (el) el.value = "";
    });


    const date =
        document.getElementById("purchaseDate");

    if (date) {
        date.value = todayString();
    }


    updatePurchaseTotal();
}


function updatePurchaseFilters() {
    const select =
        document.getElementById("purchaseProductFilter");

    if (!select) return;

    const current = select.value;

    select.innerHTML =
        `<option value="">All Products</option>`;


    products
        .slice()
        .sort((a, b) =>
            a.name.localeCompare(b.name)
        )
        .forEach(product => {

            select.innerHTML += `
                <option value="${product.id}">
                    ${escapeHTML(product.name)}
                </option>
            `;
        });


    select.value = current;
}


function renderPurchases() {
    const table =
        document.getElementById("purchaseTable");

    const empty =
        document.getElementById("purchaseEmpty");

    if (!table) return;


    updatePurchaseFilters();


    const search =
        document.getElementById("purchaseSearch")?.value
            .trim()
            .toLowerCase() || "";

    const from =
        document.getElementById("purchaseDateFrom")?.value || "";

    const to =
        document.getElementById("purchaseDateTo")?.value || "";

    const supplier =
        document.getElementById("purchaseSupplierFilter")?.value
            .trim()
            .toLowerCase() || "";

    const productId =
        document.getElementById("purchaseProductFilter")?.value ||
        "";

    const sort =
        document.getElementById("purchaseSort")?.value ||
        "newest";


    let filtered =
        purchases.filter(purchase => {

            const text =
                `${purchase.supplier || ""} ${purchase.product || ""} ${purchase.invoice || ""}`
                    .toLowerCase();


            return (
                (!search || text.includes(search)) &&
                (!supplier ||
                    (purchase.supplier || "")
                        .toLowerCase()
                        .includes(supplier)) &&
                (!productId ||
                    purchase.productId === productId) &&
                isDateInRange(purchase.date, from, to)
            );
        });


    filtered.sort((a, b) => {

        if (sort === "oldest") {
            return (a.date || "").localeCompare(b.date || "");
        }

        return (b.date || "").localeCompare(a.date || "");
    });


    table.innerHTML = "";


    filtered.forEach(purchase => {

        const index =
            purchases.findIndex(
                p => p.id === purchase.id
            );


        table.innerHTML += `
            <tr>

                <td>${formatDate(purchase.date)}</td>

                <td>${escapeHTML(purchase.invoice || "-")}</td>

                <td>${escapeHTML(purchase.supplier)}</td>

                <td>${escapeHTML(purchase.product)}</td>

                <td>${purchase.qty}</td>

                <td>${money(purchase.price)}</td>

                <td>${money(purchase.totalCost)}</td>

                <td>

                    <div class="action-buttons">

                        <button
                            class="secondary-btn"
                            onclick="viewPurchase(${index})">
                            View
                        </button>

                        <button
                            class="secondary-btn"
                            onclick="editPurchase(${index})">
                            Edit
                        </button>

                        <button
                            class="delete"
                            onclick="deletePurchase(${index})">
                            Delete
                        </button>

                    </div>

                </td>

            </tr>
        `;
    });


    if (empty) {
        empty.style.display =
            filtered.length ? "none" : "block";
    }
}


function viewPurchase(index) {
    const purchase = purchases[index];

    if (!purchase) return;


    const content =
        document.getElementById("purchaseDetailsContent");

    if (!content) return;


    content.innerHTML = `
        <div class="dashboard-list">

            <div class="dashboard-list-item">
                <span>Date</span>
                <strong>${formatDate(purchase.date)}</strong>
            </div>

            <div class="dashboard-list-item">
                <span>Invoice</span>
                <strong>${escapeHTML(purchase.invoice || "-")}</strong>
            </div>

            <div class="dashboard-list-item">
                <span>Supplier</span>
                <strong>${escapeHTML(purchase.supplier)}</strong>
            </div>

            <div class="dashboard-list-item">
                <span>Product</span>
                <strong>${escapeHTML(purchase.product)}</strong>
            </div>

            <div class="dashboard-list-item">
                <span>Quantity</span>
                <strong>${purchase.qty}</strong>
            </div>

            <div class="dashboard-list-item">
                <span>Purchase Price</span>
                <strong>${money(purchase.price)}</strong>
            </div>

            <div class="dashboard-list-item">
                <span>Total Cost</span>
                <strong>${money(purchase.totalCost)}</strong>
            </div>

            <div class="dashboard-list-item">
                <span>Notes</span>
                <strong>${escapeHTML(purchase.notes || "-")}</strong>
            </div>

        </div>
    `;


    openModal("purchaseDetailsModal");
}


function editPurchase(index) {
    const purchase = purchases[index];

    if (!purchase) return;

    editingPurchaseIndex = index;


    document.getElementById("editPurchaseSupplier").value =
        purchase.supplier || "";

    const select =
        document.getElementById("editPurchaseProduct");


    select.innerHTML =
        `<option value="">Select Product</option>`;


    products
        .slice()
        .sort((a, b) =>
            a.name.localeCompare(b.name)
        )
        .forEach(product => {

            select.innerHTML += `
                <option value="${product.id}">
                    ${escapeHTML(product.name)}
                </option>
            `;
        });


    select.value = purchase.productId;


    document.getElementById("editPurchaseQty").value =
        purchase.qty;

    document.getElementById("editPurchasePrice").value =
        purchase.price;

    document.getElementById("editPurchaseDate").value =
        purchase.date;

    document.getElementById("editPurchaseInvoice").value =
        purchase.invoice || "";

    document.getElementById("editPurchaseNotes").value =
        purchase.notes || "";


    openModal("editPurchaseModal");
}


function updatePurchase() {
    const index = editingPurchaseIndex;

    if (index === null) return;


    const purchase = purchases[index];

    const supplier =
        document.getElementById("editPurchaseSupplier")
            .value.trim();

    const productId =
        document.getElementById("editPurchaseProduct").value;

    const qty =
        number(document.getElementById("editPurchaseQty").value);

    const price =
        number(document.getElementById("editPurchasePrice").value);

    const date =
        document.getElementById("editPurchaseDate").value ||
        todayString();

    const invoice =
        document.getElementById("editPurchaseInvoice")
            .value.trim();

    const notes =
        document.getElementById("editPurchaseNotes")
            .value.trim();


    if (!supplier || !productId || qty <= 0 || price < 0) {
        showToast("Enter valid purchase details");
        return;
    }


    const oldProduct =
        getProductById(purchase.productId);

    const newProduct =
        getProductById(productId);


    if (!newProduct) {
        showToast("Product not found");
        return;
    }


    /*
       First reverse the original purchase.
    */

    if (oldProduct) {

        const oldStock =
            number(oldProduct.qty);

        oldProduct.qty =
            Math.max(
                0,
                oldProduct.qty - number(purchase.qty)
            );


        addStockMovement(
            oldProduct.id,
            "adjustment",
            -number(purchase.qty),
            oldStock,
            oldProduct.qty,
            `Reversed purchase ${purchase.id}`
        );
    }


    /*
       Apply the new purchase.
    */

    const previousStock =
        number(newProduct.qty);

    newProduct.qty += qty;


    addStockMovement(
        newProduct.id,
        "purchase",
        qty,
        previousStock,
        newProduct.qty,
        `Updated purchase ${purchase.id}`
    );


    purchase.supplier = supplier;
    purchase.productId = productId;
    purchase.product = newProduct.name;
    purchase.qty = qty;
    purchase.quantity = qty;
    purchase.price = price;
    purchase.purchasePrice = price;
    purchase.totalCost = qty * price;
    purchase.date = date;
    purchase.invoice = invoice;
    purchase.notes = notes;


    editingPurchaseIndex = null;

    saveData();

    closeModal("editPurchaseModal");

    renderEverything();

    showToast("Purchase updated successfully");
}


function deletePurchase(index) {
    const purchase = purchases[index];

    if (!purchase) return;


    confirmAction(
        "Delete this purchase? The purchased stock will be removed.",
        () => {

            const product =
                getProductById(purchase.productId);


            if (product) {

                const oldStock =
                    number(product.qty);

                product.qty =
                    Math.max(
                        0,
                        product.qty - number(purchase.qty)
                    );


                addStockMovement(
                    product.id,
                    "adjustment",
                    -number(purchase.qty),
                    oldStock,
                    product.qty,
                    `Purchase deleted ${purchase.id}`
                );
            }


            purchases.splice(index, 1);

            saveData();

            renderEverything();

            showToast("Purchase deleted");
        }
    );
}


/* =========================================================
   SUPPLIERS
========================================================= */

function saveSupplier() {
    const name =
        document.getElementById("supplierName")
            .value.trim();

    const phone =
        document.getElementById("supplierPhone")
            .value.trim();

    const email =
        document.getElementById("supplierEmail")
            .value.trim();

    const address =
        document.getElementById("supplierAddress")
            .value.trim();

    const notes =
        document.getElementById("supplierNotes")
            .value.trim();


    if (!name) {
        showToast("Enter supplier name");
        return;
    }


    suppliers.push({
        id: uid("supplier"),
        name,
        phone,
        email,
        address,
        notes
    });


    saveData();

    clearSupplierForm();

    renderEverything();

    showToast("Supplier added");
}


function clearSupplierForm() {
    [
        "supplierName",
        "supplierPhone",
        "supplierEmail",
        "supplierAddress",
        "supplierNotes"
    ].forEach(id => {

        const el = document.getElementById(id);

        if (el) el.value = "";
    });
}


function renderSuppliers() {
    const table =
        document.getElementById("supplierTable");

    const empty =
        document.getElementById("supplierEmpty");

    if (!table) return;


    const search =
        document.getElementById("supplierSearch")?.value
            .trim()
            .toLowerCase() || "";


    const filtered =
        suppliers.filter(supplier => {

            const text =
                `${supplier.name} ${supplier.phone} ${supplier.email || ""} ${supplier.address || ""}`
                    .toLowerCase();

            return !search || text.includes(search);
        });


    table.innerHTML = "";


    filtered.forEach(supplier => {

        const index =
            suppliers.findIndex(
                s => s.id === supplier.id
            );


        const total =
            purchases
                .filter(
                    p =>
                        p.supplier.toLowerCase() ===
                        supplier.name.toLowerCase()
                )
                .reduce(
                    (sum, p) =>
                        sum + number(p.totalCost),
                    0
                );


        table.innerHTML += `
            <tr>

                <td>${escapeHTML(supplier.name)}</td>

                <td>${escapeHTML(supplier.phone || "-")}</td>

                <td>${escapeHTML(supplier.email || "-")}</td>

                <td>${escapeHTML(supplier.address || "-")}</td>

                <td>${money(total)}</td>

                <td>

                    <div class="action-buttons">

                        <button
                            class="secondary-btn"
                            onclick="viewSupplierHistory(${index})">
                            History
                        </button>

                        <button
                            class="secondary-btn"
                            onclick="editSupplier(${index})">
                            Edit
                        </button>

                        <button
                            class="delete"
                            onclick="deleteSupplier(${index})">
                            Delete
                        </button>

                    </div>

                </td>

            </tr>
        `;
    });


    if (empty) {
        empty.style.display =
            filtered.length ? "none" : "block";
    }
}


function editSupplier(index) {
    const supplier = suppliers[index];

    if (!supplier) return;

    editingSupplierIndex = index;


    document.getElementById("supplierModalTitle").textContent =
        "Edit Supplier";

    document.getElementById("modalSupplierName").value =
        supplier.name;

    document.getElementById("modalSupplierPhone").value =
        supplier.phone || "";

    document.getElementById("modalSupplierEmail").value =
        supplier.email || "";

    document.getElementById("modalSupplierAddress").value =
        supplier.address || "";

    document.getElementById("modalSupplierNotes").value =
        supplier.notes || "";


    openModal("supplierModal");
}


function saveModalSupplier() {
    const name =
        document.getElementById("modalSupplierName")
            .value.trim();

    const phone =
        document.getElementById("modalSupplierPhone")
            .value.trim();

    const email =
        document.getElementById("modalSupplierEmail")
            .value.trim();

    const address =
        document.getElementById("modalSupplierAddress")
            .value.trim();

    const notes =
        document.getElementById("modalSupplierNotes")
            .value.trim();


    if (!name) {
        showToast("Enter supplier name");
        return;
    }


    if (editingSupplierIndex === null) {

        suppliers.push({
            id: uid("supplier"),
            name,
            phone,
            email,
            address,
            notes
        });

        showToast("Supplier added");

    } else {

        const supplier =
            suppliers[editingSupplierIndex];

        supplier.name = name;
        supplier.phone = phone;
        supplier.email = email;
        supplier.address = address;
        supplier.notes = notes;

        showToast("Supplier updated");
    }


    editingSupplierIndex = null;

    saveData();

    closeModal("supplierModal");

    renderEverything();
}


function deleteSupplier(index) {
    const supplier = suppliers[index];

    if (!supplier) return;


    const hasPurchases =
        purchases.some(
            p =>
                p.supplier.toLowerCase() ===
                supplier.name.toLowerCase()
        );


    if (hasPurchases) {
        showToast(
            "Cannot delete supplier with purchase history"
        );
        return;
    }


    confirmAction(
        `Delete supplier "${supplier.name}"?`,
        () => {

            suppliers.splice(index, 1);

            saveData();

            renderEverything();

            showToast("Supplier deleted");
        }
    );
}


function viewSupplierHistory(index) {
    const supplier = suppliers[index];

    if (!supplier) return;


    const history =
        purchases.filter(
            purchase =>
                purchase.supplier.toLowerCase() ===
                supplier.name.toLowerCase()
        );


    const content =
        document.getElementById("supplierHistoryContent");


    if (!content) return;


    if (!history.length) {

        content.innerHTML =
            `<div class="empty-state">
                No purchases found for this supplier.
            </div>`;

    } else {

        let total = 0;

        let html = `
            <div class="cards">
                <div class="card">
                    <p>Total Purchases</p>
                    <h2>${history.length}</h2>
                </div>

                <div class="card">
                    <p>Total Cost</p>
                    <h2 id="supplierHistoryTotal">₹0</h2>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Invoice</th>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
        `;


        history
            .slice()
            .sort((a, b) =>
                b.date.localeCompare(a.date)
            )
            .forEach(purchase => {

                total += number(purchase.totalCost);

                html += `
                    <tr>
                        <td>${formatDate(purchase.date)}</td>
                        <td>${escapeHTML(purchase.invoice || "-")}</td>
                        <td>${escapeHTML(purchase.product)}</td>
                        <td>${purchase.qty}</td>
                        <td>${money(purchase.totalCost)}</td>
                    </tr>
                `;
            });


        html += `
                    </tbody>
                </table>
            </div>
        `;


        content.innerHTML = html;


        const totalEl =
            document.getElementById("supplierHistoryTotal");

        if (totalEl) {
            totalEl.textContent = money(total);
        }
    }


    openModal("supplierHistoryModal");
}


/* =========================================================
   EXPENSES
========================================================= */

function saveExpense() {
    const name =
        document.getElementById("expenseName")
            .value.trim();

    const category =
        document.getElementById("expenseCategory").value;

    const amount =
        number(document.getElementById("expenseAmount").value);

    const date =
        document.getElementById("expenseDate").value ||
        todayString();

    const notes =
        document.getElementById("expenseNotes")
            .value.trim();


    if (!name) {
        showToast("Enter expense name");
        return;
    }

    if (!category) {
        showToast("Select expense category");
        return;
    }

    if (amount <= 0) {
        showToast("Enter a valid amount");
        return;
    }


    expenses.push({
        id: uid("expense"),
        name,
        category,
        amount,
        date,
        notes
    });


    saveData();

    clearExpenseForm();

    renderEverything();

    showToast("Expense saved");
}


function clearExpenseForm() {
    [
        "expenseName",
        "expenseAmount",
        "expenseNotes"
    ].forEach(id => {

        const el = document.getElementById(id);

        if (el) el.value = "";
    });


    const category =
        document.getElementById("expenseCategory");

    if (category) category.value = "";


    const date =
        document.getElementById("expenseDate");

    if (date) date.value = todayString();
}


function getExpenseTotal(from = "", to = "") {
    return expenses
        .filter(expense =>
            isDateInRange(
                expense.date,
                from,
                to
            )
        )
        .reduce(
            (sum, expense) =>
                sum + number(expense.amount),
            0
        );
}


function renderExpenses() {
    const table =
        document.getElementById("expenseTable");

    const empty =
        document.getElementById("expenseEmpty");

    if (!table) return;


    const search =
        document.getElementById("expenseSearch")?.value
            .trim()
            .toLowerCase() || "";

    const from =
        document.getElementById("expenseDateFrom")?.value || "";

    const to =
        document.getElementById("expenseDateTo")?.value || "";

    const category =
        document.getElementById("expenseCategoryFilter")?.value ||
        "";


    const filtered =
        expenses
            .filter(expense => {

                const text =
                    `${expense.name} ${expense.category} ${expense.notes || ""}`
                        .toLowerCase();


                return (
                    (!search || text.includes(search)) &&
                    (!category ||
                        expense.category === category) &&
                    isDateInRange(
                        expense.date,
                        from,
                        to
                    )
                );
            })
            .sort((a, b) =>
                b.date.localeCompare(a.date)
            );


    table.innerHTML = "";


    filtered.forEach(expense => {

        const index =
            expenses.findIndex(
                e => e.id === expense.id
            );


        table.innerHTML += `
            <tr>

                <td>${formatDate(expense.date)}</td>

                <td>${escapeHTML(expense.name)}</td>

                <td>${escapeHTML(expense.category)}</td>

                <td>${money(expense.amount)}</td>

                <td>${escapeHTML(expense.notes || "-")}</td>

                <td>

                    <button
                        class="delete"
                        onclick="deleteExpense(${index})">
                        Delete
                    </button>

                </td>

            </tr>
        `;
    });


    if (empty) {
        empty.style.display =
            filtered.length ? "none" : "block";
    }


    updateExpenseSummary();
}


function updateExpenseSummary() {
    const today = todayString();

    const todayTotal =
        getExpenseTotal(today, today);

    const week =
        getRangeDates("week");

    const weekTotal =
        getExpenseTotal(
            week.from,
            week.to
        );

    const month =
        getRangeDates("month");

    const monthTotal =
        getExpenseTotal(
            month.from,
            month.to
        );

    const total =
        getExpenseTotal();


    setText("todayExpenseTotal", money(todayTotal));
    setText("weekExpenseTotal", money(weekTotal));
    setText("monthExpenseTotal", money(monthTotal));
    setText("allExpenseTotal", money(total));
}


function deleteExpense(index) {
    const expense = expenses[index];

    if (!expense) return;


    confirmAction(
        `Delete expense "${expense.name}"?`,
        () => {

            expenses.splice(index, 1);

            saveData();

            renderEverything();

            showToast("Expense deleted");
        }
    );
}


/* =========================================================
   INVOICES
========================================================= */

function generateInvoiceNumber() {
    const year = new Date().getFullYear();

    const count =
        invoices.length + 1;

    return `INV-${year}-${String(count).padStart(4, "0")}`;
}


function createInvoiceFromSale(sale) {

    const invoice = {
        id: uid("invoice"),
        invoiceNumber: generateInvoiceNumber(),
        saleId: sale.id,
        date: sale.date,
        customer: sale.customer || "",
        items: [
            {
                name: sale.name,
                qty: sale.qty,
                price: sale.sellPrice,
                total:
                    sale.qty *
                    sale.sellPrice
            }
        ],
        subtotal: sale.subtotal || sale.amount,
        discount: sale.discount || 0,
        gstEnabled: sale.gstEnabled || false,
        gstRate: sale.gstRate || 0,
        gstType: sale.gstType || "none",
        cgst: sale.cgst || 0,
        sgst: sale.sgst || 0,
        igst: sale.igst || 0,
        gst: sale.gst || 0,
        grandTotal: sale.amount
    };


    invoices.push(invoice);

    return invoice;
}


function showInvoiceForSale(index) {
    const sale = sales[index];

    if (!sale) return;


    if (sale.invoiceId) {
        showInvoice(sale.invoiceId);
        return;
    }


    const invoice =
        createInvoiceFromSale(sale);

    sale.invoiceId = invoice.id;

    saveData();

    showInvoice(invoice.id);
}


function showInvoice(id) {
    const invoice =
        invoices.find(i => i.id === id);

    if (!invoice) return;


    currentInvoiceId = id;

    const content =
        document.getElementById("invoiceContent");

    if (!content) return;


    const settings = shopSettings || {};


    let itemRows = "";


    invoice.items.forEach((item, index) => {

        itemRows += `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHTML(item.name)}</td>
                <td>${item.qty}</td>
                <td>${money(item.price)}</td>
                <td>${money(item.total)}</td>
            </tr>
        `;
    });


    let gstHTML = "";


    if (invoice.gstEnabled) {

        if (invoice.gstType === "cgst_sgst") {

            gstHTML = `
                <div>
                    CGST (${(invoice.gstRate / 2).toFixed(2)}%):
                    <strong>${money(invoice.cgst)}</strong>
                </div>

                <div>
                    SGST (${(invoice.gstRate / 2).toFixed(2)}%):
                    <strong>${money(invoice.sgst)}</strong>
                </div>
            `;

        } else if (invoice.gstType === "igst") {

            gstHTML = `
                <div>
                    IGST (${invoice.gstRate}%):
                    <strong>${money(invoice.igst)}</strong>
                </div>
            `;
        }
    }


    content.innerHTML = `
        <div class="invoice-header">

            <div>
                <h1>${escapeHTML(
                    settings.name || "ShopTrackr Shop"
                )}</h1>

                <p>
                    ${escapeHTML(settings.phone || "")}
                </p>

                <p>
                    ${escapeHTML(settings.address || "")}
                </p>
            </div>

            <div>
                <h2>INVOICE</h2>

                <p>
                    Invoice:
                    <strong>
                        ${escapeHTML(invoice.invoiceNumber)}
                    </strong>
                </p>

                <p>
                    Date:
                    <strong>
                        ${formatDate(invoice.date)}
                    </strong>
                </p>
            </div>

        </div>

        <hr>

        <div class="invoice-customer">

            <strong>Customer:</strong>

            ${escapeHTML(
                invoice.customer || "Walk-in Customer"
            )}

        </div>

        <table>

            <thead>
                <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>

            <tbody>
                ${itemRows}
            </tbody>

        </table>

        <div class="invoice-summary">

            <div>
                Subtotal:
                <strong>${money(invoice.subtotal)}</strong>
            </div>

            <div>
                Discount:
                <strong>${money(invoice.discount)}</strong>
            </div>

            ${gstHTML}

            <div>
                Grand Total:
                <strong>${money(invoice.grandTotal)}</strong>
            </div>

        </div>

        <p style="margin-top:30px;font-size:12px;color:#64748b;">
            ShopTrackr invoice. GST settings are configurable
            and are not a substitute for official tax compliance.
        </p>
    `;


    openModal("invoiceModal");
}


function printInvoice() {
    if (!currentInvoiceId) return;

    window.print();
}


/*
   Browser-only PDF support:
   The print dialog allows "Save as PDF".
*/

function downloadInvoicePDF() {
    showToast(
        'Use "Save as PDF" in the browser print dialog'
    );

    setTimeout(() => {
        printInvoice();
    }, 400);
}


function renderInvoices() {
    const table =
        document.getElementById("invoiceTable");

    const empty =
        document.getElementById("invoiceEmpty");

    if (!table) return;


    const search =
        document.getElementById("invoiceSearch")?.value
            .trim()
            .toLowerCase() || "";

    const from =
        document.getElementById("invoiceDateFrom")?.value || "";

    const to =
        document.getElementById("invoiceDateTo")?.value || "";


    const filtered =
        invoices
            .filter(invoice => {

                const text =
                    `${invoice.invoiceNumber} ${invoice.customer || ""}`
                        .toLowerCase();


                return (
                    (!search || text.includes(search)) &&
                    isDateInRange(
                        invoice.date,
                        from,
                        to
                    )
                );
            })
            .sort((a, b) =>
                b.date.localeCompare(a.date)
            );


    table.innerHTML = "";


    filtered.forEach(invoice => {

        const index =
            invoices.findIndex(
                i => i.id === invoice.id
            );


        table.innerHTML += `
            <tr>

                <td>${escapeHTML(invoice.invoiceNumber)}</td>

                <td>${formatDate(invoice.date)}</td>

                <td>
                    ${escapeHTML(
                        invoice.customer ||
                        "Walk-in Customer"
                    )}
                </td>

                <td>${money(invoice.grandTotal)}</td>

                <td>
                    <button
                        class="secondary-btn"
                        onclick="showInvoice('${invoice.id}')">
                        View
                    </button>
                </td>

            </tr>
        `;
    });


    if (empty) {
        empty.style.display =
            filtered.length ? "none" : "block";
    }
}


/* =========================================================
   SHOP SETTINGS
========================================================= */

function saveShopSettings() {
    shopSettings = {
        name:
            document.getElementById("shopName").value.trim(),

        phone:
            document.getElementById("shopPhone").value.trim(),

        address:
            document.getElementById("shopAddress").value.trim(),

        gstEnabled:
            document.getElementById("invoiceGstEnabled").checked
    };


    saveData();

    showToast("Shop details saved");
}


function loadShopSettings() {
    const name =
        document.getElementById("shopName");

    const phone =
        document.getElementById("shopPhone");

    const address =
        document.getElementById("shopAddress");

    const gst =
        document.getElementById("invoiceGstEnabled");


    if (name) name.value = shopSettings.name || "";

    if (phone) phone.value = shopSettings.phone || "";

    if (address) address.value =
        shopSettings.address || "";

    if (gst) gst.checked =
        Boolean(shopSettings.gstEnabled);
}


/* =========================================================
   REPORTS
========================================================= */

function setReportRange(range, btn) {
    reportRange = range;

    document.querySelectorAll(".filter-btn")
        .forEach(button =>
            button.classList.remove("active")
        );

    if (btn) {
        btn.classList.add("active");
    }


    const custom =
        document.getElementById("customReportDates");


    if (custom) {
        custom.classList.toggle(
            "active",
            range === "custom"
        );
    }


    if (range !== "custom") {
        renderReports();
    }
}


function applyCustomReport() {
    customReportFrom =
        document.getElementById("reportDateFrom").value;

    customReportTo =
        document.getElementById("reportDateTo").value;


    if (!customReportFrom || !customReportTo) {
        showToast("Select both dates");
        return;
    }


    if (customReportFrom > customReportTo) {
        showToast("Invalid date range");
        return;
    }


    reportRange = "custom";

    renderReports();
}


function calculateReport() {
    const range =
        getRangeDates(reportRange);


    const filteredSales =
        sales.filter(s =>
            isDateInRange(
                s.date,
                range.from,
                range.to
            )
        );


    const filteredPurchases =
        purchases.filter(p =>
            isDateInRange(
                p.date,
                range.from,
                range.to
            )
        );


    const filteredExpenses =
        expenses.filter(e =>
            isDateInRange(
                e.date,
                range.from,
                range.to
            )
        );


    const revenue =
        filteredSales.reduce(
            (sum, sale) =>
                sum + number(
                    sale.taxableAmount ??
                    sale.subtotal ??
                    sale.amount
                ),
            0
        );


    const cogs =
        filteredSales.reduce(
            (sum, sale) => {

                if (sale.cogs !== undefined) {
                    return sum + number(sale.cogs);
                }

                return sum +
                    number(sale.qty) *
                    number(sale.costPrice);

            },
            0
        );


    const discount =
        filteredSales.reduce(
            (sum, sale) =>
                sum + number(sale.discount),
            0
        );


    const grossProfit =
        revenue - cogs;


    const expenseTotal =
        filteredExpenses.reduce(
            (sum, expense) =>
                sum + number(expense.amount),
            0
        );


    const netProfit =
        grossProfit - expenseTotal;


    const purchaseCost =
        filteredPurchases.reduce(
            (sum, purchase) =>
                sum + number(purchase.totalCost),
            0
        );


    return {
        sales: filteredSales,
        purchases: filteredPurchases,
        expenses: filteredExpenses,

        revenue,
        cogs,
        discount,
        grossProfit,
        expenseTotal,
        netProfit,
        purchaseCost
    };
}


function renderReports() {
    const result =
        calculateReport();


    setText(
        "reportRevenue",
        money(result.revenue)
    );

    setText(
        "reportCOGS",
        money(result.cogs)
    );

    setText(
        "reportGrossProfit",
        money(result.grossProfit)
    );

    setText(
        "reportExpenses",
        money(result.expenseTotal)
    );

    setText(
        "reportNetProfit",
        money(result.netProfit)
    );


    setText(
        "salesReportCount",
        result.sales.length
    );

    setText(
        "salesReportRevenue",
        money(result.revenue)
    );

    setText(
        "salesReportDiscount",
        money(result.discount)
    );

    setText(
        "salesReportProfit",
        money(result.grossProfit)
    );


    setText(
        "purchaseReportCount",
        result.purchases.length
    );

    setText(
        "purchaseReportCost",
        money(result.purchaseCost)
    );


    setText(
        "expenseReportTotal",
        money(result.expenseTotal)
    );


    setText(
        "inventoryReportProducts",
        products.length
    );


    const units =
        products.reduce(
            (sum, p) =>
                sum + number(p.qty),
            0
        );


    const stockValue =
        products.reduce(
            (sum, p) =>
                sum +
                number(p.qty) *
                number(p.cost),
            0
        );


    const lowStock =
        products.filter(
            p =>
                p.qty > 0 &&
                p.qty <=
                number(p.lowStockThreshold || 5)
        ).length;


    const outStock =
        products.filter(
            p => number(p.qty) <= 0
        ).length;


    setText(
        "inventoryReportUnits",
        units
    );

    setText(
        "inventoryReportValue",
        money(stockValue)
    );

    setText(
        "inventoryReportLowStock",
        lowStock
    );

    setText(
        "inventoryReportOutStock",
        outStock
    );


    drawProfitLossChart(result);

    drawReportExpenseChart(result);
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

    const today =
        todayString();


    const todaySales =
        sales.filter(
            sale => sale.date === today
        );


    const todayRevenue =
        todaySales.reduce(
            (sum, sale) =>
                sum + number(sale.amount),
            0
        );


    const todayProfit =
        todaySales.reduce(
            (sum, sale) =>
                sum + number(sale.profit),
            0
        );


    const todayExpenses =
        getExpenseTotal(today, today);


    const totalStock =
        products.reduce(
            (sum, product) =>
                sum + number(product.qty),
            0
        );


    const stockValue =
        products.reduce(
            (sum, product) =>
                sum +
                number(product.qty) *
                number(product.cost),
            0
        );


    const lowStock =
        products.filter(
            product =>
                product.qty > 0 &&
                product.qty <=
                number(
                    product.lowStockThreshold || 5
                )
        );


    const outOfStock =
        products.filter(
            product =>
                number(product.qty) <= 0
        );


    setText(
        "totalProducts",
        products.length
    );

    setText(
        "totalStock",
        totalStock
    );

    setText(
        "stockValue",
        money(stockValue)
    );

    setText(
        "todaySales",
        money(todayRevenue)
    );

    setText(
        "todayProfit",
        money(todayProfit)
    );

    setText(
        "todayExpenses",
        money(todayExpenses)
    );

    setText(
        "lowStockCount",
        lowStock.length
    );

    setText(
        "outOfStockCount",
        outOfStock.length
    );


    const totalRevenue =
        sales.reduce(
            (sum, sale) =>
                sum + number(sale.amount),
            0
        );


    const totalCOGS =
        sales.reduce(
            (sum, sale) =>
                sum +
                number(
                    sale.cogs ??
                    number(sale.qty) *
                    number(sale.costPrice)
                ),
            0
        );


    const grossProfit =
        totalRevenue - totalCOGS;


    const totalExpenses =
        getExpenseTotal();


    const netProfit =
        grossProfit - totalExpenses;


    const totalPurchases =
        purchases.reduce(
            (sum, purchase) =>
                sum + number(purchase.totalCost),
            0
        );


    setText(
        "dashboardTotalSales",
        money(totalRevenue)
    );

    setText(
        "dashboardTotalPurchases",
        money(totalPurchases)
    );

    setText(
        "dashboardTotalExpenses",
        money(totalExpenses)
    );

    setText(
        "dashboardGrossProfit",
        money(grossProfit)
    );

    setText(
        "dashboardNetProfit",
        money(netProfit)
    );


    renderDashboardLists(
        lowStock,
        todaySales
    );


    drawDashboardCharts();
}


function renderDashboardLists(
    lowStock,
    todaySales
) {
    const lowStockEl =
        document.getElementById("dashboardLowStock");

    const recentSalesEl =
        document.getElementById("recentSales");


    if (lowStockEl) {

        if (!lowStock.length) {

            lowStockEl.innerHTML =
                `<div class="empty-state">
                    No low-stock products.
                </div>`;

        } else {

            lowStockEl.innerHTML =
                lowStock
                    .slice()
                    .sort((a, b) =>
                        a.qty - b.qty
                    )
                    .slice(0, 8)
                    .map(product => `
                        <div class="dashboard-list-item">

                            <span>
                                ${escapeHTML(product.name)}
                            </span>

                            <strong>
                                ${product.qty}
                                ${escapeHTML(product.unit)}
                            </strong>

                        </div>
                    `)
                    .join("");
        }
    }


    if (recentSalesEl) {

        const recent =
            sales
                .slice()
                .sort((a, b) =>
                    (b.date || "").localeCompare(
                        a.date || ""
                    )
                )
                .slice(0, 8);


        if (!recent.length) {

            recentSalesEl.innerHTML =
                `<div class="empty-state">
                    No sales yet.
                </div>`;

        } else {

            recentSalesEl.innerHTML =
                recent
                    .map(sale => `
                        <div class="dashboard-list-item">

                            <span>
                                ${escapeHTML(sale.name)}
                                × ${sale.qty}
                            </span>

                            <strong>
                                ${money(sale.amount)}
                            </strong>

                        </div>
                    `)
                    .join("");
        }
    }
}


/* =========================================================
   CHART HELPERS
========================================================= */

function destroyChart(name) {
    if (charts[name]) {
        charts[name].destroy();
        charts[name] = null;
    }
}


function createChart(id, config, name) {
    const canvas =
        document.getElementById(id);

    if (!canvas || typeof Chart === "undefined") {
        return;
    }


    destroyChart(name);


    charts[name] =
        new Chart(
            canvas.getContext("2d"),
            config
        );
}


/* =========================================================
   DASHBOARD CHARTS
========================================================= */

function getLastDays(count = 7) {
    const result = [];

    const today = new Date();

    for (let i = count - 1; i >= 0; i--) {

        const d = new Date(today);

        d.setDate(
            d.getDate() - i
        );


        const date =
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;


        result.push(date);
    }

    return result;
}


function drawDashboardCharts() {
    const dates =
        getLastDays(7);


    const salesData =
        dates.map(date =>
            sales
                .filter(s => s.date === date)
                .reduce(
                    (sum, s) =>
                        sum + number(s.amount),
                    0
                )
        );


    const profitData =
        dates.map(date =>
            sales
                .filter(s => s.date === date)
                .reduce(
                    (sum, s) =>
                        sum + number(s.profit),
                    0
                )
        );


    const labels =
        dates.map(date => {

            const d =
                new Date(date + "T00:00:00");

            return d.toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short"
                }
            );
        });


    createChart(
        "salesTimeChart",
        {
            type: "line",

            data: {
                labels,

                datasets: [{
                    label: "Sales",

                    data: salesData,

                    borderColor: "#6366f1",

                    backgroundColor:
                        "rgba(99,102,241,.15)",

                    fill: true,

                    tension: 0.35,

                    borderWidth: 3
                }]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        },
        "salesTime"
    );


    createChart(
        "profitTimeChart",
        {
            type: "line",

            data: {
                labels,

                datasets: [{
                    label: "Profit",

                    data: profitData,

                    borderColor: "#22c55e",

                    backgroundColor:
                        "rgba(34,197,94,.12)",

                    fill: true,

                    tension: 0.35,

                    borderWidth: 3
                }]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        },
        "profitTime"
    );


    const categories = [
        "Electricity",
        "Rent",
        "Transport",
        "Salary",
        "Maintenance",
        "Other"
    ];


    const expenseValues =
        categories.map(category =>
            expenses
                .filter(
                    e =>
                        e.category === category
                )
                .reduce(
                    (sum, e) =>
                        sum + number(e.amount),
                    0
                )
        );


    createChart(
        "expenseCategoryChart",
        {
            type: "doughnut",

            data: {
                labels: categories,

                datasets: [{
                    data: expenseValues
                }]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false
            }
        },
        "expenseCategory"
    );


    const topProducts = {};


    sales.forEach(sale => {

        if (!topProducts[sale.name]) {
            topProducts[sale.name] = 0;
        }

        topProducts[sale.name] +=
            number(sale.qty);
    });


    const top =
        Object.entries(topProducts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7);


    createChart(
        "topProductsChart",
        {
            type: "bar",

            data: {
                labels:
                    top.map(item => item[0]),

                datasets: [{
                    label: "Units Sold",

                    data:
                        top.map(item => item[1])
                }]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        },
        "topProducts"
    );
}


/* =========================================================
   REPORT CHARTS
========================================================= */

function drawProfitLossChart(result) {

    createChart(
        "profitLossChart",
        {
            type: "bar",

            data: {
                labels: [
                    "Revenue",
                    "COGS",
                    "Gross Profit",
                    "Expenses",
                    "Net Profit"
                ],

                datasets: [{
                    label: "Amount",

                    data: [
                        result.revenue,
                        result.cogs,
                        result.grossProfit,
                        result.expenseTotal,
                        result.netProfit
                    ]
                }]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        },
        "profitLoss"
    );
}


function drawReportExpenseChart(result) {

    const categories = [
        "Electricity",
        "Rent",
        "Transport",
        "Salary",
        "Maintenance",
        "Other"
    ];


    const values =
        categories.map(category =>
            result.expenses
                .filter(
                    expense =>
                        expense.category === category
                )
                .reduce(
                    (sum, expense) =>
                        sum + number(expense.amount),
                    0
                )
        );


    createChart(
        "reportExpenseChart",
        {
            type: "doughnut",

            data: {
                labels: categories,

                datasets: [{
                    data: values
                }]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false
            }
        },
        "reportExpense"
    );
}


/* =========================================================
   BACKUP / IMPORT
========================================================= */

function exportBackup() {

    const backup = {
        version: 2,

        app: "ShopTrackr",

        exportedAt:
            new Date().toISOString(),

        products,
        sales,
        purchases,
        suppliers,
        expenses,
        stockMovements,
        invoices,
        shopSettings
    };


    downloadFile(
        JSON.stringify(
            backup,
            null,
            2
        ),
        `shoptrackr-backup-${todayString()}.json`,
        "application/json"
    );


    showToast("Backup exported");
}


async function importBackup() {
    const fileInput =
        document.getElementById("backupFile");

    const file =
        fileInput?.files?.[0];


    if (!file) {
        showToast("Select a JSON backup file");
        return;
    }


    try {

        const text =
            await file.text();

        const backup =
            JSON.parse(text);


        if (
            !backup ||
            typeof backup !== "object"
        ) {
            throw new Error("Invalid backup");
        }


        const validArrays = [
            "products",
            "sales",
            "purchases",
            "suppliers",
            "expenses",
            "stockMovements",
            "invoices"
        ];


        const hasData =
            validArrays.some(
                key =>
                    Array.isArray(
                        backup[key]
                    )
            );


        if (!hasData) {
            throw new Error(
                "This does not appear to be a ShopTrackr backup"
            );
        }


        confirmAction(
            "Importing this backup will replace your current ShopTrackr data. Continue?",
            () => {

                products =
                    Array.isArray(backup.products)
                        ? backup.products
                        : [];

                sales =
                    Array.isArray(backup.sales)
                        ? backup.sales
                        : [];

                purchases =
                    Array.isArray(backup.purchases)
                        ? backup.purchases
                        : [];

                suppliers =
                    Array.isArray(backup.suppliers)
                        ? backup.suppliers
                        : [];

                expenses =
                    Array.isArray(backup.expenses)
                        ? backup.expenses
                        : [];

                stockMovements =
                    Array.isArray(
                        backup.stockMovements
                    )
                        ? backup.stockMovements
                        : [];

                invoices =
                    Array.isArray(backup.invoices)
                        ? backup.invoices
                        : [];

                shopSettings =
                    backup.shopSettings || {};


                normalizeProducts();

                saveData();

                loadShopSettings();

                renderEverything();

                showToast(
                    "Backup imported successfully"
                );
            }
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Invalid or corrupted backup file"
        );
    }
}


function downloadFile(
    content,
    filename,
    type
) {
    const blob =
        new Blob(
            [content],
            { type }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}


/* =========================================================
   CSV EXPORT
========================================================= */

function csvEscape(value) {
    const text =
        String(value ?? "");

    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n")
    ) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
}


function exportCSV(
    headers,
    rows,
    filename
) {
    const csv = [
        headers.map(csvEscape).join(","),

        ...rows.map(
            row =>
                row
                    .map(csvEscape)
                    .join(",")
        )
    ].join("\n");


    downloadFile(
        csv,
        filename,
        "text/csv;charset=utf-8;"
    );


    showToast("CSV exported");
}


function exportInventoryCSV() {

    exportCSV(
        [
            "Name",
            "Category",
            "Unit",
            "Cost Price",
            "Selling Price",
            "Profit Per Unit",
            "Margin %",
            "Stock",
            "Stock Value",
            "Low Stock Threshold"
        ],

        products.map(p => [
            p.name,
            p.category,
            p.unit,
            p.cost,
            p.sell,
            getProductProfitPerUnit(p),
            getProductMargin(p).toFixed(2),
            p.qty,
            p.qty * p.cost,
            p.lowStockThreshold
        ]),

        "shoptrackr-inventory.csv"
    );
}


function exportSalesCSV() {

    exportCSV(
        [
            "Date",
            "Product",
            "Customer",
            "Quantity",
            "Amount",
            "Discount",
            "GST",
            "COGS",
            "Profit"
        ],

        sales.map(s => [
            s.date,
            s.name,
            s.customer,
            s.qty,
            s.amount,
            s.discount,
            s.gst,
            s.cogs,
            s.profit
        ]),

        "shoptrackr-sales.csv"
    );
}


function exportPurchasesCSV() {

    exportCSV(
        [
            "Date",
            "Invoice",
            "Supplier",
            "Product",
            "Quantity",
            "Purchase Price",
            "Total Cost"
        ],

        purchases.map(p => [
            p.date,
            p.invoice,
            p.supplier,
            p.product,
            p.qty,
            p.price,
            p.totalCost
        ]),

        "shoptrackr-purchases.csv"
    );
}


function exportExpensesCSV() {

    exportCSV(
        [
            "Date",
            "Expense",
            "Category",
            "Amount",
            "Notes"
        ],

        expenses.map(e => [
            e.date,
            e.name,
            e.category,
            e.amount,
            e.notes
        ]),

        "shoptrackr-expenses.csv"
    );
}


function exportSuppliersCSV() {

    exportCSV(
        [
            "Supplier",
            "Phone",
            "Email",
            "Address",
            "Notes"
        ],

        suppliers.map(s => [
            s.name,
            s.phone,
            s.email,
            s.address,
            s.notes
        ]),

        "shoptrackr-suppliers.csv"
    );
}


/* =========================================================
   UTILITY
========================================================= */

function setText(id, value) {
    const el =
        document.getElementById(id);

    if (el) {
        el.textContent = value;
    }
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {

    const ids = [
        "inventorySearch",
        "inventoryCategoryFilter",
        "inventorySort",

        "salesSearch",
        "salesDateFrom",
        "salesDateTo",
        "salesSort",

        "purchaseSearch",
        "purchaseDateFrom",
        "purchaseDateTo",
        "purchaseSupplierFilter",
        "purchaseProductFilter",
        "purchaseSort",

        "supplierSearch",

        "expenseSearch",
        "expenseDateFrom",
        "expenseDateTo",
        "expenseCategoryFilter",

        "invoiceSearch",
        "invoiceDateFrom",
        "invoiceDateTo"
    ];


    ids.forEach(id => {

        const el =
            document.getElementById(id);

        if (!el) return;

        el.addEventListener(
            "input",
            renderEverything
        );

        el.addEventListener(
            "change",
            renderEverything
        );
    });


    [
        "saleProduct",
        "saleQty",
        "discountType",
        "discountValue",
        "saleGstEnabled",
        "saleGstRate",
        "saleGstType"
    ].forEach(id => {

        const el =
            document.getElementById(id);

        if (!el) return;

        el.addEventListener(
            "input",
            updateSalePreview
        );

        el.addEventListener(
            "change",
            updateSalePreview
        );
    });


    [
        "purchaseQty",
        "purchasePrice"
    ].forEach(id => {

        const el =
            document.getElementById(id);

        if (!el) return;

        el.addEventListener(
            "input",
            updatePurchaseTotal
        );
    });


    /*
       Close modal when clicking outside.
    */

    document.querySelectorAll(".modal")
        .forEach(modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target === modal
                    ) {
                        modal.classList.remove(
                            "active"
                        );
                    }
                }
            );
        });


    /*
       Escape key closes modals.
    */

    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Escape") {
                return;
            }

            document.querySelectorAll(".modal.active")
                .forEach(modal =>
                    modal.classList.remove(
                        "active"
                    )
                );
        }
    );
}


/* =========================================================
   LEGACY DATA MIGRATION
========================================================= */

function migrateLegacyData() {

    let changed = false;


    /*
       Old products did not have IDs.
    */

    products.forEach(product => {

        if (!product.id) {
            product.id = uid("product");
            changed = true;
        }

        if (!product.category) {
            product.category = "";
            changed = true;
        }

        if (!product.unit) {
            product.unit = "pcs";
            changed = true;
        }

        if (product.lowStockThreshold === undefined) {
            product.lowStockThreshold = 5;
            changed = true;
        }

        product.cost = number(product.cost);
        product.sell = number(product.sell);
        product.qty = number(product.qty);
    });


    /*
       Old sales records did not contain dates,
       product IDs or COGS.
    */

    sales.forEach(sale => {

        if (!sale.id) {
            sale.id = uid("sale");
            changed = true;
        }

        if (!sale.date) {
            sale.date = todayString();
            changed = true;
        }

        if (sale.qty === undefined) {
            sale.qty = 0;
            changed = true;
        }

        sale.qty = number(sale.qty);

        sale.amount = number(sale.amount);

        sale.profit =
            number(
                sale.profit
            );


        if (sale.discount === undefined) {
            sale.discount = 0;
            changed = true;
        }


        if (sale.subtotal === undefined) {
            sale.subtotal =
                sale.amount +
                number(sale.discount);

            changed = true;
        }


        /*
           Match legacy sale with product name.
        */

        if (!sale.productId) {

            const product =
                products.find(
                    p =>
                        p.name.toLowerCase() ===
                        String(
                            sale.name || ""
                        ).toLowerCase()
                );


            if (product) {
                sale.productId = product.id;
                sale.costPrice = product.cost;
                sale.cogs =
                    sale.qty * product.cost;

                changed = true;
            }
        }


        if (sale.costPrice === undefined) {

            const product =
                getProductById(
                    sale.productId
                );

            sale.costPrice =
                product?.cost || 0;

            changed = true;
        }


        if (sale.cogs === undefined) {

            sale.cogs =
                sale.qty *
                number(sale.costPrice);

            changed = true;
        }


        if (sale.customer === undefined) {
            sale.customer = "";
            changed = true;
        }
    });


    /*
       Normalize purchases.
    */

    purchases.forEach(purchase => {

        if (!purchase.id) {
            purchase.id = uid("purchase");
            changed = true;
        }

        if (!purchase.qty) {
            purchase.qty =
                number(
                    purchase.quantity
                );

            changed = true;
        }

        if (purchase.price === undefined) {

            purchase.price =
                number(
                    purchase.purchasePrice
                );

            changed = true;
        }

        if (purchase.totalCost === undefined) {

            purchase.totalCost =
                number(purchase.qty) *
                number(purchase.price);

            changed = true;
        }

        if (!purchase.date) {
            purchase.date = todayString();
            changed = true;
        }
    });


    /*
       Normalize expenses.
    */

    expenses.forEach(expense => {

        if (!expense.id) {
            expense.id = uid("expense");
            changed = true;
        }

        if (!expense.date) {
            expense.date = todayString();
            changed = true;
        }
    });


    /*
       Normalize suppliers.
    */

    suppliers.forEach(supplier => {

        if (!supplier.id) {
            supplier.id = uid("supplier");
            changed = true;
        }
    });


    if (changed) {
        saveData();
    }
}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderEverything() {
    renderProducts();
    renderSales();
    renderPurchases();
    renderSuppliers();
    renderExpenses();
    renderInvoices();
    renderDashboard();
    renderReports();

    updateDropdown();
    updatePurchaseProductDropdown();
    updatePurchaseTotal();
    updateSalePreview();
}


/* =========================================================
   INITIALIZATION
========================================================= */

function initialize() {

    migrateLegacyData();

    normalizeProducts();

    /*
       Set default dates.
    */

    const purchaseDate =
        document.getElementById("purchaseDate");

    if (
        purchaseDate &&
        !purchaseDate.value
    ) {
        purchaseDate.value =
            todayString();
    }


    const expenseDate =
        document.getElementById("expenseDate");

    if (
        expenseDate &&
        !expenseDate.value
    ) {
        expenseDate.value =
            todayString();
    }


    /*
       Load shop details.
    */

    loadShopSettings();


    /*
       Setup listeners.
    */

    setupEventListeners();


    /*
       Initial UI.
    */

    updatePriceUnits();

    renderEverything();

    updateSalePreview();

    updatePurchaseTotal();


    console.log(
        "ShopTrackr initialized successfully."
    );
}


document.addEventListener(
    "DOMContentLoaded",
    initialize
);