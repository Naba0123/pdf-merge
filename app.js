document.getElementById('pdfInput').addEventListener('change', handleFileSelect);
document.getElementById('mergeButton').addEventListener('click', mergePdfs);

const pdfFiles = [];
const selectedPages = [];

async function handleFileSelect(event) {
    const files = event.target.files;
    const pdfList = document.getElementById('pdfList');
    pdfList.innerHTML = '';

    for (let i = 0; i < files.length; i++) {
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
                const pageButton = document.createElement('button');
                pageButton.className = 'button is-small';
                pageButton.textContent = `Page ${j + 1}`;
                pageButton.addEventListener('click', () => selectPage(file.name, j));
                fileContainer.appendChild(pageButton);
            }
        }
    }
}

function selectPage(fileName, pageIndex) {
    selectedPages.push({ fileName, pageIndex });
    updateSelectedPages();
}

function updateSelectedPages() {
    const selectedPagesList = document.getElementById('selectedPagesList');
    selectedPagesList.innerHTML = '';
    selectedPages.forEach((page, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${page.fileName} - Page ${page.pageIndex + 1}`;
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
