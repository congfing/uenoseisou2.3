const fileSelect = document.querySelector("#fileSelect");
const startupVehicleSelect = document.querySelector("#startupVehicleSelect");
const sheetSelect = document.querySelector("#sheetSelect");
const vehicleFilter = document.querySelector("#vehicleFilter");
const yearFilter = document.querySelector("#yearFilter");
const monthFilter = document.querySelector("#monthFilter");
const workbookPath = document.querySelector("#workbookPath");
const recordCount = document.querySelector("#recordCount");
const selectedInfo = document.querySelector("#selectedInfo");
const tableHead = document.querySelector("#tableHead");
const tableBody = document.querySelector("#tableBody");
const reloadButton = document.querySelector("#reloadButton");
const saveSheet = document.querySelector("#saveSheet");
const metaSelectedVehicle = document.querySelector("#metaSelectedVehicle");
const metaActiveVehicleType = document.querySelector("#metaActiveVehicleType");
const registerVehicle = document.querySelector("#registerVehicle");
const registerVehicleType = document.querySelector("#registerVehicleType");
const registerVehicleButton = document.querySelector("#registerVehicleButton");
const vehicleSlotInfo = document.querySelector("#vehicleSlotInfo");
const metaDriver = document.querySelector("#metaDriver");
const metaDriverInputs = Array.from({ length: 5 }, (_, index) => document.querySelector(`#metaDriver${index + 1}`));
const registerDriver = document.querySelector("#registerDriver");
const registerDriverButton = document.querySelector("#registerDriverButton");
const metaSelectedDriver = document.querySelector("#metaSelectedDriver");
const driverSlotInfo = document.querySelector("#driverSlotInfo");

let currentSheet = null;
let availableWorkbooks = [];
let selectedVehicleValue = "";
const registeredVehicles = new Map();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalize(value) {
  return String(value ?? "").trim();
}

function findHeader(headers, candidates) {
  return headers.find((header) => candidates.some((candidate) => normalize(header).includes(candidate))) || "";
}

function parseDateParts(value) {
  const text = normalize(value);
  if (!text) return null;

  let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    return { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) };
  }

  match = text.match(/(\d{1,2})月\s*(\d{1,2})日/);
  if (match) {
    return { year: "", month: String(Number(match[1])), day: String(Number(match[2])) };
  }

  return null;
}

function optionHtml(value, label = value) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
}

async function loadWorkbooks() {
  const response = await fetch("/api/workbooks");
  if (!response.ok) throw new Error("Excel一覧を読み込めません。");
  const data = await response.json();
  availableWorkbooks = data.workbooks || [];
  startupVehicleSelect.innerHTML = optionHtml("", "車番を選択") + (availableWorkbooks.length
    ? availableWorkbooks.map((book) => {
      const vehicle = book.vehicleLabel || "車番未設定";
      return optionHtml(book.name, `${vehicle} - ${book.name}`);
    }).join("")
    : "");
  fileSelect.innerHTML = availableWorkbooks.map((book) => optionHtml(book.name)).join("");
  fileSelect.value = data.default || availableWorkbooks[0]?.name || "";
  startupVehicleSelect.value = "";
  await loadSheet(fileSelect.value);
}

async function loadSheet(fileName, sheetName = "") {
  const query = new URLSearchParams({ file: fileName });
  if (sheetName) query.set("sheet", sheetName);
  const response = await fetch(`/api/sheet?${query.toString()}`);
  if (!response.ok) throw new Error("Sheetを読み込めません。");
  currentSheet = await response.json();

  workbookPath.textContent = currentSheet.path;
  sheetSelect.innerHTML = currentSheet.sheets.map((sheet) => optionHtml(sheet)).join("");
  sheetSelect.value = currentSheet.selectedSheet;
  selectedInfo.textContent = `${currentSheet.name} / ${currentSheet.selectedSheet}`;
  renderMetadata();
  buildFilters();
  renderTable();
}

function renderMetadata() {
  const metadata = currentSheet.metadata || {};
  const isRecord = currentSheet.selectedSheet === "記録";
  updateSelectedVehicleOptions(selectedVehicleValue);
  updateRegisterInputsFromSelected();
  metaDriver.value = metadata["選択運転者"] || metadata["運転者"] || "";
  metaDriverInputs.forEach((input, index) => {
    input.value = metadata[`運転者${index + 1}`] || "";
  });
  updateSelectedDriverOptions(metaDriver.value);
  updateRegisterDriverFromSelected();
  [registerVehicle, registerVehicleType, registerVehicleButton, metaSelectedVehicle, registerDriver, registerDriverButton, metaSelectedDriver].forEach((input) => {
    input.disabled = !isRecord;
  });
  metaActiveVehicleType.disabled = true;
}

function vehicleEntries() {
  const headers = currentSheet?.headers || [];
  const vehicleHeader = findHeader(headers, ["車番"]);
  const typeHeader = findHeader(headers, ["車種"]);
  const entries = new Map(registeredVehicles);
  (currentSheet?.rows || []).forEach((row) => {
    const vehicle = normalize(row[vehicleHeader]);
    if (!vehicle || entries.has(vehicle)) return;
    entries.set(vehicle, { vehicle, type: normalize(row[typeHeader]) });
  });
  return [...entries.values()].filter((entry) => entry.vehicle);
}

function vehicleOptionLabel(entry) {
  const parts = [entry.vehicle];
  if (entry.type) parts.push(entry.type);
  return parts.join(" / ");
}

function updateSelectedVehicleOptions(selected = metaSelectedVehicle.value) {
  const entries = vehicleEntries();
  const vehicles = entries.map((entry) => entry.vehicle);
  metaSelectedVehicle.innerHTML = entries.length
    ? entries.map((entry) => optionHtml(entry.vehicle, vehicleOptionLabel(entry))).join("")
    : optionHtml("", "未設定");
  metaSelectedVehicle.value = vehicles.includes(selected) ? selected : (vehicles[0] || "");
  selectedVehicleValue = metaSelectedVehicle.value;
  updateActiveVehicleType();
  updateVehicleSlotInfo();
}

function updateActiveVehicleType() {
  const entry = vehicleEntries().find((item) => item.vehicle === metaSelectedVehicle.value);
  metaActiveVehicleType.value = entry?.type || "";
}

function updateRegisterInputsFromSelected() {
  const entry = vehicleEntries().find((item) => item.vehicle === metaSelectedVehicle.value);
  registerVehicle.value = entry?.vehicle || "";
  registerVehicleType.value = entry?.type || "";
}

function updateVehicleSlotInfo(message = "") {
  const entries = vehicleEntries();
  vehicleSlotInfo.textContent = message || (entries.length ? `登録済み ${entries.length}台` : "車番と車種を入力して登録します。");
}

function registerVehicleEntry() {
  const vehicle = registerVehicle.value.trim();
  const vehicleType = registerVehicleType.value.trim();
  if (!vehicle) {
    updateVehicleSlotInfo("車番を入力してください。");
    return;
  }

  registeredVehicles.set(vehicle, { vehicle, type: vehicleType });
  updateSelectedVehicleOptions(vehicle);
  updateRegisterInputsFromSelected();
  renderTable();
  updateVehicleSlotInfo(`登録しました: ${vehicleOptionLabel({ vehicle, type: vehicleType })}`);
}

function driverEntries() {
  const entries = metaDriverInputs
    .map((input, index) => ({ slot: index + 1, driver: input.value.trim() }))
    .filter((entry) => entry.driver);
  const seen = new Set(entries.map((entry) => entry.driver));
  const driverHeader = findHeader(currentSheet?.headers || [], ["運転者"]);
  (currentSheet?.rows || []).forEach((row) => {
    const driver = normalize(row[driverHeader]);
    if (!driver || seen.has(driver)) return;
    seen.add(driver);
    entries.push({ slot: entries.length + 1, driver });
  });
  return entries;
}

function updateSelectedDriverOptions(selected = metaSelectedDriver.value) {
  const entries = driverEntries();
  const drivers = entries.map((entry) => entry.driver);
  metaSelectedDriver.innerHTML = entries.length
    ? entries.map((entry) => optionHtml(entry.driver, entry.driver)).join("")
    : optionHtml("", "未設定");
  metaSelectedDriver.value = drivers.includes(selected) ? selected : (drivers[0] || "");
  metaDriver.value = metaSelectedDriver.value;
  updateDriverSlotInfo();
}

function updateRegisterDriverFromSelected() {
  registerDriver.value = metaSelectedDriver.value || "";
}

function updateDriverSlotInfo(message = "") {
  const entries = driverEntries();
  const list = entries.map((entry) => `${entry.slot}:${entry.driver}`).join(" / ");
  driverSlotInfo.textContent = message || (list ? `登録済み ${list}` : "運転者を入力して登録します。");
}

function setDriverSlot(slot, driver) {
  metaDriverInputs[slot - 1].value = driver;
}

function registerDriverEntry() {
  const driver = registerDriver.value.trim();
  if (!driver) {
    updateDriverSlotInfo("運転者を入力してください。");
    return;
  }

  const existingIndex = metaDriverInputs.findIndex((input) => input.value.trim() === driver);
  const emptyIndex = metaDriverInputs.findIndex((input) => !input.value.trim());
  let slot = existingIndex >= 0 ? existingIndex + 1 : emptyIndex + 1;
  if (!slot) {
    const selectedIndex = metaDriverInputs.findIndex((input) => input.value.trim() === metaSelectedDriver.value);
    slot = selectedIndex >= 0 ? selectedIndex + 1 : 1;
  }

  setDriverSlot(slot, driver);
  updateSelectedDriverOptions(driver);
  updateRegisterDriverFromSelected();
  renderTable();
  updateDriverSlotInfo(`登録しました: ${driver}`);
}

function buildFilters() {
  const headers = currentSheet.headers || [];
  const vehicleHeader = findHeader(headers, ["車番"]);
  const dateHeader = findHeader(headers, ["給油日", "日付", "年月日"]);
  const vehicles = new Set();
  const years = new Set();
  const months = new Set();

  currentSheet.rows.forEach((row) => {
    const vehicle = normalize(row[vehicleHeader]);
    if (vehicle) vehicles.add(vehicle);

    const parts = parseDateParts(row[dateHeader]);
    if (parts?.year) years.add(parts.year);
    if (parts?.month) months.add(parts.month);
  });

  vehicleFilter.innerHTML = optionHtml("", "すべて") + [...vehicles].sort().map((value) => optionHtml(value)).join("");
  yearFilter.innerHTML = optionHtml("", "すべて") + [...years].sort().map((value) => optionHtml(value, `${value}年`)).join("");
  monthFilter.innerHTML = optionHtml("", "すべて") + Array.from({ length: 12 }, (_, index) => String(index + 1))
    .filter((month) => months.size === 0 || months.has(month))
    .map((value) => optionHtml(value, `${value}月`))
    .join("");
}

function filteredRows() {
  const headers = currentSheet.headers || [];
  const vehicleHeader = findHeader(headers, ["車番"]);
  const dateHeader = findHeader(headers, ["給油日", "日付", "年月日"]);
  const hasFilter = vehicleFilter.value || yearFilter.value || monthFilter.value;
  const selectedVehicle = metaSelectedVehicle.value;

  if (!hasFilter && !selectedVehicle) {
    return currentSheet.rows;
  }

  return currentSheet.rows.filter((row) => {
    const hasContent = headers.some((header) => normalize(row[header]));
    if (!hasContent) return Boolean(selectedVehicle) && !vehicleFilter.value && !yearFilter.value && !monthFilter.value;
    const vehicle = normalize(row[vehicleHeader]);
    const parts = parseDateParts(row[dateHeader]);
    const vehicleOk = vehicleFilter.value ? vehicle === vehicleFilter.value : (!selectedVehicle || vehicle === selectedVehicle);
    const yearOk = !yearFilter.value || parts?.year === yearFilter.value;
    const monthOk = !monthFilter.value || parts?.month === monthFilter.value;
    return vehicleOk && yearOk && monthOk;
  });
}

function renderTable() {
  if (!currentSheet) return;
  document.querySelector("#dataTable").querySelector("colgroup")?.remove();
  saveSheet.hidden = currentSheet.selectedSheet !== "記録";
  if (currentSheet.selectedSheet !== "記録") {
    renderExcelGrid();
    return;
  }

  const headers = currentSheet.headers || [];
  const rows = filteredRows();

  document.querySelector("#dataTable").insertAdjacentHTML("afterbegin", recordColgroupHtml(headers));
  tableHead.innerHTML = `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
  tableBody.innerHTML = rows.length
    ? rows.map((row) => {
      const rowIndex = currentSheet.rows.indexOf(row);
      return `
      <tr>
        ${headers.map((header) => recordCellHtml(row, header, rowIndex)).join("")}
      </tr>
    `;
    }).join("")
    : `<tr>${headers.map(() => "<td>&nbsp;</td>").join("")}</tr>`;

  recordCount.textContent = `${rows.length}件`;
}

function recordColgroupHtml(headers) {
  const classes = {
    "No": "col-no",
    "車番": "col-vehicle",
    "車種": "col-type",
    "運転者": "col-driver",
    "給油日": "col-date",
    "オドメーター": "col-odometer",
    "走行距離(km)": "col-distance",
    "給油燃料量(L)": "col-fuel",
    "燃費(km/L)": "col-economy",
    "備考": "col-notes",
    "保存日時": "col-saved",
  };
  return `<colgroup>${headers.map((header) => (
    `<col class="${classes[header] || "col-default"}">`
  )).join("")}</colgroup>`;
}

function recordCellHtml(row, header, rowIndex) {
  const readonlyHeaders = new Set(["No", "車番", "車種", "運転者", "走行距離(km)", "燃費(km/L)", "保存日時"]);
  const value = row[header] ?? "";
  if (readonlyHeaders.has(header)) {
    return `<td class="readonly-cell">${escapeHtml(value) || "&nbsp;"}</td>`;
  }

  const type = header.includes("日付") || header === "給油日" ? "date" : "text";
  const inputMode = header.includes("オドメーター") || header.includes("燃料") ? "decimal" : "text";
  return `
    <td>
      <input class="sheet-input" data-row="${rowIndex}" data-header="${escapeHtml(header)}"
        type="${type}" inputmode="${inputMode}" value="${escapeHtml(value)}">
    </td>
  `;
}

function mergedInfo(rowIndex, colIndex) {
  const row = rowIndex + 1;
  const col = colIndex + 1;
  const range = (currentSheet.mergedRanges || []).find((item) => (
    row >= item.minRow && row <= item.maxRow && col >= item.minCol && col <= item.maxCol
  ));
  if (!range) return { hidden: false, rowspan: 1, colspan: 1 };
  if (row !== range.minRow || col !== range.minCol) return { hidden: true };
  return {
    hidden: false,
    rowspan: range.maxRow - range.minRow + 1,
    colspan: range.maxCol - range.minCol + 1,
  };
}

function renderExcelGrid() {
  const rows = currentSheet.rawRows || [];
  const maxColumn = currentSheet.maxColumn || Math.max(...rows.map((row) => row.length), 1);
  const widths = currentSheet.columnWidths || [];
  const heights = currentSheet.rowHeights || [];
  const styles = currentSheet.cellStyles || [];

  tableHead.innerHTML = "";
  const colgroup = `<colgroup>${Array.from({ length: maxColumn }, (_, index) => (
    `<col style="width:${widths[index] || 96}px">`
  )).join("")}</colgroup>`;
  tableBody.innerHTML = rows.map((row, rowIndex) => `
    <tr style="height:${heights[rowIndex] || 34}px">
      ${Array.from({ length: maxColumn }, (_, colIndex) => {
        const merge = mergedInfo(rowIndex, colIndex);
        if (merge.hidden) return "";
        const value = row[colIndex] ?? "";
        const style = styles[rowIndex]?.[colIndex] || {};
        const inlineStyle = [
          style.align ? `text-align:${style.align}` : "",
          style.vertical ? `vertical-align:${style.vertical}` : "",
          style.wrap ? "white-space:pre-line" : "",
          style.fill ? `background:${style.fill}` : "",
          style.bold ? "font-weight:800" : "",
          style.fontSize ? `font-size:${style.fontSize}px` : "",
        ].filter(Boolean).join(";");
        const attrs = [
          merge.rowspan > 1 ? `rowspan="${merge.rowspan}"` : "",
          merge.colspan > 1 ? `colspan="${merge.colspan}"` : "",
          merge.rowspan > 1 || merge.colspan > 1 ? "class=\"merged-cell\"" : "",
          inlineStyle ? `style="${inlineStyle}"` : "",
        ].filter(Boolean).join(" ");
        return `<td ${attrs}>${escapeHtml(value) || "&nbsp;"}</td>`;
      }).join("")}
    </tr>
  `).join("");
  document.querySelector("#dataTable").querySelector("colgroup")?.remove();
  document.querySelector("#dataTable").insertAdjacentHTML("afterbegin", colgroup);
  recordCount.textContent = `${rows.length}行`;
}

fileSelect.addEventListener("change", () => {
  startupVehicleSelect.value = availableWorkbooks.some((book) => book.name === fileSelect.value) ? fileSelect.value : "";
  loadSheet(fileSelect.value).catch((error) => {
    workbookPath.textContent = error.message;
  });
});

startupVehicleSelect.addEventListener("change", () => {
  if (!startupVehicleSelect.value) return;
  fileSelect.value = startupVehicleSelect.value;
  loadSheet(fileSelect.value).catch((error) => {
    workbookPath.textContent = error.message;
  });
});

sheetSelect.addEventListener("change", () => loadSheet(fileSelect.value, sheetSelect.value).catch((error) => {
  workbookPath.textContent = error.message;
}));

[vehicleFilter, yearFilter, monthFilter].forEach((select) => {
  select.addEventListener("change", renderTable);
});

metaSelectedVehicle.addEventListener("change", () => {
  selectedVehicleValue = metaSelectedVehicle.value;
  updateActiveVehicleType();
  updateRegisterInputsFromSelected();
  renderTable();
});

registerVehicleButton.addEventListener("click", registerVehicleEntry);
registerDriverButton.addEventListener("click", registerDriverEntry);

metaSelectedDriver.addEventListener("change", () => {
  metaDriver.value = metaSelectedDriver.value;
  updateRegisterDriverFromSelected();
});

[registerVehicle, registerVehicleType, registerDriver].forEach((input) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (input === registerDriver) {
        registerDriverEntry();
      } else {
        registerVehicleEntry();
      }
    }
  });
});

reloadButton.addEventListener("click", () => loadWorkbooks().catch((error) => {
  workbookPath.textContent = error.message;
}));

saveSheet.addEventListener("click", async () => {
  document.querySelectorAll(".sheet-input").forEach((input) => {
    const rowIndex = Number(input.dataset.row);
    const header = input.dataset.header;
    if (currentSheet.rows[rowIndex]) {
      currentSheet.rows[rowIndex][header] = input.value;
    }
  });
  const selectedVehicle = metaSelectedVehicle.value;
  const selectedVehicleType = metaActiveVehicleType.value;
  const selectedDriver = metaSelectedDriver.value;
  currentSheet.rows.forEach((row) => {
    const hasEditableValue = ["給油日", "オドメーター", "給油燃料量(L)", "備考"].some((header) => normalize(row[header]));
    if (hasEditableValue && selectedVehicle && !normalize(row["車番"])) {
      row["車番"] = selectedVehicle;
    }
    if (hasEditableValue && selectedVehicleType && !normalize(row["車種"])) {
      row["車種"] = selectedVehicleType;
    }
    if (hasEditableValue && selectedDriver && !normalize(row["運転者"])) {
      row["運転者"] = selectedDriver;
    }
  });

  saveSheet.disabled = true;
  saveSheet.textContent = "保存中";
  try {
    const response = await fetch("/api/save-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: fileSelect.value,
        sheet: sheetSelect.value,
        metadata: {
          "運転者": metaSelectedDriver.value,
          "選択運転者": metaSelectedDriver.value,
          "運転者1": metaDriverInputs[0].value,
          "運転者2": metaDriverInputs[1].value,
          "運転者3": metaDriverInputs[2].value,
          "運転者4": metaDriverInputs[3].value,
          "運転者5": metaDriverInputs[4].value,
        },
        rows: currentSheet.rows,
      }),
    });
    if (!response.ok) throw new Error("記録を保存できません。");
    currentSheet = await response.json();
    selectedInfo.textContent = `${currentSheet.name} / ${currentSheet.selectedSheet} 保存済み`;
    buildFilters();
    renderTable();
  } catch (error) {
    workbookPath.textContent = error.message;
  } finally {
    saveSheet.disabled = false;
    saveSheet.textContent = "記録を保存";
  }
});

loadWorkbooks().catch((error) => {
  workbookPath.textContent = error.message;
});
