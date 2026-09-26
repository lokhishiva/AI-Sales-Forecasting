/* =========================================
   SALESCAST AI
   AI SALES FORECASTING ENGINE
========================================= */


/* =========================================
   DATE
========================================= */

document.getElementById("liveDate").textContent =
    new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });



/* =========================================
   DATA
========================================= */

const BASE_DATA = {

    all: [
        142, 158, 171, 163, 185, 210,
        198, 224, 238, 215, 252, 271,
        260, 285, 305, 298, 320, 341
    ],

    software: [
        62, 70, 77, 73, 85, 98,
        91, 104, 110, 98, 118, 127,
        120, 134, 145, 141, 152, 163
    ],

    hardware: [
        48, 52, 57, 54, 60, 68,
        64, 72, 78, 70, 82, 88,
        84, 92, 100, 97, 104, 110
    ],

    services: [
        32, 36, 37, 36, 40, 44,
        43, 48, 50, 47, 52, 56,
        56, 59, 60, 60, 64, 68
    ]

};


const MONTHS = [

    "Jul", "Aug", "Sep",
    "Oct", "Nov", "Dec",

    "Jan", "Feb", "Mar",
    "Apr", "May", "Jun",

    "Jul", "Aug", "Sep",
    "Oct", "Nov", "Dec"

];


const FORECAST_START = 12;


const SEASONAL = [

    1.03,
    0.96,
    0.99,
    1.04,
    1.08,
    1.12,
    1.02,
    0.98,
    0.97,
    1.01,
    1.05,
    1.10

];



/* =========================================
   LINEAR REGRESSION
========================================= */

function linearRegression(data) {

    const n = data.length;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;


    data.forEach((y, x) => {

        sumX += x;

        sumY += y;

        sumXY += x * y;

        sumX2 += x * x;

    });


    const slope =
        (
            n * sumXY -
            sumX * sumY
        ) /
        (
            n * sumX2 -
            sumX * sumX
        );


    const intercept =
        (
            sumY -
            slope * sumX
        ) / n;


    return {
        slope,
        intercept
    };

}



/* =========================================
   FORECAST
========================================= */

function buildForecast(category) {

    const data =
        BASE_DATA[category];


    const actual =
        data.slice(0, FORECAST_START);


    const {
        slope,
        intercept
    } =
        linearRegression(actual);


    const forecast = [];

    const lower = [];

    const upper = [];


    for (
        let i = 0;
        i < 18;
        i++
    ) {

        const prediction =
            Math.round(
                (
                    slope * i +
                    intercept
                ) *
                SEASONAL[i % 12]
            );


        forecast.push(
            i >= FORECAST_START
                ? prediction
                : null
        );


        lower.push(
            i >= FORECAST_START
                ? Math.round(
                    prediction * 0.93
                )
                : null
        );


        upper.push(
            i >= FORECAST_START
                ? Math.round(
                    prediction * 1.07
                )
                : null
        );

    }


    return {

        data,

        actual:
            data.map(
                (value, index) =>
                    index < FORECAST_START
                        ? value
                        : null
            ),

        forecast,

        lower,

        upper

    };

}



/* =========================================
   PRODUCTS
========================================= */

const PRODUCTS = [

    {
        name: "CloudSuite Pro",
        cat: "software",
        cur: 52,
        fore: 61,
        conf: "High"
    },

    {
        name: "DataBridge",
        cat: "software",
        cur: 38,
        fore: 41,
        conf: "High"
    },

    {
        name: "ServerX 4000",
        cat: "hardware",
        cur: 44,
        fore: 46,
        conf: "Medium"
    },

    {
        name: "NetSwitch Pro",
        cat: "hardware",
        cur: 28,
        fore: 25,
        conf: "Medium"
    },

    {
        name: "Analytics Plus",
        cat: "software",
        cur: 31,
        fore: 37,
        conf: "High"
    },

    {
        name: "Cloud Support",
        cat: "services",
        cur: 35,
        fore: 39,
        conf: "High"
    },

    {
        name: "Storage Array",
        cat: "hardware",
        cur: 21,
        fore: 23,
        conf: "Low"
    },

    {
        name: "Managed IT",
        cat: "services",
        cur: 22,
        fore: 24,
        conf: "Medium"
    }

];



/* =========================================
   INSIGHTS
========================================= */

const INSIGHTS = {

    all: [

        "Revenue trend shows strong monthly growth.",
        "Q4 seasonal uplift is expected during November and December.",
        "Hardware growth is slowing compared with other categories.",
        "CloudSuite Pro is currently showing the strongest product growth.",
        "Confidence intervals widen for longer-term predictions."

    ],

    software: [

        "Software revenue continues to show strong growth.",
        "Analytics Plus is accelerating.",
        "DataBridge growth is slowing and should be monitored."

    ],

    hardware: [

        "Hardware growth is decelerating.",
        "NetSwitch Pro shows a negative forecast.",
        "ServerX 4000 remains relatively stable."

    ],

    services: [

        "Services revenue continues to grow steadily.",
        "Managed IT shows an expansion opportunity.",
        "Cloud Support capacity may need to increase."

    ]

};



/* =========================================
   CHART STORAGE
========================================= */

let charts = {};



function destroyChart(name) {

    if (charts[name]) {

        charts[name].destroy();

        charts[name] = null;

    }

}



/* =========================================
   CHART OPTIONS
========================================= */

const chartOptions = {

    responsive: true,

    maintainAspectRatio: false,

    animation: {

        duration: 1800,

        easing: "easeOutQuart"

    },

    plugins: {

        legend: {
            display: false
        }

    },

    scales: {

        x: {

            ticks: {

                color: "#a5aec7",

                font: {
                    size: 10
                }

            },

            grid: {

                color:
                    "rgba(255,255,255,0.05)"

            }

        },

        y: {

            ticks: {

                color: "#a5aec7",

                font: {
                    size: 10
                },

                callback: value =>
                    "$" + value + "K"

            },

            grid: {

                color:
                    "rgba(255,255,255,0.05)"

            }

        }

    }

};



/* =========================================
   UPDATE DASHBOARD
========================================= */

function updateDashboard() {

    const category =
        document.getElementById(
            "categoryFilter"
        ).value;


    const {
        data,
        actual,
        forecast,
        lower,
        upper
    } =
        buildForecast(category);



    /* =========================
       METRICS
    ========================= */

    const current =
        data[FORECAST_START - 1];


    const previous =
        data[FORECAST_START - 2];


    const nextForecast =
        forecast.find(
            value =>
                value !== null
        );


    const forecastChange =
        (
            (nextForecast - current) /
            current *
            100
        ).toFixed(1);


    const currentChange =
        (
            (current - previous) /
            previous *
            100
        ).toFixed(1);


    document.getElementById(
        "forecastRev"
    ).textContent =
        "$" + nextForecast + "K";


    document.getElementById(
        "forecastDelta"
    ).textContent =
        (
            forecastChange >= 0
                ? "↑ "
                : "↓ "
        ) +
        Math.abs(
            forecastChange
        ) +
        "% vs current";


    document.getElementById(
        "currentRev"
    ).textContent =
        "$" + current + "K";


    document.getElementById(
        "currentDelta"
    ).textContent =
        (
            currentChange >= 0
                ? "↑ "
                : "↓ "
        ) +
        Math.abs(
            currentChange
        ) +
        "% vs last month";



    /* =========================
       MODEL ACCURACY
    ========================= */

    const validation =
        data.slice(6, 12);


    const {
        slope,
        intercept
    } =
        linearRegression(
            data.slice(0, 6)
        );


    const predicted =
        validation.map(
            (_, index) =>
                Math.round(
                    slope *
                    (index + 6) +
                    intercept
                )
        );


    const mape =
        validation.reduce(
            (sum, actualValue, index) =>
                sum +
                Math.abs(
                    (
                        actualValue -
                        predicted[index]
                    ) /
                    actualValue
                ),
            0
        ) / validation.length;


    const accuracy =
        100 - mape * 100;


    document.getElementById(
        "accuracy"
    ).textContent =
        accuracy.toFixed(1) + "%";



    /* =========================
       PRODUCT TABLE
    ========================= */

    const filtered =
        category === "all"
            ? PRODUCTS
            : PRODUCTS.filter(
                product =>
                    product.cat === category
            );


    let topProduct = "";

    let topGrowth = -Infinity;


    const rows =
        filtered.map(product => {

            const change =
                (
                    (product.fore -
                        product.cur) /
                    product.cur *
                    100
                );


            if (
                change >
                topGrowth
            ) {

                topGrowth =
                    change;

                topProduct =
                    product.name;

            }


            let changeClass =
                "badge-yellow";


            if (change > 5) {

                changeClass =
                    "badge-green";

            }

            else if (change < 0) {

                changeClass =
                    "badge-red";

            }


            let signal =
                "Hold";


            if (change > 5) {

                signal =
                    "Growth";

            }

            else if (change < 0) {

                signal =
                    "Watch";

            }


            let signalClass =
                "badge-yellow";


            if (change > 5) {

                signalClass =
                    "badge-green";

            }

            else if (change < 0) {

                signalClass =
                    "badge-red";

            }


            const confidenceClass =
                product.conf === "High"
                    ? "badge-green"
                    : product.conf === "Medium"
                        ? "badge-yellow"
                        : "badge-red";


            return `

                <tr>

                    <td class="product-name">
                        ${product.name}
                    </td>

                    <td>
                        <span class="badge badge-blue">
                            ${product.cat}
                        </span>
                    </td>

                    <td class="money">
                        $${product.cur}K
                    </td>

                    <td class="money">
                        $${product.fore}K
                    </td>

                    <td>

                        <span class="badge ${changeClass}">
                            ${change >= 0 ? "+" : ""}
                            ${change.toFixed(1)}%
                        </span>

                    </td>

                    <td>

                        <span class="badge ${confidenceClass}">
                            ${product.conf}
                        </span>

                    </td>

                    <td>

                        <span class="badge ${signalClass}">
                            ${signal}
                        </span>

                    </td>

                </tr>

            `;

        });


    document.getElementById(
        "tableBody"
    ).innerHTML =
        rows.join("");


    document.getElementById(
        "topProduct"
    ).textContent =
        topProduct;


    document.getElementById(
        "topProductGrowth"
    ).textContent =
        "↑ " +
        topGrowth.toFixed(1) +
        "% forecast growth";



    /* =========================
       INSIGHTS
    ========================= */

    const insights =
        INSIGHTS[category] ||
        INSIGHTS.all;


    document.getElementById(
        "insightList"
    ).innerHTML =

        insights.map(
            text => `

                <div class="insight">

                    <span class="insight-dot">
                    </span>

                    <p>
                        ${text}
                    </p>

                </div>

            `
        ).join("");



    /* =========================
       FORECAST CHART
    ========================= */

    destroyChart("forecast");


    charts.forecast =
        new Chart(

            document.getElementById(
                "forecastChart"
            ),

            {

                data: {

                    labels: MONTHS,

                    datasets: [

                        {

                            type: "line",

                            label: "Actual",

                            data: actual,

                            borderColor:
                                "#4facfe",

                            backgroundColor:
                                "rgba(79,172,254,0.10)",

                            borderWidth: 3,

                            pointRadius: 4,

                            pointBackgroundColor:
                                "#4facfe",

                            tension: 0.4

                        },


                        {

                            type: "line",

                            label: "Forecast",

                            data: forecast,

                            borderColor:
                                "#22c55e",

                            backgroundColor:
                                "rgba(34,197,94,0.10)",

                            borderWidth: 3,

                            borderDash: [
                                7,
                                5
                            ],

                            pointRadius: 4,

                            pointBackgroundColor:
                                "#22c55e",

                            tension: 0.4

                        },


                        {

                            type: "line",

                            label: "Upper",

                            data: upper,

                            borderColor:
                                "rgba(168,85,247,0.3)",

                            backgroundColor:
                                "rgba(168,85,247,0.12)",

                            borderWidth: 1,

                            pointRadius: 0,

                            fill: "+1",

                            tension: 0.4

                        },


                        {

                            type: "line",

                            label: "Lower",

                            data: lower,

                            borderColor:
                                "rgba(168,85,247,0.3)",

                            borderWidth: 1,

                            pointRadius: 0,

                            tension: 0.4

                        }

                    ]

                },

                options: chartOptions

            }

        );



    /* =========================
       PERFORMANCE CHART
    ========================= */

    destroyChart("performance");


    charts.performance =
        new Chart(

            document.getElementById(
                "perfChart"
            ),

            {

                type: "line",

                data: {

                    labels:
                        MONTHS.slice(6, 12),

                    datasets: [

                        {

                            label:
                                "Actual",

                            data:
                                validation,

                            borderColor:
                                "#4facfe",

                            backgroundColor:
                                "rgba(79,172,254,0.1)",

                            borderWidth: 3,

                            pointRadius: 4,

                            tension: 0.4

                        },


                        {

                            label:
                                "Predicted",

                            data:
                                predicted,

                            borderColor:
                                "#ec4899",

                            backgroundColor:
                                "rgba(236,72,153,0.1)",

                            borderWidth: 3,

                            borderDash:
                                [6, 4],

                            pointRadius: 4,

                            tension: 0.4

                        }

                    ]

                },

                options: chartOptions

            }

        );

}



/* =========================================
   CATEGORY CHART
========================================= */

charts.category =
    new Chart(

        document.getElementById(
            "categoryChart"
        ),

        {

            type: "bar",

            data: {

                labels: [
                    "Q1",
                    "Q2",
                    "Q3",
                    "Q4"
                ],

                datasets: [

                    {

                        label:
                            "Software",

                        data: [
                            209,
                            281,
                            328,
                            393
                        ],

                        backgroundColor:
                            "rgba(79,172,254,0.75)",

                        borderRadius: 8

                    },


                    {

                        label:
                            "Hardware",

                        data: [
                            157,
                            192,
                            230,
                            301
                        ],

                        backgroundColor:
                            "rgba(250,204,21,0.75)",

                        borderRadius: 8

                    },


                    {

                        label:
                            "Services",

                        data: [
                            105,
                            127,
                            149,
                            183
                        ],

                        backgroundColor:
                            "rgba(34,197,94,0.75)",

                        borderRadius: 8

                    }

                ]

            },

            options: chartOptions

        }

    );



/* =========================================
   SEASONAL CHART
========================================= */

charts.seasonal =
    new Chart(

        document.getElementById(
            "seasonChart"
        ),

        {

            type: "radar",

            data: {

                labels: [

                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec"

                ],

                datasets: [

                    {

                        label:
                            "Seasonal Index",

                        data:
                            SEASONAL,

                        borderColor:
                            "#a855f7",

                        backgroundColor:
                            "rgba(168,85,247,0.16)",

                        borderWidth: 3,

                        pointRadius: 4,

                        pointBackgroundColor:
                            "#ec4899"

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: {

                    duration: 1800

                },

                plugins: {

                    legend: {
                        display: false
                    }

                },

                scales: {

                    r: {

                        ticks: {

                            color:
                                "#a5aec7",

                            backdropColor:
                                "transparent",

                            stepSize: 0.05

                        },

                        grid: {

                            color:
                                "rgba(255,255,255,0.08)"

                        },

                        angleLines: {

                            color:
                                "rgba(255,255,255,0.08)"

                        },

                        pointLabels: {

                            color:
                                "#cbd5e1",

                            font: {
                                size: 10
                            }

                        }

                    }

                }

            }

        }

    );



/* =========================================
   AI ASSISTANT
========================================= */

async function askAssistant() {

    const promptInput =
        document.getElementById("assistantPrompt");

    const status =
        document.getElementById("assistantStatus");

    const responseBox =
        document.getElementById("assistantResponse");

    const category =
        document.getElementById("categoryFilter").value;

    const prompt =
        (promptInput.value || "").trim();

    status.textContent = "Thinking...";
    responseBox.textContent = "Connecting to the AI backend...";

    try {

        const response = await fetch("/api/assistant", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: prompt || `Give me a strategy for ${category} revenue growth`,
                category
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Assistant request failed");
        }

        responseBox.textContent = data.reply;
        status.textContent = "AI Ready";

    } catch (error) {

        console.error(error);
        responseBox.textContent =
            "The backend assistant is unavailable right now. Please make sure the server is running.";

        status.textContent = "Offline";

    }

}


function showAction(action) {

    const promptInput =
        document.getElementById("assistantPrompt");

    const selected =
        document.getElementById("categoryFilter").value;

    promptInput.value =
        `Recommend a plan for ${action} in the ${selected} category.`;

    askAssistant();

}


const assistantButton =
    document.getElementById("askAssistantBtn");

if (assistantButton) {
    assistantButton.addEventListener("click", askAssistant);
}


/* =========================================
   INITIALIZE
========================================= */

updateDashboard();