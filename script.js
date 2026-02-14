// Verifica se a biblioteca carregou antes de configurar
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
} else {
    console.warn("Biblioteca PDF.js não carregada. A importação de PDF pode não funcionar.");
}

const STORAGE_KEY = 'ecoSynergy_DB_V3';
let currentReportId = null;

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    carregarDashboard();
    
    // Configuração do Drag & Drop (Arrastar arquivo)
    const dropZone = document.getElementById('drop-zone');
    const input = document.getElementById('pdf-upload');
    
    if (dropZone && input) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; });
        dropZone.addEventListener('dragleave', (e) => { dropZone.style.borderColor = '#cbd5e1'; });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#cbd5e1';
            if (e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                importarPDF(input);
            }
        });
    }
});

// --- Navegação entre Telas ---
function voltarParaHome() {
    currentReportId = null;
    document.getElementById('view-dashboard').classList.remove('hidden');
    document.getElementById('view-editor').classList.add('hidden');
    document.getElementById('home-actions').classList.remove('hidden');
    document.getElementById('editor-actions').classList.add('hidden');
    carregarDashboard();
}

function abrirEditor() {
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-editor').classList.remove('hidden');
    document.getElementById('home-actions').classList.add('hidden');
    document.getElementById('editor-actions').classList.remove('hidden');
}

// --- Banco de Dados Local (LocalStorage) ---
function getDB() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveDB(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- Função Principal: Criar Novo Relatório ---
function criarNovoRelatorio() {
    try {
        const novoRelatorio = {
            id: Date.now().toString(),
            titulo: "", 
            meta: { 
                tipo: "", 
                colaborador: "", 
                empresa: "",
                dtIni: new Date().toISOString().split('T')[0],
                dtFim: "",
                aprov: "",
                dtAprov: "",
                reembolsos: "",
                obs: ""
            },
            itens: []
        };
        
        const db = getDB();
        db.push(novoRelatorio);
        saveDB(db);
        
        // Carrega o relatório recém-criado
        carregarRelatorio(novoRelatorio.id);
        
    } catch (e) {
        console.error(e);
        alert("Erro ao criar relatório: " + e.message);
    }
}

function carregarRelatorio(id) {
    currentReportId = id;
    const db = getDB();
    const report = db.find(r => r.id === id);
    if(!report) return;

    // Preenche Título
    document.getElementById('doc-title').value = report.titulo || "";
    document.getElementById('print-title-display').textContent = report.titulo || "Relatório sem título";

    // Preenche Campos (Mapeamento Seguro)
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.value = val || "";
    };

    setVal('tipo', report.meta.tipo);
    setVal('colaborador', report.meta.colaborador);
    setVal('empresa', report.meta.empresa);
    setVal('data-inicial', report.meta.dtIni);
    setVal('data-final', report.meta.dtFim);
    setVal('aprovador', report.meta.aprov);
    setVal('data-aprovacao', report.meta.dtAprov);
    setVal('reembolsos', report.meta.reembolsos);
    setVal('obs', report.meta.obs);

    // Preenche Tabela
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    if (report.itens && report.itens.length > 0) {
        report.itens.forEach(item => adicionarLinhaUI(item));
    } else {
        // Se for novo, adiciona uma linha vazia para facilitar
        adicionarLinhaUI({desc: "", cat: "Outros", qtd: 1, unit: 0});
    }
    
    atualizarTotais();
    abrirEditor();
}

function autoSave() {
    if(!currentReportId) return;
    
    const titulo = document.getElementById('doc-title').value;
    document.getElementById('print-title-display').textContent = titulo || "Relatório sem título";

    const meta = {
        tipo: document.getElementById('tipo').value,
        colaborador: document.getElementById('colaborador').value,
        empresa: document.getElementById('empresa').value,
        dtIni: document.getElementById('data-inicial').value,
        dtFim: document.getElementById('data-final').value,
        aprov: document.getElementById('aprovador').value,
        dtAprov: document.getElementById('data-aprovacao').value,
        reembolsos: document.getElementById('reembolsos').value,
        obs: document.getElementById('obs').value
    };

    const itens = [];
    document.querySelectorAll('#table-body tr').forEach(row => {
        itens.push({
            desc: row.querySelector('.inp-desc').value,
            cat: row.querySelector('.inp-cat').value,
            qtd: parseFloat(row.querySelector('.inp-qtd').value) || 0,
            unit: parseFloat(row.querySelector('.inp-unit').value) || 0
        });
    });

    // Atualiza no banco
    const db = getDB();
    const index = db.findIndex(r => r.id === currentReportId);
    if(index !== -1) {
        db[index].titulo = titulo;
        db[index].meta = meta;
        db[index].itens = itens;
        saveDB(db);
    }
    
    atualizarTotais();
}

function deletarRelatorio() {
    if(confirm("Tem certeza que deseja excluir este relatório permanentemente?")) {
        let db = getDB();
        db = db.filter(r => r.id !== currentReportId);
        saveDB(db);
        voltarParaHome();
        showToast("Relatório excluído.");
    }
}

// --- Dashboard (Lista Inicial) ---
function carregarDashboard() {
    const db = getDB();
    const grid = document.getElementById('reports-grid');
    const empty = document.getElementById('empty-state');
    
    grid.innerHTML = '';
    
    if(db.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    // Ordena do mais recente para o mais antigo
    db.sort((a,b) => b.id - a.id).forEach(r => {
        const total = r.itens.reduce((acc, i) => acc + (i.qtd * i.unit), 0);
        const card = document.createElement('div');
        card.className = 'report-card';
        card.onclick = () => carregarRelatorio(r.id);
        
        const displayTitle = r.titulo || r.meta.tipo || "Novo Relatório";

        card.innerHTML = `
            <div class="card-meta">
                <span>${formatDate(r.meta.dtIni)}</span>
                <i class="ph ph-caret-right"></i>
            </div>
            <span class="card-title" title="${displayTitle}">${displayTitle}</span>
            <span class="card-project">${r.meta.colaborador || 'Colaborador não informado'}</span>
            <div class="card-footer">
                <span style="font-size:0.8rem; color:var(--text-muted)">Total</span>
                <span class="card-total">R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filtrarRelatorios(texto) {
    const termo = texto.toLowerCase();
    document.querySelectorAll('.report-card').forEach(card => {
        const conteudo = card.innerText.toLowerCase();
        card.style.display = conteudo.includes(termo) ? 'block' : 'none';
    });
}

// --- Funções da Tabela ---
function adicionarLinha() {
    adicionarLinhaUI({desc: "", cat: "Outros", qtd: 1, unit: 0});
    autoSave();
}

function adicionarLinhaUI(item) {
    const tbody = document.getElementById('table-body');
    const row = tbody.insertRow();
    
    const cats = ['Alimentação', 'Transporte', 'Hospedagem', 'Material', 'Outros'];
    const options = cats.map(c => `<option value="${c}" ${c === item.cat ? 'selected' : ''}>${c}</option>`).join('');

    row.innerHTML = `
        <td class="item-num" style="color:#aaa; font-size:0.8rem"></td>
        <td><input type="text" class="inp-desc" value="${item.desc}" placeholder="Descrição" oninput="autoSave()"></td>
        <td><select class="inp-cat" onchange="autoSave()">${options}</select></td>
        <td><input type="number" class="inp-qtd" value="${item.qtd}" oninput="calcRow(this)"></td>
        <td><input type="number" class="inp-unit" step="0.01" value="${item.unit}" oninput="calcRow(this)"></td>
        <td><input type="text" class="inp-total" value="R$ 0,00" readonly style="font-weight:600; color:var(--text-main)"></td>
        <td class="no-print"><i class="ph ph-trash" onclick="removeRow(this)" style="cursor:pointer; color:var(--danger)"></i></td>
    `;
    
    // Calcula o total inicial desta linha
    calcRow(row.querySelector('.inp-qtd'), false); 
    updateNumbers();
}

function calcRow(el, save = true) {
    const row = el.closest('tr');
    const qtd = parseFloat(row.querySelector('.inp-qtd').value) || 0;
    const unit = parseFloat(row.querySelector('.inp-unit').value) || 0;
    row.querySelector('.inp-total').value = `R$ ${(qtd * unit).toFixed(2).replace('.', ',')}`;
    if(save) autoSave();
}

function removeRow(icon) {
    icon.closest('tr').remove();
    updateNumbers();
    autoSave();
}

function updateNumbers() {
    document.querySelectorAll('.item-num').forEach((td, i) => td.textContent = i + 1);
}

function atualizarTotais() {
    let total = 0;
    document.querySelectorAll('#table-body tr').forEach(row => {
        const qtd = parseFloat(row.querySelector('.inp-qtd').value) || 0;
        const unit = parseFloat(row.querySelector('.inp-unit').value) || 0;
        total += qtd * unit;
    });
    const str = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    
    const footerTotal = document.getElementById('footer-total');
    const headerTotal = document.getElementById('header-total');
    
    if(footerTotal) footerTotal.textContent = str;
    if(headerTotal) headerTotal.textContent = str;
}

// --- Importação de PDF ---
async function importarPDF(input) {
    if(!currentReportId) return alert("Abra um relatório primeiro.");
    
    const file = input.files[0];
    if(!file) return;

    if (typeof pdfjsLib === 'undefined') {
        alert("Erro: A biblioteca PDF não foi carregada. Verifique sua conexão com a internet.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function() {
        const typedarray = new Uint8Array(this.result);
        try {
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = "";
            for(let i=1; i<=pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                fullText += content.items.map(s => s.str).join(" ") + " ";
            }
            processarPDF(fullText);
            showToast("Dados importados com sucesso!");
        } catch(e) {
            console.error(e);
            alert("Erro ao ler o arquivo PDF. Tente outro arquivo.");
        }
    };
    reader.readAsArrayBuffer(file);
}

function processarPDF(text) {
    // 1. Extração de Cabeçalhos
    const patterns = {
        tipo: /Tipo:\s*(.*?)(?=\s*Colaborador)/i,
        colaborador: /Colaborador:\s*(.*?)(?=\s*Data Inicial)/i,
        empresa: /Empresa:\s*(.*?)(?=\s*Data final)/i,
        dtInicial: /Data Inicial:\s*(\d{2}\/\d{2}\/\d{4})/i,
        dtFinal: /Data final:\s*(\d{2}\/\d{2}\/\d{4})/i,
        aprov: /Responsável pelo reembolso:\s*(.*?)(?=\s*Data)/i,
        reembolsos: /Reembolsos realizados:\s*(.*?)(?=\s*Observação)/i
    };

    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };

    for (const [key, regex] of Object.entries(patterns)) {
        const match = text.match(regex);
        if (match && match[1]) {
            const val = match[1].trim();
            if(key === 'tipo') setVal('tipo', val);
            if(key === 'colaborador') setVal('colaborador', val);
            if(key === 'empresa') setVal('empresa', val);
            if(key === 'aprov') setVal('aprovador', val);
            if(key === 'reembolsos') setVal('reembolsos', val);
            
            if(key === 'dtInicial') {
                const p = val.split('/');
                if(p.length===3) setVal('data-inicial', `${p[2]}-${p[1]}-${p[0]}`);
            }
            if(key === 'dtFinal') {
                const p = val.split('/');
                if(p.length===3) setVal('data-final', `${p[2]}-${p[1]}-${p[0]}`);
            }
        }
    }

    // Sugere título se estiver vazio
    const tipoVal = document.getElementById('tipo').value;
    const tituloInput = document.getElementById('doc-title');
    if(tipoVal && tituloInput.value === "") {
        tituloInput.value = tipoVal; 
    }

    // 2. Extração de Itens da Tabela
    const regexLinha = /(\d{2}\/\d{2}\s+.*?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})/g;
    let match;
    
    // Limpa tabela atual para inserir dados do PDF
    document.getElementById('table-body').innerHTML = '';
    
    let encontrou = false;
    while ((match = regexLinha.exec(text)) !== null) {
        if(match[0].includes("Data") || match[0].length < 5) continue;
        const desc = match[1].trim();
        const val = parseFloat(match[2].replace('.', '').replace(',', '.'));
        
        let cat = 'Outros';
        const dLower = desc.toLowerCase();
        if (dLower.includes('uber') || dLower.includes('taxi') || dLower.includes('combustivel')) cat = 'Transporte';
        if (dLower.includes('almoco') || dLower.includes('refeicao') || dLower.includes('jantar')) cat = 'Alimentação';
        if (dLower.includes('hotel')) cat = 'Hospedagem';

        if(val > 0) {
            adicionarLinhaUI({desc: desc, cat: cat, qtd: 1, unit: val});
            encontrou = true;
        }
    }
    
    if(!encontrou) {
        // Se não achou nada, adiciona uma linha vazia de volta
        adicionarLinha();
        alert("Cabeçalho lido, mas nenhuma despesa identificada no padrão do PDF.");
    }
    
    autoSave();
}

// --- Backup & Utilities ---
function fazerBackup() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data || data === '[]') return alert("Nada para salvar.");
    
    const blob = new Blob([data], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_ecosynergy_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function restaurarBackup(input) {
    const file = input.files[0];
    if(!file) return;
    
    if(!confirm("Isso substituirá TODOS os relatórios atuais pelos do arquivo. Continuar?")) {
        input.value = ""; 
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if(!Array.isArray(json)) throw new Error("Formato inválido");
            saveDB(json);
            alert("Backup restaurado com sucesso!");
            location.reload();
        } catch(err) {
            alert("Arquivo inválido ou corrompido.");
        }
    };
    reader.readAsText(file);
}

function formatDate(iso) {
    if(!iso) return "";
    const p = iso.split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if(t) {
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }
}