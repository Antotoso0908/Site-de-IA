let supabase = null;
let currentNoteId = null;
let notes = [];

// Elementos DOM
const urlInput = document.getElementById('supabase-url');
const keyInput = document.getElementById('supabase-key');
const connectBtn = document.getElementById('connect-btn');
const notesList = document.getElementById('notes-list');
const noteTitleInput = document.getElementById('note-title');
const codeInput = document.getElementById('code-input');
const highlightCode = document.getElementById('highlight-code');
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-btn');
const saveStatus = document.getElementById('save-status');
const newNoteBtn = document.getElementById('new-note-btn');

// Carregar credenciais salvas no LocalStorage do navegador
window.addEventListener('DOMContentLoaded', () => {
    const savedUrl = localStorage.getItem('sb_url');
    const savedKey = localStorage.getItem('sb_key');
    if (savedUrl && savedKey) {
        urlInput.value = savedUrl;
        keyInput.value = savedKey;
        initSupabase(savedUrl, savedKey);
    }
});

connectBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    const key = keyInput.value.trim();
    if (url && key) {
        localStorage.setItem('sb_url', url);
        localStorage.setItem('sb_key', key);
        initSupabase(url, key);
    } else {
        alert('Insira a URL e a Key do Supabase.');
    }
});

function initSupabase(url, key) {
    try {
        supabase = window.supabase.createClient(url, key);
        fetchNotes();
    } catch (e) {
        alert('Erro ao conectar ao Supabase. Verifique as credenciais.');
    }
}

// Buscar notas do banco de dados
async function fetchNotes() {
    if (!supabase) return;
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar notas:', error);
        return;
    }

    notes = data;
    renderNotesList();

    if (notes.length > 0 && !currentNoteId) {
        selectNote(notes[0].id);
    }
}

function renderNotesList() {
    notesList.innerHTML = '';
    notes.forEach(note => {
        const li = document.createElement('li');
        li.textContent = note.title;
        if (note.id === currentNoteId) li.classList.add('active');
        li.addEventListener('click', () => selectNote(note.id));
        notesList.appendChild(li);
    });
}

function selectNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    currentNoteId = note.id;
    noteTitleInput.value = note.title;
    codeInput.value = note.content || '';
    updateEditorView();
    renderNotesList();
    saveStatus.textContent = 'Salvo';
}

// Validador e Identificador de Extensão
function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['html', 'htm'].includes(ext)) return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'js') return 'javascript';
    if (ext === 'txt') return 'text';
    return null; // Não suportado
}

// Atualizar visualização do editor com Prism.js
function updateEditorView() {
    const text = codeInput.value;
    const filename = noteTitleInput.value;
    const fileType = getFileType(filename);

    highlightCode.textContent = text;
    highlightCode.className = ''; // Limpa classes anteriores

    if (fileType && fileType !== 'text') {
        highlightCode.classList.add(`language-${fileType}`);
    } else {
        highlightCode.classList.add('language-none');
    }

    Prism.highlightElement(highlightCode);
}

// Sincronizar input com o bloco de destaque
codeInput.addEventListener('input', () => {
    updateEditorView();
    saveStatus.textContent = 'Não salvo...';
});

noteTitleInput.addEventListener('input', () => {
    updateEditorView();
    saveStatus.textContent = 'Não salvo...';
});

// Criar nova nota
newNoteBtn.addEventListener('click', async () => {
    if (!supabase) {
        alert('Conecte ao Supabase primeiro!');
        return;
    }

    const defaultTitle = 'novo_codigo.js';
    const { data, error } = await supabase
        .from('notes')
        .insert([{ title: defaultTitle, content: '// Escreva seu código aqui\n', file_type: 'javascript' }])
        .select();

    if (error) {
        alert('Erro ao criar arquivo: ' + error.message);
        return;
    }

    if (data && data.length > 0) {
        notes.unshift(data[0]);
        selectNote(data[0].id);
    }
});

// Salvar nota atual
saveBtn.addEventListener('click', async () => {
    if (!supabase || !currentNoteId) return;

    const title = noteTitleInput.value.trim();
    const fileType = getFileType(title);

    if (!fileType) {
        alert('Extensão não suportada! Utilize apenas: .txt, .html, .css ou .js');
        return;
    }

    saveStatus.textContent = 'Salvando...';

    const { error } = await supabase
        .from('notes')
        .update({
            title: title,
            content: codeInput.value,
            file_type: fileType,
            updated_at: new Date()
        })
        .eq('id', currentNoteId);

    if (error) {
        saveStatus.textContent = 'Erro ao salvar!';
        alert('Erro: ' + error.message);
    } else {
        saveStatus.textContent = 'Salvo com sucesso!';
        // Atualizar lista localmente
        const note = notes.find(n => n.id === currentNoteId);
        if (note) {
            note.title = title;
            note.content = codeInput.value;
        }
        renderNotesList();
    }
});

// Excluir nota
deleteBtn.addEventListener('click', async () => {
    if (!supabase || !currentNoteId) return;
    if (!confirm('Deseja realmente excluir este arquivo?')) return;

    const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', currentNoteId);

    if (error) {
        alert('Erro ao excluir: ' + error.message);
        return;
    }

    notes = notes.filter(n => n.id !== currentNoteId);
    currentNoteId = notes.length > 0 ? notes[0].id : null;
    
    if (currentNoteId) {
        selectNote(currentNoteId);
    } else {
        noteTitleInput.value = '';
        codeInput.value = '';
        highlightCode.textContent = '';
        notesList.innerHTML = '';
    }
    renderNotesList();
});
  
