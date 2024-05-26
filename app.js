document.getElementById('pdfInput').addEventListener('change', handleFileSelect);
document.getElementById('mergeButton').addEventListener('click', mergePdfs);

const pdfFiles = [];
const selectedPages = [];

async function handleFileSelect(event) {
    const files = event.target.files;
    const pdfList = document.getElementById('pdfList');
    pdfList.innerHTML = '';

    for (let i = 0; files.length; i++) {
        const file = files[i];
        if (file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            pdfFiles.push({ file, pdf });

            const fileContainer = document.createElement('div');
            fileContainer.className = 'pdf-preview';
            fileContainer.innerHTML = `<strong>${file.name}</strong>`;
            pdfList.appendChild(fileContainer);

            for (let j = 0; j < pdf.numPages; j++) {
                const canvas = document.createElement('canvas');
                canvas.className = 'thumbnail';
                const context = canvas.getContext('2d');
                const page = await pdf.getPage(j + 1);
                const viewport = page.getViewport({ scale: 1.0 });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                page.render({ canvasContext: context, viewport: viewport });

                canvas.addEventListener('click', () => {
                    canvas.classList.add('clicked');
                    setTimeout(() => {
                        canvas.classList.remove('clicked');
                    }, 200);
                    selectPage(file.name, j, canvas.toDataURL());
                });
                fileContainer.appendChild(canvas);
            }
        }
    }
}

function selectPage(fileName, pageIndex, thumbnail) {
    // すでに選択されているかチェック
    const isAlreadySelected = selectedPages.some(page => page.fileName === fileName && page.pageIndex === pageIndex);
    if (isAlreadySelected) {
        alert('This page is already selected.');
        return;
    }

    selectedPages.push({ fileName, pageIndex, thumbnail });
    updateSelectedPages();
}

function updateSelectedPages() {
    const selectedPagesList = document.getElementById('selectedPagesList');
    selectedPagesList.innerHTML = '';
    selectedPages.forEach((page, index) => {
        const listItem = document.createElement('li');
        const img = document.createElement('img');
        img.src = page.thumbnail;
        img.className = 'selected-thumbnail';
        listItem.appendChild(img);

        const text = document.createTextNode(` ${page.fileName} - Page ${page.pageIndex + 1}`);
        listItem.appendChild(text);
        listItem.setAttribute('data-index', index);

        const upButton = document.createElement('button');
        upButton.textContent = '↑';
        upButton.className = 'button is-small';
        upButton.addEventListener('click', () => movePageUp(index));
        listItem.appendChild(upButton);

        const downButton = document.createElement('button');
        downButton.textContent = '↓';
        downButton.className = 'button is-small';
        downButton.addEventListener('click', () => movePageDown(index));
        listItem.appendChild(downButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'button is-small';
        deleteButton.addEventListener('click', () => deletePage(index));
        listItem.appendChild(deleteButton);

        selectedPagesList.appendChild(listItem);
    });
    // 自動スクロールを追加
    const selectedPagesContainer = document.getElementById('selectedPagesContainer');
    selectedPagesContainer.scrollTop = selectedPagesContainer.scrollHeight;
}

function movePageUp(index) {
    if (index > 0) {
        const temp = selectedPages[index];
        selectedPages[index] = selectedPages[index - 1];
        selectedPages[index - 1] = temp;
        updateSelectedPages();
    }
}

function movePageDown(index) {
    if (index < selectedPages.length - 1) {
        const temp = selectedPages[index];
        selectedPages[index] = selectedPages[index + 1];
        selectedPages[index + 1] = temp;
        updateSelectedPages();
    }
}

function deletePage(index) {
    selectedPages.splice(index, 1);
    updateSelectedPages();
}

async function mergePdfs() {
    if (selectedPages.length === 0) {
        alert('Please select at least one page from a PDF file.');
        return;
    }

    const mergedPdf = await PDFLib.PDFDocument.create();

    for (const { fileName, pageIndex } of selectedPages) {
        const file = pdfFiles.find(f => f.file.name === fileName).file;
        const arrayBuffer = await file.arrayBuffer();
        const pdfLibDoc = await PDFLib.PDFDocument.load(arrayBuffer);

        const [page] = await mergedPdf.copyPages(pdfLibDoc, [pageIndex]);
        mergedPdf.addPage(page);
    }

    const mergedPdfBytes = await mergedPdf.save();
    download(mergedPdfBytes, 'merged.pdf', 'application/pdf');
}

function download(data, filename, type) {
    const blob = new Blob([data], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}
