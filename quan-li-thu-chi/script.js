let transactions = [];

const API_URL = "https://script.google.com/macros/s/AKfycbzaaylyRMuHUrx4UkBS30bGKfQXozCwSaNhJBlKYkDx5tHl-oBghK-kokxMSfTLyJPL/exec";
const TELEGRAM_BOT_TOKEN = "7783089403:AAGNpG6GsdlF7VXVfPTW8Y1xQJEqBahL1PY";
const TELEGRAM_CHAT_ID = "6249154937";

// Lấy dữ liệu từ Google Drive và chỉ giữ bản ghi active
async function fetchTransactions() {
    try {
        let response = await fetch(API_URL);
        let data = await response.json();
        return (data.transactions || []).filter(t => t.status === "active");
    } catch (error) {
        console.error("❌ Lỗi lấy dữ liệu từ Google Drive:", error);
        return [];
    }
}

// Gửi một bản ghi lên Google Drive
async function saveTransaction(transaction) {
    if (!transaction || !transaction.amount || !transaction.type) {
        alert("❌ Dữ liệu không hợp lệ!");
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transaction })
        });

        const result = await response.text();
        console.log("✅ Đã lưu giao dịch mới:", result);
    } catch (error) {
        console.error("❌ Lỗi ghi dữ liệu:", error);
    }
}



// Hàm cập nhật giao diện
function updateUI() {
    let tableBody = document.querySelector("#transaction-table tbody");
    tableBody.innerHTML = "";
    let totalIncome = 0;
    let totalExpense = 0;

    // Lọc và phân loại giao dịch theo loại (thu/chi)
    let incomeTransactions = transactions.filter(t => t.type === "income" && t.status === "active");
    let expenseTransactions = transactions.filter(t => t.type === "expense" && t.status === "active");

    // Sắp xếp các giao dịch theo ngày tháng (từ mới nhất đến cũ nhất)
    incomeTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    expenseTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Thêm các giao dịch thu vào bảng
    incomeTransactions.forEach(t => {
        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${t.amount.toLocaleString("vi-VN")} VND</td>
            <td>Thu</td>
            <td>${t.note}</td>
            <td>${new Date(t.date).toLocaleString("vi-VN")}</td>
            <td>
                <button onclick="editTransaction(${transactions.indexOf(t)})">✏️</button>
                <button onclick="deleteTransaction(${transactions.indexOf(t)})">🗑️</button>
            </td>
        `;

        tableBody.appendChild(row);
        totalIncome += t.amount;
    });

    // Thêm các giao dịch chi vào bảng
    expenseTransactions.forEach(t => {
        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${t.amount.toLocaleString("vi-VN")} VND</td>
            <td>Chi</td>
            <td>${t.note}</td>
            <td>${new Date(t.date).toLocaleString("vi-VN")}</td>
            <td>
                <button onclick="editTransaction(${transactions.indexOf(t)})">✏️</button>
                <button onclick="deleteTransaction(${transactions.indexOf(t)})">🗑️</button>
            </td>
        `;

        tableBody.appendChild(row);
        totalExpense += t.amount;
    });

    // Cập nhật tổng thu chi
    document.getElementById("total-income").textContent = totalIncome.toLocaleString("vi-VN");
    document.getElementById("total-expense").textContent = totalExpense.toLocaleString("vi-VN");
}

// Thêm giao dịch mới
async function addTransaction() {
    let amount = document.getElementById("amount").value;
    let type = document.getElementById("type").value;
    let note = document.getElementById("note").value;

    if (!amount || isNaN(amount)) {
        alert("Vui lòng nhập số tiền hợp lệ!");
        return;
    }

    let transaction = {
        amount: parseInt(amount),
        type,
        note,
        date: new Date().toISOString(),
        status: "active"
    };

    await saveTransaction(transaction); // Ghi giao dịch lên Google Drive
    transactions = await fetchTransactions(); // Làm mới danh sách giao dịch
    updateUI(); // Cập nhật giao diện
}
// Sửa giao dịch
async function editTransaction(index) {
    let oldTransaction = transactions[index];

    // Gán dữ liệu cũ lên form
    document.getElementById("amount").value = oldTransaction.amount;
    document.getElementById("type").value = oldTransaction.type;
    document.getElementById("note").value = oldTransaction.note;

    // Khi nhấn "Cập nhật", tạo bản ghi mới và thay thế bản ghi cũ
    document.getElementById("submit-btn").onclick = async function () {
        let newTransaction = {
            amount: parseInt(document.getElementById("amount").value),
            type: document.getElementById("type").value,
            note: document.getElementById("note").value,
            date: new Date().toISOString(),
            status: "active"
        };

        // Đánh dấu bản ghi cũ là đã xóa (thay đổi trạng thái)
        transactions[index].status = "deleted";

        // Lưu bản ghi cũ (đã đánh dấu deleted)
        await saveTransaction(transactions[index]);

        // Thêm bản ghi mới vào danh sách giao dịch
        transactions.push(newTransaction); // Thêm giao dịch mới vào mảng

        // Lưu bản ghi mới
        await saveTransaction(newTransaction);

        // Làm mới danh sách giao dịch từ Google Drive
        transactions = await fetchTransactions();

        // Cập nhật giao diện
        updateUI();

        // Đặt lại form
        resetForm();
    };
}

// Xóa giao dịch
async function deleteTransaction(index) {
    if (!confirm("Bạn có chắc muốn xóa giao dịch này?")) return;

    // Đánh dấu bản ghi là đã xóa (thay đổi trạng thái thành 'deleted')
    transactions[index].status = "deleted";

    // Lưu bản ghi đã thay đổi lên Google Drive
    await saveTransaction(transactions[index]);

    // Làm mới danh sách từ server (lấy lại tất cả giao dịch)
    transactions = await fetchTransactions();

    // Cập nhật lại giao diện
    updateUI();
}

// Reset form sau khi thêm/sửa
function resetForm() {
    document.getElementById("amount").value = "";
    document.getElementById("type").value = "income";
    document.getElementById("note").value = "";
    document.getElementById("submit-btn").onclick = addTransaction;
}

// Gửi thông báo Telegram
function sendToTelegram(transaction) {
    let message = `📌 *Giao dịch mới*:\n💰 *Số tiền:* ${transaction.amount.toLocaleString("vi-VN")} VND\n📂 *Loại:* ${transaction.type === "income" ? "Thu nhập" : "Chi tiêu"}\n📝 *Mô tả:* ${transaction.note}`;

    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "Markdown"
        })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.ok) {
            alert("❌ Gửi Telegram thất bại!");
        }
    })
    .catch(err => console.error("Lỗi gửi Telegram:", err));
}

// Tải dữ liệu khi mở trang
window.onload = async function () {
    transactions = await fetchTransactions();
    updateUI();
    resetForm();
};
