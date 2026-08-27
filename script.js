let products = JSON.parse(localStorage.getItem("products")) || [];
let sales = JSON.parse(localStorage.getItem("sales")) || [];

let chart;

/* NAVIGATION */
function showPage(page,btn){

document.querySelectorAll(".page")
.forEach(p=>p.classList.remove("active"));

document.getElementById(page)
.classList.add("active");

document.querySelectorAll(".nav-btn")
.forEach(b=>b.classList.remove("active-nav"));

btn.classList.add("active-nav");


}

/* SAVE */
function saveData(){
localStorage.setItem("products",JSON.stringify(products));
localStorage.setItem("sales",JSON.stringify(sales));
}

/* ADD PRODUCT */
function addProduct(){

let name=document.getElementById("name").value;
let cost=Number(document.getElementById("cost").value);
let sell=Number(document.getElementById("sell").value);
let qty=Number(document.getElementById("qty").value);
let unit=document.getElementById("unit").value;

if(!name||!cost||!sell||!qty){
alert("Fill all fields");
return;
}

products.push({
    name,
    cost,
    sell,
    qty,
    unit
});

saveData();
clearInputs();
renderProducts();
renderReports();
updateDashboard();
}

/* CLEAR */
function clearInputs(){
document.getElementById("name").value="";
document.getElementById("cost").value="";
document.getElementById("sell").value="";
document.getElementById("qty").value="";
}

/* DELETE */
function deleteProduct(i){
products.splice(i,1);
saveData();
renderProducts();
renderReports();
}

function addStock(index){

let qty = prompt("Enter quantity to add:");

if(qty === null) return;

qty = Number(qty);

if(qty <= 0){
alert("Invalid quantity");
return;
}

products[index].qty += qty;

saveData();
renderProducts();
renderReports();
updateDashboard();
}

/* QUICK SELL BUTTON */
function quickSell(index){

let qty=prompt("Enter quantity sold:");

if(qty===null) return;

qty=Number(qty);

if(qty<=0){
alert("Invalid quantity");
return;
}

let p=products[index];

if(qty>p.qty){
alert("Not enough stock");
return;
}

p.qty-=qty;

let amount=qty*p.sell;
let profit=qty*(p.sell-p.cost);

sales.push({
name:p.name,
qty,
amount,
profit
});

saveData();
renderProducts();
renderSales();
renderReports();
updateDashboard();
}

/* PRODUCTS */
function renderProducts(){

sortProductsAlphabetically();

let table=document.getElementById("productTable");
table.innerHTML="";

let stock=0;
let value=0;

products.forEach((p,i)=>{

stock+=p.qty;
value+=p.qty*p.cost;

table.innerHTML+=`
<tr>
<td>${p.name}</td>
<td>₹${p.cost} / ${p.unit || "pcs"}</td>
<td>₹${p.sell} / ${p.unit || "pcs"}</td>
<td>${p.qty} ${p.unit || "pcs"}</td>

<td>
<div class="action-buttons">

<button class="stock-btn"
onclick="addStock(${i})">
+ Stock
</button>

<button class="sell"
onclick="quickSell(${i})">
Sell
</button>

<button class="delete"
onclick="deleteProduct(${i})">
Remove
</button>

</div>
</td>
</tr>
`;

});

document.getElementById("totalProducts").innerText=products.length;
document.getElementById("totalStock").innerText=stock;
document.getElementById("stockValue").innerText=formatMoney(value);

updateDropdown();
}

/* DROPDOWN */
function updateDropdown(){

sortProductsAlphabetically();

let sel=document.getElementById("saleProduct");

sel.innerHTML="";

products.forEach((p,i)=>{

sel.innerHTML+=`
<option value="${i}">
${p.name} (Stock:${p.qty})
</option>
`;

});
}

/* Arrange in Alphabetical Order */

function sortProductsAlphabetically(){

    products.sort((a,b) =>
        a.name.localeCompare(b.name, undefined, {
            sensitivity: "base"
        })
    );

}

//Fortmat Money
function formatMoney(value) {

    return "₹" + Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

}

/* RECORD SALE */
function recordSale(){

    let i = document.getElementById("saleProduct").value;

    let qty = Number(
        document.getElementById("saleQty").value
    );

    let discount = Number(
        document.getElementById("saleDiscount").value
    ) || 0;

    let discountType =
        document.getElementById("discountType").value;

    let p = products[i];

    if(!p || qty <= 0){
        alert("Invalid quantity");
        return;
    }

    if(qty > p.qty){
        alert("Not enough stock");
        return;
    }

    if(discount < 0){
        alert("Invalid discount");
        return;
    }


    /* ORIGINAL PRICE */

    let subtotal = qty * p.sell;


    /* CALCULATE DISCOUNT */

    let discountAmount = 0;

    if(discountType === "percent"){

        if(discount > 100){
            alert("Discount cannot be more than 100%");
            return;
        }

        discountAmount =
            subtotal * discount / 100;

    }

    else if(discountType === "fixed"){

        if(discount > subtotal){
            alert("Discount cannot be greater than sale amount");
            return;
        }

        discountAmount = discount;

    }


    /* FINAL SALE AMOUNT */

    let amount = subtotal - discountAmount;


    /* PROFIT AFTER DISCOUNT */

    let profit =
        amount - (qty * p.cost);


    /* REMOVE STOCK */

    p.qty -= qty;


    /* SAVE SALE */

    // Check if this product was already sold
let existingSale = sales.find(
    s => s.name.toLowerCase() === p.name.toLowerCase()
);

if(existingSale){

    // Merge quantity
    existingSale.qty += qty;

    // Merge amount
    existingSale.amount += amount;

    // Merge profit
    existingSale.profit += profit;

    // Merge discount
    existingSale.discountAmount =
        (existingSale.discountAmount || 0) +
        discountAmount;

    // Keep latest sale date
    existingSale.date = new Date().toISOString();

} else {

    // Create new sale
    sales.push({
        name: p.name,
        qty: qty,
        unit: p.unit || "pcs",
        amount: amount,
        profit: profit,
        discount: discount,
        discountType: discountType,
        discountAmount: discountAmount,
        date: new Date().toISOString()
    });

}


    saveData();


    /* CLEAR FORM */

    document.getElementById("saleQty").value = "";

    document.getElementById("saleDiscount").value = "";


    renderProducts();

    renderSales();

    renderReports();
    updateDashboard();

}

/* SALES TABLE */
function renderSales(){

    let table =
        document.getElementById("salesTable");

    table.innerHTML = "";

    sales.forEach((s,index)=>{

        let discountText = "No discount";

        if(s.discountType === "fixed"){

            discountText =
                formatMoney(s.discountAmount || 0);

        }

        else if(s.discountType === "percent"){

            discountText =
                (s.discount || 0) +
                "% (₹" +
                (s.discountAmount || 0).toFixed(2) +
                ")";

        }


        table.innerHTML += `

        <tr>

            <td>${s.name}</td>

            <td>${formatMoney(s.amount)}</td>

            <td>${discountText}</td>

            <td>${formatMoney(s.profit)}</td>

            <td>
                ${s.qty} ${s.unit || "pcs"}
            </td>

            <td>

                <button
                    class="delete"
                    onclick="deleteSale(${index})">

                    Remove

                </button>

            </td>

        </tr>

        `;

    });

}

/* =========================================
   DASHBOARD
========================================= */

function updateDashboard(){

    updateTodayStats();

    renderLowStock();

    renderBestSelling();

    renderRecentSales();

}


/* =========================================
   TODAY'S REVENUE & PROFIT
========================================= */

function updateTodayStats(){

    let todayRevenue = 0;

    let todayProfit = 0;

    let today = new Date().toDateString();


    sales.forEach(s => {

        /*
        Old sales don't have a date.
        New sales will have one.
        */

        if(!s.date) return;

        let saleDate =
            new Date(s.date).toDateString();

        if(saleDate === today){

            todayRevenue += Number(s.amount) || 0;

            todayProfit += Number(s.profit) || 0;

        }

    });


    document.getElementById("todayRevenue").innerText =
        formatMoney(todayRevenue);

    document.getElementById("todayProfit").innerText =
        formatMoney(todayProfit);

}


/* =========================================
   LOW STOCK
========================================= */

function renderLowStock(){

    let container =
        document.getElementById("lowStockList");

    container.innerHTML = "";


    /*
    Products with 5 or less stock
    */

    let lowStock =
        products.filter(p => p.qty <= 5);


    if(lowStock.length === 0){

        container.innerHTML = `
            <div class="dashboard-empty">
                ✓ All products have enough stock
            </div>
        `;

        return;

    }


    lowStock.slice(0, 5).forEach((p, index) => {

        container.innerHTML += `

        <div class="dashboard-list-item">

            <div class="item-left">

                <div class="item-number">
                    ${index + 1}
                </div>

                <div class="item-name">
                    ${p.name}
                </div>

            </div>

            <div class="item-value low-stock-value">
                ${p.qty} ${p.unit || "pcs"}
            </div>

        </div>

        `;

    });

}


/* =========================================
   BEST SELLING
========================================= */

function renderBestSelling(){

    let container =
        document.getElementById("bestSellingList");

    container.innerHTML = "";


    if(sales.length === 0){

        container.innerHTML = `
            <div class="dashboard-empty">
                No sales recorded yet
            </div>
        `;

        return;

    }


    let productSales = {};


    sales.forEach(s => {

        if(!productSales[s.name]){

            productSales[s.name] = {
                qty: 0,
                unit: s.unit || "pcs"
            };

        }

        productSales[s.name].qty +=
            Number(s.qty) || 0;

    });


    let bestSelling =
        Object.entries(productSales)
        .sort((a,b) =>
            b[1].qty - a[1].qty
        )
        .slice(0, 5);


    bestSelling.forEach((item, index) => {

        let name = item[0];

        let data = item[1];


        container.innerHTML += `

        <div class="dashboard-list-item">

            <div class="item-left">

                <div class="item-number">
                    ${index + 1}
                </div>

                <div class="item-name">
                    ${name}
                </div>

            </div>

            <div class="item-value best-selling-value">
                ${data.qty} ${data.unit}
            </div>

        </div>

        `;

    });

}


/* =========================================
   RECENT SALES
========================================= */

function renderRecentSales(){

    let container =
        document.getElementById("recentSalesList");

    container.innerHTML = "";


    if(sales.length === 0){

        container.innerHTML = `
            <div class="dashboard-empty">
                No sales recorded yet
            </div>
        `;

        return;

    }


    let recentSales =
        [...sales].reverse().slice(0, 5);


    recentSales.forEach(s => {

        container.innerHTML += `

        <div class="recent-sale">

            <div>

                <div class="recent-sale-name">
                    ${s.name}
                </div>

                <div class="recent-sale-qty">
                    ${s.qty} ${s.unit || "pcs"}
                </div>

            </div>

            <div class="recent-sale-amount">
                ₹${Number(s.amount).toFixed(2)}
            </div>

        </div>

        `;

    });

}


/* =========================================
   DASHBOARD NAVIGATION
========================================= */

function openInventory(){

    let button =
        document.querySelectorAll(".nav-btn")[1];

    showPage("inventory", button);

}


function openSales(){

    let button =
        document.querySelectorAll(".nav-btn")[2];

    showPage("sales", button);

}

// Delete the sale list //
function deleteSale(index){

if(!confirm("Remove this sale record?")) return;

sales.splice(index,1);

saveData();
renderSales();
renderReports();

}



/* REPORTS */
function renderReports(){

let revenue=0;
let profit=0;

sales.forEach(s=>{
revenue+=s.amount;
profit+=s.profit;
});

let stockValue=0;

products.forEach(p=>{
stockValue+=p.qty*p.cost;
});

document.getElementById("revenue").innerText=formatMoney(revenue);
document.getElementById("profit").innerText=formatMoney(profit);
document.getElementById("salesCount").innerText=sales.length;
document.getElementById("totalSales").innerText=sales.length;

drawChart();
}

function drawChart(){

    const canvas = document.getElementById("reportChart");

    if(!canvas) return;

    const ctx = canvas.getContext("2d");

    if(chart){
        chart.destroy();
    }


    /* ==============================
       CREATE LAST 7 DAYS
    ============================== */

    let labels = [];

    let revenueData = [];

    let profitData = [];


    for(let i = 6; i >= 0; i--){

        let date = new Date();

        date.setDate(date.getDate() - i);

        let dateKey =
            date.toISOString().split("T")[0];


        let dayName =
            date.toLocaleDateString("en-IN", {
                weekday: "short"
            });


        labels.push(dayName);


        let dayRevenue = 0;

        let dayProfit = 0;


        /* Find sales for this day */

        sales.forEach(s => {

            if(!s.date) return;


            let saleDate =
                new Date(s.date)
                .toISOString()
                .split("T")[0];


            if(saleDate === dateKey){

                dayRevenue +=
                    Number(s.amount) || 0;

                dayProfit +=
                    Number(s.profit) || 0;

            }

        });


        revenueData.push(dayRevenue);

        profitData.push(dayProfit);

    }


    /* ==============================
       CREATE CHART
    ============================== */

    chart = new Chart(ctx, {

        type: "line",

        data: {

            labels: labels,

            datasets: [

                {

                    label: "Revenue",

                    data: revenueData,

                    borderColor: "#6366f1",

                    backgroundColor:
                        "rgba(99,102,241,0.12)",

                    pointBackgroundColor:
                        "#6366f1",

                    pointBorderColor:
                        "#ffffff",

                    pointBorderWidth: 2,

                    pointRadius: 6,

                    pointHoverRadius: 9,

                    pointHitRadius: 20,

                    borderWidth: 3,

                    fill: true,

                    tension: 0.4

                },


                {

                    label: "Profit",

                    data: profitData,

                    borderColor: "#22c55e",

                    backgroundColor:
                        "rgba(34,197,94,0.10)",

                    pointBackgroundColor:
                        "#22c55e",

                    pointBorderColor:
                        "#ffffff",

                    pointBorderWidth: 2,

                    pointRadius: 6,

                    pointHoverRadius: 9,

                    pointHitRadius: 20,

                    borderWidth: 3,

                    fill: true,

                    tension: 0.4

                }

            ]

        },


        options: {

            responsive: true,

            maintainAspectRatio: false,


            interaction: {

                mode: "index",

                intersect: false

            },


            plugins: {

                legend: {

                    display: true,

                    position: "top"

                },


                tooltip: {

                    enabled: true,

                    backgroundColor: "#111827",

                    titleColor: "#ffffff",

                    bodyColor: "#e2e8f0",

                    borderColor: "#334155",

                    borderWidth: 1,

                    padding: 12,

                    displayColors: true,


                    callbacks: {

                        label: function(context){

                            let value =
                                Number(context.parsed.y) || 0;


                            return " " +
                                context.dataset.label +
                                ": ₹" +
                                value.toLocaleString(
                                    "en-IN",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                );

                        }

                    }

                }

            },


            scales: {

                y: {

                    beginAtZero: true,


                    ticks: {

                        callback: function(value){

                            return "₹" +
                                Number(value)
                                .toLocaleString("en-IN");

                        }

                    }

                },


                x: {

                    ticks: {

                        color: "#94a3b8"

                    }

                }

            }

        }

    });

}

function updatePriceUnits(){

    let unit = document.getElementById("unit").value;

    let unitText = "/" + unit;

    document.getElementById("costUnit").innerText =
        unitText;

    document.getElementById("sellUnit").innerText =
        unitText;
}

/* INIT */
renderProducts();
renderSales();
renderReports();
updateDashboard();