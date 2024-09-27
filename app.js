document.getElementById('pdfInput').addEventListener('change', handleFileSelect);
document.getElementById('mergeButton').addEventListener('click', mergePdfs);

const pdfFiles = [];
const imageFiles = [];
const selectedPages = [];

async function handleFileSelect(event) {
    const files = event.target.files;
    const pdfList = document.getElementById('pdfList');
    pdfList.innerHTML = '';

    // ファイル名順で並び替え
    const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];

        if (file.type === 'application/pdf') {
            // PDFの場合
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            pdfFiles.push({ file, pdf });

            const fileContainer = document.createElement('div');
            fileContainer.className = 'pdf-preview';
            fileContainer.innerHTML = `<strong>${file.name}</strong>`;
            pdfList.appendChild(fileContainer);

            for (let j = 0; j < pdf.numPages; j++) {
                const pageContainer = document.createElement('div');

                const canvas = document.createElement('canvas');
                canvas.className = 'thumbnail';
                const context = canvas.getContext('2d');
                const page = await pdf.getPage(j + 1);
                const viewport = page.getViewport({ scale: 1.0 });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                page.render({ canvasContext: context, viewport: viewport });

                canvas.setAttribute('data-filename', file.name);
                canvas.setAttribute('data-pageindex', j);

                // サムネイルクリック時の処理
                canvas.addEventListener('click', () => handleThumbnailClick(file.name, j, canvas, 'pdf'));

                pageContainer.appendChild(canvas);

                const pageNumber = document.createElement('span');
                pageNumber.textContent = `${file.name} (Page ${j + 1})`;
                pageContainer.appendChild(pageNumber);

                fileContainer.appendChild(pageContainer);
            }
        } else if (file.type.startsWith('image/')) {
            // 画像の場合
            const imageURL = URL.createObjectURL(file);
            const img = new Image();
            img.src = imageURL;
            img.className = 'thumbnail';

            img.onload = () => {
                const fileContainer = document.createElement('div');
                fileContainer.className = 'pdf-preview';
                fileContainer.innerHTML = `<strong>${file.name}</strong>`;
                pdfList.appendChild(fileContainer);

                img.setAttribute('data-filename', file.name);
                img.setAttribute('data-pageindex', 0);

                img.addEventListener('click', () => handleThumbnailClick(file.name, 0, img, 'image'));

                fileContainer.appendChild(img);
                imageFiles.push({ file, img });
            };
        }
    }
}

// サムネイルクリック時の処理
function handleThumbnailClick(fileName, pageIndex, element, type) {
    // すでに選択されているかチェック
    const isAlreadySelected = selectedPages.some(page => page.fileName === fileName && page.pageIndex === pageIndex && page.type === type);
    if (isAlreadySelected) {
        return;
    }

    // 選択済みにする
    selectPage(fileName, pageIndex, element.toDataURL ? element.toDataURL() : element.src, type);
    element.classList.add('grayed-out'); // グレーアウトする
    element.style.pointerEvents = 'none'; // クリックできないようにする
}

function selectPage(fileName, pageIndex, thumbnail, type) {
    selectedPages.push({ fileName, pageIndex, thumbnail, type });
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
        // 最後の要素はselected-thumbnail-lastを追加
        if (index === selectedPages.length - 1) {
            img.classList.add('selected-thumbnail-last');
        }
        listItem.appendChild(img);

        listItem.appendChild(document.createElement('br'));

        const text = document.createTextNode(` ${page.fileName} - ${page.type === 'pdf' ? 'Page ' + (page.pageIndex + 1) : 'Image'}`);
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
    const deletedPage = selectedPages.splice(index, 1)[0];

    // 左側リストで選択解除する要素を有効化し直す
    if (deletedPage.type === 'pdf') {
        const file = pdfFiles.find(f => f.file.name === deletedPage.fileName);
        const element = document.querySelector(`canvas[data-filename="${deletedPage.fileName}"][data-pageindex="${deletedPage.pageIndex}"]`);
        element.classList.remove('grayed-out');
        element.style.pointerEvents = 'auto';
    } else if (deletedPage.type === 'image') {
        const element = document.querySelector(`img[src="${deletedPage.thumbnail}"]`);
        element.classList.remove('grayed-out');
        element.style.pointerEvents = 'auto';
    }

    updateSelectedPages();
}

async function mergePdfs() {
    if (selectedPages.length === 0) {
        alert('Please select at least one page from a PDF file or image.');
        return;
    }

    const mergedPdf = await PDFLib.PDFDocument.create();

    for (const { fileName, pageIndex, type } of selectedPages) {
        if (type === 'pdf') {
            const file = pdfFiles.find(f => f.file.name === fileName).file;
            const arrayBuffer = await file.arrayBuffer();
            const pdfLibDoc = await PDFLib.PDFDocument.load(arrayBuffer);

            const [page] = await mergedPdf.copyPages(pdfLibDoc, [pageIndex]);
            mergedPdf.addPage(page);
        } else if (type === 'image') {
            const file = imageFiles.find(f => f.file.name === fileName).file;
            const imageBytes = await file.arrayBuffer();
            const image = await mergedPdf.embedJpg(imageBytes);
            const page = mergedPdf.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
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